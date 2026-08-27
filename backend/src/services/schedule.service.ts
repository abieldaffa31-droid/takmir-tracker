import { db } from "../db/index.js";
import { activities, activitySchedules } from "../db/schema/index.js";
import { activityRepo } from "../repositories/activity.repo.js";
import { memberRepo } from "../repositories/member.repo.js";
import { availabilityService } from "./availability.service.js";
import { auditService } from "./audit.service.js";
import { NotFoundError, ForbiddenError } from "../lib/errors.js";
import { serializeActivity } from "../lib/serialize.js";
import { isCoordinatorLike, type Actor } from "../lib/types.js";

type ScheduleInput = { weekday: number; startTime: string; endTime: string; recurrence: (typeof activitySchedules.$inferInsert)["recurrence"] };
type ActivityInput = {
  periodId: string;
  memberId?: string;
  category: (typeof activities.$inferInsert)["category"];
  title: string;
  location?: string;
  isOutsideArea?: boolean;
  note?: string;
  schedules: ScheduleInput[];
};

function assertCanEditSchedule(actor: Actor, ownerId: string) {
  if (actor.memberId === ownerId) return;
  if (isCoordinatorLike(actor.role)) return;
  throw new ForbiddenError("Hanya dapat mengubah jadwal sendiri");
}

function overlaps(a: ScheduleInput, b: { weekday: number; startTime: string; endTime: string }) {
  return a.weekday === b.weekday && a.startTime < b.endTime && b.startTime < a.endTime;
}

// Aktivitas lintas tengah malam (mis. shift 22:00-06:00) tidak disimpan sebagai
// satu baris — dipecah jadi hari-N 22:00-23:59 dan hari-N+1 00:00-06:00
// (Backend Plan §2.5), supaya constraint `time_order` di DB tetap tegak.
function expandOvernight(s: ScheduleInput): ScheduleInput[] {
  if (s.endTime > s.startTime) return [s];
  const nextWeekday = s.weekday === 7 ? 1 : s.weekday + 1;
  return [
    { ...s, endTime: "23:59" },
    { ...s, weekday: nextWeekday, startTime: "00:00" },
  ];
}

function expandSchedules(schedules: ScheduleInput[]): ScheduleInput[] {
  return schedules.flatMap(expandOvernight);
}

async function detectConflicts(
  actor: Actor,
  input: { periodId: string; memberId?: string; excludeActivityId?: string; schedules: ScheduleInput[] },
) {
  const ownerId = input.memberId ?? actor.memberId;
  assertCanEditSchedule(actor, ownerId);

  const candidates = expandSchedules(input.schedules);
  const existing = await activityRepo.list({ periodId: input.periodId, memberId: ownerId });
  const conflicts: { schedule: ScheduleInput; withActivity: { id: string; title: string; weekday: number; startTime: string; endTime: string } }[] = [];

  for (const activity of existing) {
    if (activity.id === input.excludeActivityId) continue;
    for (const existingSchedule of activity.schedules) {
      for (const candidate of candidates) {
        if (overlaps(candidate, existingSchedule)) {
          conflicts.push({
            schedule: candidate,
            withActivity: {
              id: activity.id,
              title: activity.title,
              weekday: existingSchedule.weekday,
              startTime: existingSchedule.startTime,
              endTime: existingSchedule.endTime,
            },
          });
        }
      }
    }
  }
  return conflicts;
}

export const scheduleService = {
  async list(actor: Actor, opts: { periodId: string; memberId?: string }) {
    const rows = await activityRepo.list(opts);
    return Promise.all(
      rows.map(async (a) => {
        const owner = await memberRepo.byId(a.memberId);
        return serializeActivity(actor, a, owner!);
      }),
    );
  },

  // Peraturan bentroknya sama persis dengan create — satu implementasi, dua endpoint,
  // sehingga peringatan pratinjau tidak akan pernah berbeda dari hasil simpan.
  detectConflicts,

  async create(actor: Actor, input: ActivityInput) {
    const ownerId = input.memberId ?? actor.memberId;
    assertCanEditSchedule(actor, ownerId);

    return db.transaction(async (tx) => {
      const activity = await activityRepo.create(
        {
          memberId: ownerId,
          periodId: input.periodId,
          category: input.category,
          title: input.title,
          location: input.location,
          isOutsideArea: input.isOutsideArea ?? false,
          note: input.note,
          source: "manual",
          schedules: expandSchedules(input.schedules),
        },
        tx,
      );
      await availabilityService.recomputeMember(ownerId, input.periodId, tx);
      if (actor.memberId !== ownerId) {
        await auditService.log(actor, "activities", activity.id, "create", undefined, tx);
      }
      const owner = await memberRepo.byId(ownerId, tx);
      return serializeActivity(actor, activity, owner!);
    });
  },

  // Melayani wizard onboarding: satu transaksi, satu kali materialisasi per anggota tersentuh.
  async createMany(actor: Actor, inputs: ActivityInput[]) {
    return db.transaction(async (tx) => {
      const touched = new Map<string, string>(); // memberId -> periodId
      const created = [];
      for (const input of inputs) {
        const ownerId = input.memberId ?? actor.memberId;
        assertCanEditSchedule(actor, ownerId);
        const activity = await activityRepo.create(
          {
            memberId: ownerId,
            periodId: input.periodId,
            category: input.category,
            title: input.title,
            location: input.location,
            isOutsideArea: input.isOutsideArea ?? false,
            note: input.note,
            source: "manual",
            schedules: expandSchedules(input.schedules),
          },
          tx,
        );
        created.push(activity);
        touched.set(ownerId, input.periodId);
      }
      for (const [memberId, periodId] of touched) {
        await availabilityService.recomputeMember(memberId, periodId, tx);
      }
      const owners = await Promise.all(created.map((a) => memberRepo.byId(a.memberId, tx)));
      return created.map((a, i) => serializeActivity(actor, a, owners[i]!));
    });
  },

  async update(actor: Actor, id: string, input: Partial<ActivityInput>) {
    const existing = await activityRepo.byId(id);
    if (!existing) throw new NotFoundError("Aktivitas");
    assertCanEditSchedule(actor, existing.memberId);

    return db.transaction(async (tx) => {
      const updated = await activityRepo.update(
        id,
        {
          category: input.category,
          title: input.title,
          location: input.location,
          isOutsideArea: input.isOutsideArea,
          note: input.note,
          schedules: input.schedules ? expandSchedules(input.schedules) : undefined,
        },
        tx,
      );
      await availabilityService.recomputeMember(existing.memberId, existing.periodId, tx);
      if (actor.memberId !== existing.memberId) {
        await auditService.log(actor, "activities", id, "update", undefined, tx);
      }
      const owner = await memberRepo.byId(existing.memberId, tx);
      return serializeActivity(actor, updated, owner!);
    });
  },

  async remove(actor: Actor, id: string) {
    const existing = await activityRepo.byId(id);
    if (!existing) throw new NotFoundError("Aktivitas");
    assertCanEditSchedule(actor, existing.memberId);

    return db.transaction(async (tx) => {
      await activityRepo.remove(id, tx);
      await availabilityService.recomputeMember(existing.memberId, existing.periodId, tx);
      if (actor.memberId !== existing.memberId) {
        await auditService.log(actor, "activities", id, "delete", undefined, tx);
      }
    });
  },
};

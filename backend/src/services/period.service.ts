import { db } from "../db/index.js";
import { periods, timeBands, activities, activitySchedules } from "../db/schema/index.js";
import { periodRepo } from "../repositories/period.repo.js";
import { memberRepo } from "../repositories/member.repo.js";
import { availabilityService } from "./availability.service.js";
import { auditService } from "./audit.service.js";
import { scheduleCompletionFor } from "./member.service.js";
import { NotFoundError, ConflictError, ForbiddenError } from "../lib/errors.js";
import { isCoordinatorLike, type Actor } from "../lib/types.js";
import { serializeBand, serializePeriod } from "../lib/serialize.js";
import { eq } from "drizzle-orm";

function assertCoordinator(actor: Actor) {
  if (!isCoordinatorLike(actor.role)) throw new ForbiddenError();
}

export const periodService = {
  async list() {
    return (await periodRepo.list()).map(serializePeriod);
  },
  async getActive() {
    const active = await periodRepo.getActive();
    return active ? serializePeriod(active) : null;
  },

  async create(actor: Actor, input: typeof periods.$inferInsert) {
    assertCoordinator(actor);
    const period = await periodRepo.create({ ...input, createdBy: actor.memberId });
    await auditService.log(actor, "periods", period.id, "create");
    return serializePeriod(period);
  },

  async update(actor: Actor, id: string, input: Partial<typeof periods.$inferInsert>) {
    assertCoordinator(actor);
    const period = await periodRepo.update(id, input);
    if (!period) throw new NotFoundError("Periode");
    await auditService.log(actor, "periods", id, "update");
    if (period.status === "active") {
      await db.transaction((tx) => availabilityService.recomputeAllForPeriod(id, tx));
    }
    return serializePeriod(period);
  },

  async activate(actor: Actor, id: string) {
    assertCoordinator(actor);
    const activated = await db.transaction(async (tx) => {
      const target = await periodRepo.byId(id, tx);
      if (!target) throw new NotFoundError("Periode");
      const currentActive = await periodRepo.getActive(tx);
      if (currentActive && currentActive.id !== id) {
        await periodRepo.update(currentActive.id, { status: "archived" }, tx);
        await auditService.log(actor, "periods", currentActive.id, "deactivate", undefined, tx);
      }
      const result = await periodRepo.update(id, { status: "active" }, tx);
      await auditService.log(actor, "periods", id, "activate", undefined, tx);
      return result;
    });
    return serializePeriod(activated!);
  },

  async archive(actor: Actor, id: string) {
    assertCoordinator(actor);
    const period = await periodRepo.update(id, { status: "archived" });
    if (!period) throw new NotFoundError("Periode");
    await auditService.log(actor, "periods", id, "deactivate");
    return serializePeriod(period);
  },

  // Menyalin seluruh activities + activitySchedules dari periode sumber ke
  // periode baru, mengosongkan lastReviewedAt seluruh anggota, lalu
  // memicu materialisasi menyeluruh — satu transaksi (Backend Plan §4.2/§6).
  async rollover(actor: Actor, sourcePeriodId: string, newPeriodInput: typeof periods.$inferInsert) {
    assertCoordinator(actor);
    return db.transaction(async (tx) => {
      const source = await periodRepo.byId(sourcePeriodId, tx);
      if (!source) throw new NotFoundError("Periode sumber");

      const newPeriod = await periodRepo.create({ ...newPeriodInput, createdBy: actor.memberId }, tx);

      const sourceBands = await periodRepo.listBands(sourcePeriodId, tx);
      if (sourceBands.length) {
        await tx.insert(timeBands).values(
          sourceBands.map((b) => ({
            periodId: newPeriod.id,
            key: b.key,
            label: b.label,
            startTime: b.startTime,
            endTime: b.endTime,
            sortOrder: b.sortOrder,
          })),
        );
      }

      const sourceActivities = await tx.query.activities.findMany({
        where: eq(activities.periodId, sourcePeriodId),
        with: { schedules: true },
      });
      let copiedActivities = 0;
      for (const a of sourceActivities) {
        const [copy] = await tx
          .insert(activities)
          .values({
            memberId: a.memberId,
            periodId: newPeriod.id,
            category: a.category,
            title: a.title,
            location: a.location,
            isOutsideArea: a.isOutsideArea,
            note: a.note,
            source: "rollover",
          })
          .returning();
        if (a.schedules.length) {
          await tx.insert(activitySchedules).values(
            a.schedules.map((s) => ({
              activityId: copy.id,
              weekday: s.weekday,
              startTime: s.startTime,
              endTime: s.endTime,
              recurrence: s.recurrence,
              recurrenceMeta: s.recurrenceMeta,
            })),
          );
        }
        copiedActivities += 1;
      }

      const allMembers = await memberRepo.list({}, tx);
      for (const m of allMembers) await memberRepo.update(m.id, { lastReviewedAt: null }, tx);

      await availabilityService.recomputeAllForPeriod(newPeriod.id, tx);
      await auditService.log(actor, "periods", newPeriod.id, "create", undefined, tx);

      return { period: serializePeriod(newPeriod), copiedActivities };
    });
  },

  async completionSummary(actor: Actor, periodId: string) {
    assertCoordinator(actor);
    const activeMembers = await memberRepo.list({ activeOnly: true });
    const rows = await Promise.all(
      activeMembers.map(async (m) => ({ memberId: m.id, ...(await scheduleCompletionFor(m.id, periodId)) })),
    );
    const complete = rows.filter((r) => r.activityCount > 0).length;
    return { total: rows.length, complete, incomplete: rows.length - complete, members: rows };
  },

  async listBands(periodId: string) {
    return (await periodRepo.listBands(periodId)).map(serializeBand);
  },

  async replaceBands(actor: Actor, periodId: string, bands: (typeof timeBands.$inferInsert)[]) {
    assertCoordinator(actor);
    const result = await periodRepo.replaceBands(periodId, bands);
    await auditService.log(actor, "time_bands", periodId, "update");
    return result.map(serializeBand);
  },
};

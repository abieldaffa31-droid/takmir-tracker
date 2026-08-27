import { and, eq, inArray } from "drizzle-orm";
import { db, type Tx } from "../db/index.js";
import { activities, activitySchedules } from "../db/schema/index.js";

export const activityRepo = {
  byId: (id: string, tx: Tx = db) =>
    tx.query.activities.findFirst({ where: eq(activities.id, id), with: { schedules: true } }),

  list: (opts: { periodId: string; memberId?: string }, tx: Tx = db) =>
    tx.query.activities.findMany({
      where: opts.memberId
        ? and(eq(activities.periodId, opts.periodId), eq(activities.memberId, opts.memberId))
        : eq(activities.periodId, opts.periodId),
      with: { schedules: true },
    }),

  schedulesFor: async (memberId: string, periodId: string, tx: Tx = db) => {
    const rows = await tx.query.activities.findMany({
      where: and(eq(activities.memberId, memberId), eq(activities.periodId, periodId)),
      with: { schedules: true },
    });
    return rows.flatMap((a) =>
      a.schedules.map((s) => ({
        activityId: a.id,
        category: a.category,
        isOutsideArea: a.isOutsideArea,
        weekday: s.weekday,
        startTime: s.startTime,
        endTime: s.endTime,
        recurrence: s.recurrence,
      })),
    );
  },

  create: async (
    input: typeof activities.$inferInsert & { schedules: Omit<typeof activitySchedules.$inferInsert, "activityId">[] },
    tx: Tx,
  ) => {
    const { schedules, ...activityInput } = input;
    const [activity] = await tx.insert(activities).values(activityInput).returning();
    const inserted = await tx
      .insert(activitySchedules)
      .values(schedules.map((s) => ({ ...s, activityId: activity.id })))
      .returning();
    return { ...activity, schedules: inserted };
  },

  update: async (
    id: string,
    input: Partial<typeof activities.$inferInsert> & { schedules?: Omit<typeof activitySchedules.$inferInsert, "activityId">[] },
    tx: Tx,
  ) => {
    const { schedules, ...activityInput } = input;
    const [activity] = await tx
      .update(activities)
      .set({ ...activityInput, updatedAt: new Date() })
      .where(eq(activities.id, id))
      .returning();
    let finalSchedules = await tx.query.activitySchedules.findMany({ where: eq(activitySchedules.activityId, id) });
    if (schedules) {
      await tx.delete(activitySchedules).where(eq(activitySchedules.activityId, id));
      finalSchedules = await tx
        .insert(activitySchedules)
        .values(schedules.map((s) => ({ ...s, activityId: id })))
        .returning();
    }
    return { ...activity, schedules: finalSchedules };
  },

  remove: (id: string, tx: Tx) => tx.delete(activities).where(eq(activities.id, id)),

  categoriesByIds: async (ids: string[], tx: Tx = db) => {
    if (ids.length === 0) return new Map<string, { category: string; title: string }>();
    const rows = await tx.query.activities.findMany({ where: inArray(activities.id, ids) });
    return new Map(rows.map((a) => [a.id, { category: a.category, title: a.title }]));
  },

  // Dipakai resolveForDate untuk memeriksa parity mingguan aktivitas bi-mingguan (Backend Plan §3.3).
  recurrenceForWeekday: async (memberIds: string[], periodId: string, weekday: number, tx: Tx = db) => {
    const rows = await tx.query.activities.findMany({
      where: and(inArray(activities.memberId, memberIds), eq(activities.periodId, periodId)),
      with: { schedules: { where: eq(activitySchedules.weekday, weekday) } },
    });
    const map = new Map<string, (typeof activitySchedules.$inferSelect)["recurrence"]>();
    for (const a of rows) for (const s of a.schedules) map.set(a.id, s.recurrence);
    return map;
  },
};

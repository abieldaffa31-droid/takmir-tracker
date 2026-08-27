import { asc, eq, sql } from "drizzle-orm";
import { db, type Tx } from "../db/index.js";
import { periods, timeBands } from "../db/schema/index.js";

export const periodRepo = {
  byId: (id: string, tx: Tx = db) => tx.query.periods.findFirst({ where: eq(periods.id, id) }),

  list: (tx: Tx = db) => tx.query.periods.findMany({ orderBy: asc(periods.startDate) }),

  getActive: (tx: Tx = db) => tx.query.periods.findFirst({ where: eq(periods.status, "active") }),

  create: (input: typeof periods.$inferInsert, tx: Tx = db) =>
    tx.insert(periods).values(input).returning().then((r) => r[0]),

  update: (id: string, input: Partial<typeof periods.$inferInsert>, tx: Tx = db) =>
    tx.update(periods).set(input).where(eq(periods.id, id)).returning().then((r) => r[0]),

  bumpVersion: (id: string, tx: Tx = db) =>
    tx
      .update(periods)
      .set({ availabilityVersion: sql`${periods.availabilityVersion} + 1` })
      .where(eq(periods.id, id))
      .returning()
      .then((r) => r[0]),

  listBands: (periodId: string, tx: Tx = db) =>
    tx.query.timeBands.findMany({ where: eq(timeBands.periodId, periodId), orderBy: asc(timeBands.sortOrder) }),

  replaceBands: async (periodId: string, bands: (typeof timeBands.$inferInsert)[], tx: Tx = db) => {
    await tx.delete(timeBands).where(eq(timeBands.periodId, periodId));
    if (bands.length === 0) return [];
    return tx.insert(timeBands).values(bands.map((b) => ({ ...b, periodId }))).returning();
  },
};

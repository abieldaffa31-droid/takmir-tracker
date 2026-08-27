import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db, type Tx } from "../db/index.js";
import { scheduleExceptions } from "../db/schema/index.js";

export const exceptionRepo = {
  byId: (id: string, tx: Tx = db) => tx.query.scheduleExceptions.findFirst({ where: eq(scheduleExceptions.id, id) }),

  list: (opts: { memberId?: string; from?: string; to?: string }, tx: Tx = db) => {
    const conditions = [];
    if (opts.memberId) conditions.push(eq(scheduleExceptions.memberId, opts.memberId));
    if (opts.from) conditions.push(gte(scheduleExceptions.endDate, opts.from));
    if (opts.to) conditions.push(lte(scheduleExceptions.startDate, opts.to));
    return tx.query.scheduleExceptions.findMany({ where: conditions.length ? and(...conditions) : undefined });
  },

  // Pengecualian aktif pada tanggal tertentu, untuk sekumpulan anggota.
  activeOn: (memberIds: string[], date: string, tx: Tx = db) =>
    tx.query.scheduleExceptions.findMany({
      where: and(
        inArray(scheduleExceptions.memberId, memberIds),
        lte(scheduleExceptions.startDate, date),
        gte(scheduleExceptions.endDate, date),
      ),
    }),

  create: (input: typeof scheduleExceptions.$inferInsert, tx: Tx = db) =>
    tx.insert(scheduleExceptions).values(input).returning().then((r) => r[0]),

  update: (id: string, input: Partial<typeof scheduleExceptions.$inferInsert>, tx: Tx = db) =>
    tx.update(scheduleExceptions).set(input).where(eq(scheduleExceptions.id, id)).returning().then((r) => r[0]),

  remove: (id: string, tx: Tx = db) => tx.delete(scheduleExceptions).where(eq(scheduleExceptions.id, id)),
};

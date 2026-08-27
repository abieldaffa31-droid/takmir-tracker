import { and, asc, eq, ilike, inArray, or } from "drizzle-orm";
import { db, type Tx } from "../db/index.js";
import { members, memberCompetencies } from "../db/schema/index.js";
import type { Competency, DomicileZone } from "../db/schema/enums.js";

export const memberRepo = {
  byId: (id: string, tx: Tx = db) => tx.query.members.findFirst({ where: eq(members.id, id) }),

  byUserId: (userId: string, tx: Tx = db) =>
    tx.query.members.findFirst({ where: eq(members.userId, userId) }),

  byEmail: (email: string, tx: Tx = db) =>
    tx.query.members.findFirst({ where: eq(members.email, email) }),

  list: (opts: { search?: string; activeOnly?: boolean } = {}, tx: Tx = db) => {
    const conditions = [];
    if (opts.activeOnly) conditions.push(eq(members.isActive, true));
    if (opts.search) {
      conditions.push(
        or(ilike(members.fullName, `%${opts.search}%`), ilike(members.nickname, `%${opts.search}%`)),
      );
    }
    return tx.query.members.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: asc(members.fullName),
    });
  },

  activeMatching: async (
    filters: { division?: string; competencies?: Competency[]; domicileZone?: DomicileZone[] } = {},
    tx: Tx = db,
  ) => {
    const conditions = [eq(members.isActive, true)];
    if (filters.division) conditions.push(eq(members.division, filters.division));
    if (filters.domicileZone?.length) conditions.push(inArray(members.domicileZone, filters.domicileZone));

    let pool = await tx.query.members.findMany({ where: and(...conditions) });

    if (filters.competencies?.length) {
      const withCompetency = await tx
        .select({ memberId: memberCompetencies.memberId })
        .from(memberCompetencies)
        .where(inArray(memberCompetencies.competency, filters.competencies));
      const allowed = new Set(withCompetency.map((r) => r.memberId));
      pool = pool.filter((m) => allowed.has(m.id));
    }
    return pool;
  },

  create: (input: typeof members.$inferInsert, tx: Tx = db) =>
    tx.insert(members).values(input).returning().then((r) => r[0]),

  update: (id: string, input: Partial<typeof members.$inferInsert>, tx: Tx = db) =>
    tx
      .update(members)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(members.id, id))
      .returning()
      .then((r) => r[0]),

  setActive: (id: string, isActive: boolean, tx: Tx = db) =>
    memberRepo.update(id, { isActive }, tx),

  linkUser: (id: string, userId: string, tx: Tx = db) => memberRepo.update(id, { userId }, tx),

  setCompetencies: async (memberId: string, competencies: { competency: Competency; level?: string }[], tx: Tx = db) => {
    await tx.delete(memberCompetencies).where(eq(memberCompetencies.memberId, memberId));
    if (competencies.length === 0) return [];
    return tx
      .insert(memberCompetencies)
      .values(competencies.map((c) => ({ memberId, competency: c.competency, level: c.level })))
      .returning();
  },

  markReviewed: (id: string, tx: Tx = db) => memberRepo.update(id, { lastReviewedAt: new Date() }, tx),
};

import { and, desc, eq, isNull } from "drizzle-orm";
import { db, type Tx } from "../db/index.js";
import { memberInvitations } from "../db/schema/index.js";

export const invitationRepo = {
  create: (input: typeof memberInvitations.$inferInsert, tx: Tx = db) =>
    tx.insert(memberInvitations).values(input).returning().then((r) => r[0]),

  latestPendingForEmail: (email: string, tx: Tx = db) =>
    tx.query.memberInvitations.findFirst({
      where: and(eq(memberInvitations.email, email), isNull(memberInvitations.acceptedAt)),
      orderBy: desc(memberInvitations.createdAt),
    }),

  markAccepted: (id: string, tx: Tx = db) =>
    tx.update(memberInvitations).set({ acceptedAt: new Date() }).where(eq(memberInvitations.id, id)),

  byToken: (token: string, tx: Tx = db) =>
    tx.query.memberInvitations.findFirst({ where: eq(memberInvitations.token, token) }),
};

import { db, type Tx } from "../db/index.js";
import { auditLogs } from "../db/schema/index.js";
import type { AuditAction } from "../db/schema/enums.js";
import type { Actor } from "../lib/types.js";

export const auditService = {
  log: (
    actor: Actor | undefined,
    entityType: string,
    entityId: string | undefined,
    action: AuditAction,
    diff?: Record<string, { from: unknown; to: unknown }>,
    tx: Tx = db,
  ) =>
    tx.insert(auditLogs).values({
      actorId: actor?.memberId,
      entityType,
      entityId,
      action,
      diff,
    }),

  list: (tx: Tx = db) => tx.query.auditLogs.findMany({ orderBy: (t, { desc }) => desc(t.createdAt), limit: 200 }),
};

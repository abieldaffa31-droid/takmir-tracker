import { exceptionRepo } from "../repositories/exception.repo.js";
import { NotFoundError, ForbiddenError } from "../lib/errors.js";
import { auditService } from "./audit.service.js";
import { isCoordinatorLike, type Actor } from "../lib/types.js";
import { toHHmm } from "../lib/time.js";
import type { scheduleExceptions } from "../db/schema/index.js";

function serializeException(row: typeof scheduleExceptions.$inferSelect) {
  return {
    ...row,
    startTime: row.startTime ? toHHmm(row.startTime) : null,
    endTime: row.endTime ? toHHmm(row.endTime) : null,
  };
}

function assertCanEdit(actor: Actor, ownerId: string) {
  if (actor.memberId === ownerId) return;
  if (isCoordinatorLike(actor.role)) return;
  throw new ForbiddenError("Hanya dapat mengubah pengecualian sendiri");
}

type ExceptionInput = Omit<typeof scheduleExceptions.$inferInsert, "memberId" | "id" | "createdAt"> & {
  memberId?: string;
};

export const exceptionService = {
  async list(opts: { memberId?: string; from?: string; to?: string }) {
    return (await exceptionRepo.list(opts)).map(serializeException);
  },

  async create(actor: Actor, input: ExceptionInput) {
    const ownerId = input.memberId ?? actor.memberId;
    assertCanEdit(actor, ownerId);
    const created = await exceptionRepo.create({ ...input, memberId: ownerId });
    if (actor.memberId !== ownerId) await auditService.log(actor, "schedule_exceptions", created.id, "create");
    return serializeException(created);
  },

  async update(actor: Actor, id: string, input: Partial<ExceptionInput>) {
    const existing = await exceptionRepo.byId(id);
    if (!existing) throw new NotFoundError("Pengecualian");
    assertCanEdit(actor, existing.memberId);
    const updated = await exceptionRepo.update(id, input);
    if (actor.memberId !== existing.memberId) await auditService.log(actor, "schedule_exceptions", id, "update");
    return serializeException(updated);
  },

  async remove(actor: Actor, id: string) {
    const existing = await exceptionRepo.byId(id);
    if (!existing) throw new NotFoundError("Pengecualian");
    assertCanEdit(actor, existing.memberId);
    await exceptionRepo.remove(id);
    if (actor.memberId !== existing.memberId) await auditService.log(actor, "schedule_exceptions", id, "delete");
  },
};

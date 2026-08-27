import { memberRepo } from "../repositories/member.repo.js";
import { periodRepo } from "../repositories/period.repo.js";
import { activityRepo } from "../repositories/activity.repo.js";
import { availabilityService } from "./availability.service.js";
import { invitationService } from "./invitation.service.js";
import { auditService } from "./audit.service.js";
import { members } from "../db/schema/index.js";
import { NotFoundError, ForbiddenError } from "../lib/errors.js";
import { isCoordinatorLike, type Actor } from "../lib/types.js";
import { serializeMember } from "../lib/serialize.js";
import type { Competency } from "../db/schema/enums.js";

function assertCoordinator(actor: Actor) {
  if (!isCoordinatorLike(actor.role)) throw new ForbiddenError();
}

async function scheduleCompletionFor(memberId: string, periodId: string) {
  const period = await periodRepo.byId(periodId);
  const activities = await activityRepo.list({ periodId, memberId });
  const member = await memberRepo.byId(memberId);
  const isStale =
    !member?.lastReviewedAt ||
    (period ? Date.now() - member.lastReviewedAt.getTime() > period.staleAfterDays * 24 * 60 * 60 * 1000 : false);
  return { activityCount: activities.length, lastReviewedAt: member?.lastReviewedAt ?? null, isStale };
}

export const memberService = {
  async getSelf(actor: Actor) {
    const member = await memberRepo.byId(actor.memberId);
    if (!member) throw new NotFoundError("Anggota");
    return serializeMember(actor, member);
  },

  async updateSelf(actor: Actor, input: Partial<typeof members.$inferInsert>) {
    const updated = await memberRepo.update(actor.memberId, input);
    return serializeMember(actor, updated);
  },

  async list(actor: Actor, opts: { search?: string; periodId?: string; activeOnly?: boolean }) {
    assertCoordinator(actor);
    const list = await memberRepo.list(opts);
    if (!opts.periodId) return list.map((m) => serializeMember(actor, m));
    return Promise.all(
      list.map(async (m) => ({
        ...serializeMember(actor, m),
        scheduleCompletion: await scheduleCompletionFor(m.id, opts.periodId!),
      })),
    );
  },

  async byId(actor: Actor, id: string) {
    assertCoordinator(actor);
    const member = await memberRepo.byId(id);
    if (!member) throw new NotFoundError("Anggota");
    return serializeMember(actor, member);
  },

  async create(actor: Actor, input: typeof members.$inferInsert) {
    assertCoordinator(actor);
    const member = await memberRepo.create({ ...input, joinedAt: new Date().toISOString().slice(0, 10) });
    await auditService.log(actor, "members", member.id, "create");
    await invitationService.send(member.id, actor);
    return serializeMember(actor, member);
  },

  async update(actor: Actor, id: string, input: Partial<typeof members.$inferInsert>) {
    assertCoordinator(actor);
    const before = await memberRepo.byId(id);
    if (!before) throw new NotFoundError("Anggota");
    const updated = await memberRepo.update(id, input);
    await auditService.log(actor, "members", id, "update", { fields: { from: before, to: updated } });
    return serializeMember(actor, updated);
  },

  async deactivate(actor: Actor, id: string) {
    assertCoordinator(actor);
    const updated = await memberRepo.setActive(id, false);
    await auditService.log(actor, "members", id, "deactivate");
    const active = await periodRepo.getActive();
    if (active) await availabilityService.recomputeAggregatesOnly(active.id);
    return serializeMember(actor, updated);
  },

  async reactivate(actor: Actor, id: string) {
    assertCoordinator(actor);
    const updated = await memberRepo.setActive(id, true);
    await auditService.log(actor, "members", id, "activate");
    const active = await periodRepo.getActive();
    if (active) await availabilityService.recomputeAggregatesOnly(active.id);
    return serializeMember(actor, updated);
  },

  async setCompetencies(actor: Actor, id: string, competencies: { competency: Competency; level?: string }[]) {
    assertCoordinator(actor);
    return memberRepo.setCompetencies(id, competencies);
  },

  async markReviewed(actor: Actor) {
    const updated = await memberRepo.markReviewed(actor.memberId);
    return serializeMember(actor, updated);
  },
};

export { scheduleCompletionFor };

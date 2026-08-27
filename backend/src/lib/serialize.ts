import type { activities, members, periods, timeBands } from "../db/schema/index.js";
import { isCoordinatorLike, type Actor } from "./types.js";
import { toHHmm } from "./time.js";

type Activity = typeof activities.$inferSelect & { schedules?: { weekday: number; startTime: string; endTime: string }[] };
type Member = typeof members.$inferSelect;

// PRD §3.9: detail aktivitas orang lain dibatasi. Penegakan wajib di server —
// tidak ada endpoint yang boleh mengembalikan baris `activities` mentah.
export function serializeActivity(actor: Actor, activity: Activity, owner: Member) {
  const base = {
    id: activity.id,
    memberId: activity.memberId,
    category: activity.category,
    isOutsideArea: activity.isOutsideArea,
    source: activity.source,
    schedules: (activity.schedules ?? []).map((s) => ({ ...s, startTime: toHHmm(s.startTime), endTime: toHHmm(s.endTime) })),
  };

  const canSeeDetail =
    actor.memberId === owner.id || isCoordinatorLike(actor.role) || owner.detailVisibility === "public";

  return canSeeDetail
    ? { ...base, title: activity.title, location: activity.location, note: activity.note }
    : { ...base, title: null, location: null, note: null };
}

export function serializePeriod(period: typeof periods.$inferSelect) {
  return { ...period, operationalStart: toHHmm(period.operationalStart), operationalEnd: toHHmm(period.operationalEnd) };
}

export function serializeBand(band: typeof timeBands.$inferSelect) {
  return { ...band, startTime: toHHmm(band.startTime), endTime: toHHmm(band.endTime) };
}

export function serializeMember(actor: Actor, member: Member) {
  const isSelfOrCoordinator = actor.memberId === member.id || isCoordinatorLike(actor.role);
  return {
    id: member.id,
    fullName: member.fullName,
    nickname: member.nickname,
    photoUrl: member.photoUrl,
    memberStatus: member.memberStatus,
    division: member.division,
    isActive: member.isActive,
    lastReviewedAt: member.lastReviewedAt,
    email: isSelfOrCoordinator ? member.email : null,
    phone: isSelfOrCoordinator ? member.phone : null,
    domicileZone: isSelfOrCoordinator ? member.domicileZone : null,
  };
}

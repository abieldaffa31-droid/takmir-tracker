import { memberRepo } from "../repositories/member.repo.js";
import { activityRepo } from "../repositories/activity.repo.js";
import { availabilityService, isBlocked, isFree, isNegotiable, type ResolvedSlot } from "./availability.service.js";
import { periodRepo } from "../repositories/period.repo.js";
import { slotRange } from "../lib/time.js";
import { NotFoundError } from "../lib/errors.js";
import { isCoordinatorLike, type Actor } from "../lib/types.js";
import type { Competency, DomicileZone } from "../db/schema/enums.js";

const DOMICILE_SCORE: Record<DomicileZone, number> = { dalam_kompleks: 30, dekat: 15, jauh: 0 };

type MemberRow = NonNullable<Awaited<ReturnType<typeof memberRepo.byId>>>;

function reviewedRecencyScore(lastReviewedAt: Date | null): number {
  if (!lastReviewedAt) return 0;
  const days = (Date.now() - lastReviewedAt.getTime()) / (24 * 60 * 60 * 1000);
  return Math.max(0, 20 - days / 7); // makin baru ditinjau, makin tinggi; meluruh ~3 poin/pekan
}

async function reasonFor(cells: ResolvedSlot[], categoryMap: Map<string, { category: string; title: string }>) {
  const blocking = cells.find((c) => isBlocked(c) || isNegotiable(c));
  if (!blocking) return null;
  if (blocking.status === "exception_blocked") return "izin/pengecualian";
  if (blocking.status === "buffer") return "jeda dari aktivitas di luar area";
  const info = blocking.sourceActivityId ? categoryMap.get(blocking.sourceActivityId) : undefined;
  return info?.category ?? blocking.status;
}

async function classify(
  actor: Actor,
  pool: MemberRow[],
  grid: Map<string, ResolvedSlot[]>,
  from: number,
  to: number,
) {
  const allSourceIds = new Set<string>();
  for (const cells of grid.values()) {
    for (const c of cells.slice(from, to)) if (c.sourceActivityId) allSourceIds.add(c.sourceActivityId);
  }
  const categoryMap = await activityRepo.categoriesByIds([...allSourceIds]);

  const full: { member: MemberRow; allPreferred: boolean }[] = [];
  const partial: { member: MemberRow; reason: string | null }[] = [];
  const unavailable: { member: MemberRow; reason: string | null }[] = [];

  for (const m of pool) {
    const cells = (grid.get(m.id) ?? []).slice(from, to);
    if (cells.length === 0) continue;
    if (cells.every(isFree)) {
      full.push({ member: m, allPreferred: cells.every((c) => c.status === "preferred_free") });
    } else if (!cells.some(isBlocked)) {
      partial.push({ member: m, reason: await reasonFor(cells, categoryMap) });
    } else {
      const canSeeDetail = isCoordinatorLike(actor.role) || m.detailVisibility !== "coordinator_only";
      unavailable.push({ member: m, reason: canSeeDetail ? await reasonFor(cells, categoryMap) : null });
    }
  }
  return { full, partial, unavailable };
}

type SearchInput = {
  periodId: string;
  date: string;
  startTime: string;
  endTime: string;
  needed: number;
  filters?: {
    division?: string;
    competencies?: Competency[];
    domicileZone?: DomicileZone[];
    applyBuffer?: boolean;
  };
};

function summarize(m: MemberRow) {
  return { id: m.id, fullName: m.fullName, nickname: m.nickname, initials: initialsOf(m.fullName) };
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export const matrixService = {
  // Dipakai L05 (sheet detail slot): daftar bisa / perlu konfirmasi / tidak bisa, tanpa skor/needed.
  async slotDetail(actor: Actor, opts: { periodId: string; date: string; startTime: string; endTime: string }) {
    const period = await periodRepo.byId(opts.periodId);
    if (!period) throw new NotFoundError("Periode");
    const pool = await memberRepo.list({ activeOnly: true });
    const grid = await availabilityService.resolveForDate(pool.map((m) => m.id), opts.periodId, opts.date);
    if (!grid) return { full: [], partial: [], unavailable: [], outOfRange: true };
    const { from, to } = slotRange(opts.startTime, opts.endTime, period);
    const { full, partial, unavailable } = await classify(actor, pool, grid, from, to);

    return {
      outOfRange: false,
      ready: full
        .sort((a, b) => Number(b.allPreferred) - Number(a.allPreferred))
        .map((r) => ({ ...summarize(r.member), tag: r.allPreferred ? "preferred" : "luang" })),
      maybe: partial.map((r) => ({ ...summarize(r.member), tag: r.reason ?? "perlu dikonfirmasi" })),
      unavailable: unavailable.map((r) => ({ ...summarize(r.member), tag: r.reason })),
    };
  },

  // POST /availability/search — Availability Matrix (Backend Plan §3.4).
  async search(actor: Actor, input: SearchInput) {
    const period = await periodRepo.byId(input.periodId);
    if (!period) throw new NotFoundError("Periode");

    const pool = await memberRepo.activeMatching(input.filters ?? {});
    const grid = await availabilityService.resolveForDate(pool.map((m) => m.id), input.periodId, input.date);
    if (!grid) return { full: [], partial: [], unavailable: [], meta: { needed: input.needed, fullCount: 0, evaluated: 0 } };

    const { from, to } = slotRange(input.startTime, input.endTime, period);
    const { full, partial, unavailable } = await classify(actor, pool, grid, from, to);

    // Skor (Backend Plan §3.4), dari yang paling menentukan:
    // 1) seluruh slot preferred_free, 2) beban amanah pekan berjalan (Phase 2 — belum ada
    // data assignments, jadi komponen ini netral untuk semua orang saat ini),
    // 3) domisili lebih dekat, 4) jadwal ditinjau lebih baru.
    const scored = full
      .map((r) => ({
        member: summarize(r.member),
        score:
          (r.allPreferred ? 1000 : 0) +
          DOMICILE_SCORE[r.member.domicileZone] +
          reviewedRecencyScore(r.member.lastReviewedAt),
        reasons: [r.allPreferred ? "preferred_free" : "luang"],
      }))
      .sort((a, b) => b.score - a.score);

    return {
      full: scored,
      partial: partial.map((r) => ({ member: summarize(r.member), conflictReason: r.reason })),
      unavailable: unavailable.map((r) => ({ member: summarize(r.member), reason: r.reason })),
      meta: { needed: input.needed, fullCount: scored.length, evaluated: pool.length },
    };
  },
};

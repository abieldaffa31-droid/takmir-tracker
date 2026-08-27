import { sql } from "drizzle-orm";
import { db, type Tx } from "../db/index.js";
import { availabilityStatus, type ActivityCategory, type AvailabilityStatus } from "../db/schema/enums.js";
import { periodRepo } from "../repositories/period.repo.js";
import { activityRepo } from "../repositories/activity.repo.js";
import { exceptionRepo } from "../repositories/exception.repo.js";
import { memberRepo } from "../repositories/member.repo.js";
import { availabilityRepo, type SlotCell } from "../repositories/availability.repo.js";
import { isoWeekday, slotRange, slotsPerDay, weekParity } from "../lib/time.js";
import { NotFoundError } from "../lib/errors.js";

type PeriodRow = NonNullable<Awaited<ReturnType<typeof periodRepo.byId>>>;

// Prioritas dari yang terkuat (index 0) ke terlemah, persis urutan enum (BR-2).
const PRIORITY_ORDER = availabilityStatus.enumValues;
function statusStrength(status: AvailabilityStatus): number {
  return PRIORITY_ORDER.indexOf(status); // makin kecil, makin kuat
}

// Pemetaan kategori aktivitas -> status ketersediaan dasarnya.
const CATEGORY_STATUS: Record<ActivityCategory, AvailabilityStatus> = {
  kuliah: "hard_blocked",
  kerja: "hard_blocked",
  amanah_masjid: "hard_blocked",
  organisasi: "soft_blocked",
  pribadi: "soft_blocked",
  luang_preferred: "preferred_free",
};

function statusFor(category: ActivityCategory): AvailabilityStatus {
  return CATEGORY_STATUS[category];
}

function emptyGrid(totalSlots: number): SlotCell[][] {
  return Array.from({ length: 7 }, () =>
    Array.from({ length: totalSlots }, () => ({ status: "implicit_free" as AvailabilityStatus, sourceActivityId: null })),
  );
}

function applyBuffer(
  row: SlotCell[],
  from: number,
  to: number,
  pad: number,
  sourceActivityId: string,
  totalSlots: number,
) {
  const start = Math.max(0, from - pad);
  const end = Math.min(totalSlots, to + pad);
  const isOverwritable = (cell: SlotCell) => cell.status === "implicit_free" || cell.status === "preferred_free";
  for (let i = start; i < from; i++) if (isOverwritable(row[i])) row[i] = { status: "buffer", sourceActivityId };
  for (let i = to; i < end; i++) if (isOverwritable(row[i])) row[i] = { status: "buffer", sourceActivityId };
}

async function computeGridForMember(memberId: string, period: PeriodRow, tx: Tx): Promise<SlotCell[][]> {
  const schedules = await activityRepo.schedulesFor(memberId, period.id, tx);
  const totalSlots = slotsPerDay(period);
  const grid = emptyGrid(totalSlots);

  // Terapkan menaik dari yang paling lemah ke paling kuat, supaya yang kuat menimpa.
  const ordered = [...schedules].sort(
    (a, b) => statusStrength(statusFor(b.category)) - statusStrength(statusFor(a.category)),
  );

  for (const s of ordered) {
    const { from, to } = slotRange(s.startTime, s.endTime, period);
    const clampedFrom = Math.max(0, from);
    const clampedTo = Math.min(totalSlots, to);
    const status = statusFor(s.category);
    const row = grid[s.weekday - 1];
    for (let i = clampedFrom; i < clampedTo; i++) row[i] = { status, sourceActivityId: s.activityId };

    if (s.isOutsideArea) {
      const pad = Math.ceil(period.bufferMinutes / period.slotMinutes);
      applyBuffer(row, clampedFrom, clampedTo, pad, s.activityId, totalSlots);
    }
  }

  return grid;
}

async function recomputeMember(memberId: string, periodId: string, tx: Tx) {
  // Kunci per anggota+periode, dilepas otomatis saat transaksi selesai.
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${memberId + periodId}, 0))`);

  const period = await periodRepo.byId(periodId, tx);
  if (!period) throw new NotFoundError("Periode");

  const grid = await computeGridForMember(memberId, period, tx);
  await availabilityRepo.replaceForMember(memberId, periodId, grid, tx);
  await availabilityRepo.refreshAggregates(periodId, tx);
  await periodRepo.bumpVersion(periodId, tx);
}

// Dipakai saat konfigurasi periode berubah atau rollover — seluruh anggota aktif.
async function recomputeAllForPeriod(periodId: string, tx: Tx) {
  const period = await periodRepo.byId(periodId, tx);
  if (!period) throw new NotFoundError("Periode");
  const activeMembers = await memberRepo.list({ activeOnly: true }, tx);

  for (const m of activeMembers) {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${m.id + periodId}, 0))`);
    const grid = await computeGridForMember(m.id, period, tx);
    await availabilityRepo.replaceForMember(m.id, periodId, grid, tx);
  }
  await availabilityRepo.refreshAggregates(periodId, tx);
  await periodRepo.bumpVersion(periodId, tx);
}

// Dipakai saat anggota dinonaktifkan/diaktifkan — hanya agregat yang perlu berubah.
async function recomputeAggregatesOnly(periodId: string, tx: Tx = db) {
  await availabilityRepo.refreshAggregates(periodId, tx);
  await periodRepo.bumpVersion(periodId, tx);
}

export type ResolvedSlot = SlotCell;

// BR-6: tanggal di luar rentang periode -> null ("tanpa data"), bukan array kosong ("bebas").
async function resolveForDate(
  memberIds: string[],
  periodId: string,
  date: string,
  tx: Tx = db,
): Promise<Map<string, ResolvedSlot[]> | null> {
  const period = await periodRepo.byId(periodId, tx);
  if (!period) throw new NotFoundError("Periode");
  if (date < period.startDate || date > period.endDate) return null;

  const weekday = isoWeekday(date);
  const totalSlots = slotsPerDay(period);
  const parity = weekParity(date, period.startDate);

  const grid = new Map<string, ResolvedSlot[]>();
  for (const id of memberIds) {
    grid.set(
      id,
      Array.from({ length: totalSlots }, () => ({ status: "implicit_free" as AvailabilityStatus, sourceActivityId: null })),
    );
  }

  const baseRows = await availabilityRepo.slotsForMembers(memberIds, periodId, weekday, tx);
  for (const row of baseRows) {
    const arr = grid.get(row.memberId);
    if (arr) arr[row.slotIndex] = { status: row.status, sourceActivityId: row.sourceActivityId };
  }

  // Aktivitas bi-mingguan hanya berlaku pada pekan yang sesuai paritasnya (tes wajib #7).
  const recurrenceMap = await activityRepo.recurrenceForWeekday(memberIds, periodId, weekday, tx);
  for (const [, arr] of grid) {
    for (const cell of arr) {
      if (!cell.sourceActivityId) continue;
      const recurrence = recurrenceMap.get(cell.sourceActivityId);
      if (!recurrence || recurrence === "weekly" || recurrence === "custom") continue;
      const requiredParity = recurrence === "biweekly_odd" ? "odd" : "even";
      if (parity !== requiredParity) {
        cell.status = "implicit_free";
        cell.sourceActivityId = null;
      }
    }
  }

  const exceptions = await exceptionRepo.activeOn(memberIds, date, tx);
  for (const ex of exceptions) {
    const arr = grid.get(ex.memberId);
    if (!arr) continue;
    const range = ex.isAllDay
      ? { from: 0, to: totalSlots }
      : slotRange(ex.startTime!, ex.endTime!, period);
    const from = Math.max(0, range.from);
    const to = Math.min(totalSlots, range.to);
    for (let i = from; i < to; i++) arr[i] = { status: "exception_blocked", sourceActivityId: null };
  }

  return grid;
}

export const isFree = (cell: ResolvedSlot) => cell.status === "implicit_free" || cell.status === "preferred_free";
export const isNegotiable = (cell: ResolvedSlot) => cell.status === "soft_blocked" || cell.status === "buffer";
export const isBlocked = (cell: ResolvedSlot) => cell.status === "hard_blocked" || cell.status === "exception_blocked";

export const availabilityService = {
  recomputeMember,
  recomputeAllForPeriod,
  recomputeAggregatesOnly,
  resolveForDate,
  computeGridForMember,
  statusFor,
  statusStrength,
};

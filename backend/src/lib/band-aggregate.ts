import { slotRange, type PeriodTimeConfig } from "./time.js";

export type Band = { key: string; label: string; startTime: string; endTime: string; sortOrder: number };
export type SlotCount = { free: number; soft: number; total: number };

// Agregasi band = titik tersempit (minimum) di antara slot-slot penyusunnya —
// koordinator perlu tahu titik paling rawan dalam band, bukan rata-ratanya.
function reduceRange(counts: (SlotCount | undefined)[]): SlotCount {
  const present = counts.filter((c): c is SlotCount => !!c);
  if (present.length === 0) return { free: 0, soft: 0, total: 0 };
  return {
    free: Math.min(...present.map((c) => c.free)),
    soft: Math.min(...present.map((c) => c.soft)),
    total: present[0].total,
  };
}

export function bandFromSlots(period: PeriodTimeConfig, band: Band, slotCounts: (SlotCount | undefined)[]) {
  const { from, to } = slotRange(band.startTime, band.endTime, period);
  const clampedFrom = Math.max(0, from);
  const clampedTo = Math.min(slotCounts.length, to);
  const range = slotCounts.slice(clampedFrom, clampedTo);
  return reduceRange(range);
}

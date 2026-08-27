import { and, eq, inArray, sql } from "drizzle-orm";
import { db, type Tx } from "../db/index.js";
import { availabilityAggregates, availabilitySlots } from "../db/schema/index.js";
import type { AvailabilityStatus } from "../db/schema/enums.js";

export type SlotCell = { status: AvailabilityStatus; sourceActivityId: string | null };

export const availabilityRepo = {
  replaceForMember: async (memberId: string, periodId: string, grid: SlotCell[][], tx: Tx) => {
    await tx
      .delete(availabilitySlots)
      .where(and(eq(availabilitySlots.memberId, memberId), eq(availabilitySlots.periodId, periodId)));

    const rows: (typeof availabilitySlots.$inferInsert)[] = [];
    for (let weekdayIdx = 0; weekdayIdx < grid.length; weekdayIdx++) {
      grid[weekdayIdx].forEach((cell, slotIndex) => {
        rows.push({
          memberId,
          periodId,
          weekday: weekdayIdx + 1,
          slotIndex,
          status: cell.status,
          sourceActivityId: cell.sourceActivityId,
        });
      });
    }
    if (rows.length === 0) return;
    // Batasi ukuran batch insert agar aman untuk grid besar (252 baris standar).
    const BATCH = 500;
    for (let i = 0; i < rows.length; i += BATCH) {
      await tx.insert(availabilitySlots).values(rows.slice(i, i + BATCH));
    }
  },

  refreshAggregates: async (periodId: string, tx: Tx) => {
    await tx.delete(availabilityAggregates).where(eq(availabilityAggregates.periodId, periodId));
    await tx.execute(sql`
      INSERT INTO availability_aggregates (period_id, weekday, slot_index, free_count, soft_count, total_active, computed_at)
      SELECT ${periodId}::uuid, s.weekday, s.slot_index,
        COUNT(*) FILTER (WHERE s.status IN ('implicit_free','preferred_free')),
        COUNT(*) FILTER (WHERE s.status IN ('soft_blocked','buffer')),
        COUNT(*),
        now()
      FROM availability_slots s
      JOIN members m ON m.id = s.member_id
      WHERE s.period_id = ${periodId}::uuid AND m.is_active = true
      GROUP BY s.weekday, s.slot_index
    `);
  },

  aggregatesFor: (periodId: string, tx: Tx = db) =>
    tx.query.availabilityAggregates.findMany({ where: eq(availabilityAggregates.periodId, periodId) }),

  slotsForMember: (memberId: string, periodId: string, tx: Tx = db) =>
    tx.query.availabilitySlots.findMany({
      where: and(eq(availabilitySlots.memberId, memberId), eq(availabilitySlots.periodId, periodId)),
    }),

  slotsForMembers: (memberIds: string[], periodId: string, weekday: number, tx: Tx = db) =>
    tx.query.availabilitySlots.findMany({
      where: and(
        inArray(availabilitySlots.memberId, memberIds),
        eq(availabilitySlots.periodId, periodId),
        eq(availabilitySlots.weekday, weekday),
      ),
    }),
};

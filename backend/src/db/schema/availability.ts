import { index, pgTable, primaryKey, smallint, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { members } from "./members.js";
import { periods } from "./periods.js";
import { activities } from "./activities.js";
import { availabilityStatus } from "./enums.js";

export const availabilitySlots = pgTable(
  "availability_slots",
  {
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    periodId: uuid("period_id").notNull().references(() => periods.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(),
    slotIndex: smallint("slot_index").notNull(),
    status: availabilityStatus("status").notNull(),
    sourceActivityId: uuid("source_activity_id").references(() => activities.id, { onDelete: "set null" }),
  },
  (t) => [
    primaryKey({ columns: [t.memberId, t.periodId, t.weekday, t.slotIndex] }),
    index("slots_lookup_idx").on(t.periodId, t.weekday, t.slotIndex, t.status),
  ],
);

export const availabilityAggregates = pgTable(
  "availability_aggregates",
  {
    periodId: uuid("period_id").notNull().references(() => periods.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(),
    slotIndex: smallint("slot_index").notNull(),
    freeCount: smallint("free_count").notNull(),
    softCount: smallint("soft_count").notNull(),
    totalActive: smallint("total_active").notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.periodId, t.weekday, t.slotIndex] })],
);

export const availabilitySlotsRelations = relations(availabilitySlots, ({ one }) => ({
  member: one(members, { fields: [availabilitySlots.memberId], references: [members.id] }),
  period: one(periods, { fields: [availabilitySlots.periodId], references: [periods.id] }),
}));

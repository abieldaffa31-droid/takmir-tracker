import { check, index, integer, pgTable, text, time, timestamp, unique, uuid, date } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { members } from "./members.js";
import { periodStatus } from "./enums.js";

export const periods = pgTable(
  "periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    status: periodStatus("status").notNull().default("draft"),
    operationalStart: time("operational_start").notNull().default("04:00"),
    operationalEnd: time("operational_end").notNull().default("22:00"),
    slotMinutes: integer("slot_minutes").notNull().default(30),
    bufferMinutes: integer("buffer_minutes").notNull().default(30),
    staleAfterDays: integer("stale_after_days").notNull().default(30),
    availabilityVersion: integer("availability_version").notNull().default(0),
    createdBy: uuid("created_by").references(() => members.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("period_date_order", sql`${t.endDate} > ${t.startDate}`),
    check("slot_divides_day", sql`1440 % ${t.slotMinutes} = 0`),
  ],
);

export const timeBands = pgTable(
  "time_bands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    periodId: uuid("period_id").notNull().references(() => periods.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (t) => [unique("band_key_per_period").on(t.periodId, t.key)],
);

export const periodsRelations = relations(periods, ({ many }) => ({
  bands: many(timeBands),
}));

export const timeBandsRelations = relations(timeBands, ({ one }) => ({
  period: one(periods, { fields: [timeBands.periodId], references: [periods.id] }),
}));

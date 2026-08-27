import { boolean, check, date, index, jsonb, pgTable, smallint, text, time, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { members } from "./members.js";
import { periods } from "./periods.js";
import { activityCategory, activitySource, exceptionType, recurrenceRule } from "./enums.js";

export type RecurrenceMeta = { weekParity?: "odd" | "even"; note?: string };

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    periodId: uuid("period_id").notNull().references(() => periods.id, { onDelete: "cascade" }),
    category: activityCategory("category").notNull(),
    title: text("title").notNull(),
    location: text("location"),
    isOutsideArea: boolean("is_outside_area").notNull().default(false),
    note: text("note"),
    source: activitySource("source").notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("activities_member_period_idx").on(t.memberId, t.periodId)],
);

export const activitySchedules = pgTable(
  "activity_schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    activityId: uuid("activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    recurrence: recurrenceRule("recurrence").notNull().default("weekly"),
    recurrenceMeta: jsonb("recurrence_meta").$type<RecurrenceMeta>(),
  },
  (t) => [
    check("weekday_range", sql`${t.weekday} BETWEEN 1 AND 7`),
    check("time_order", sql`${t.endTime} > ${t.startTime}`),
    index("schedules_activity_idx").on(t.activityId),
  ],
);

export const scheduleExceptions = pgTable(
  "schedule_exceptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    isAllDay: boolean("is_all_day").notNull().default(true),
    startTime: time("start_time"),
    endTime: time("end_time"),
    type: exceptionType("type").notNull(),
    reason: text("reason"),
    countsAgainstQuota: boolean("counts_against_quota").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("exceptions_member_range_idx").on(t.memberId, t.startDate, t.endDate),
    check("exception_date_order", sql`${t.endDate} >= ${t.startDate}`),
  ],
);

export const activitiesRelations = relations(activities, ({ many, one }) => ({
  schedules: many(activitySchedules),
  member: one(members, { fields: [activities.memberId], references: [members.id] }),
  period: one(periods, { fields: [activities.periodId], references: [periods.id] }),
}));

export const activitySchedulesRelations = relations(activitySchedules, ({ one }) => ({
  activity: one(activities, { fields: [activitySchedules.activityId], references: [activities.id] }),
}));

export const scheduleExceptionsRelations = relations(scheduleExceptions, ({ one }) => ({
  member: one(members, { fields: [scheduleExceptions.memberId], references: [members.id] }),
}));

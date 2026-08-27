import { boolean, date, index, integer, pgTable, text, time, timestamp, uuid } from "drizzle-orm/pg-core";
import { members } from "./members.js";
import { periods } from "./periods.js";
import { assignmentStatus, competency } from "./enums.js";

// Phase 2 — belum dipakai endpoint mana pun di MVP ini, disiapkan agar migrasi tidak perlu diulang.
export const dutyTypes = pgTable("duty_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  defaultDurationMinutes: integer("default_duration_minutes"),
  requiredCompetency: competency("required_competency"),
  isActive: boolean("is_active").notNull().default(true),
});

export const assignments = pgTable(
  "assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id").notNull().references(() => members.id),
    dutyTypeId: uuid("duty_type_id").references(() => dutyTypes.id),
    periodId: uuid("period_id").notNull().references(() => periods.id),
    date: date("date").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    status: assignmentStatus("status").notNull().default("draft"),
    assignedBy: uuid("assigned_by").references(() => members.id),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("assignments_member_date_idx").on(t.memberId, t.date),
    index("assignments_date_status_idx").on(t.date, t.status),
  ],
);

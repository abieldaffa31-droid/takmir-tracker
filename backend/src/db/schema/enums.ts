import { pgEnum } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "coordinator", "member", "viewer"]);

export const memberStatus = pgEnum("member_status", ["mahasiswa", "pekerja", "keduanya", "lainnya"]);

export const domicileZone = pgEnum("domicile_zone", ["dalam_kompleks", "dekat", "jauh"]);

export const detailVisibility = pgEnum("detail_visibility", ["public", "busy_only", "coordinator_only"]);

export const periodStatus = pgEnum("period_status", ["draft", "active", "archived"]);

export const activityCategory = pgEnum("activity_category", [
  "kuliah",
  "kerja",
  "amanah_masjid",
  "organisasi",
  "pribadi",
  "luang_preferred",
]);

export const activitySource = pgEnum("activity_source", ["manual", "rollover", "import_krs", "assignment"]);

export const recurrenceRule = pgEnum("recurrence_rule", ["weekly", "biweekly_odd", "biweekly_even", "custom"]);

export const exceptionType = pgEnum("exception_type", ["izin", "sakit", "luar_kota", "ujian", "lainnya"]);

// Urutan disengaja: prioritas tertinggi -> terendah (BR-2). Perbandingan prioritas pakai indeks array.
export const availabilityStatus = pgEnum("availability_status", [
  "exception_blocked",
  "hard_blocked",
  "soft_blocked",
  "buffer",
  "preferred_free",
  "implicit_free",
]);

export const assignmentStatus = pgEnum("assignment_status", [
  "draft",
  "sent",
  "confirmed",
  "declined",
  "completed",
  "no_show",
]);

export const competency = pgEnum("competency", [
  "imam",
  "adzan",
  "khutbah",
  "mc",
  "desain",
  "videografi",
  "teknisi",
  "administrasi",
]);

export const auditAction = pgEnum("audit_action", [
  "create",
  "update",
  "delete",
  "activate",
  "deactivate",
  "recompute",
]);

export type UserRole = (typeof userRole.enumValues)[number];
export type MemberStatus = (typeof memberStatus.enumValues)[number];
export type DomicileZone = (typeof domicileZone.enumValues)[number];
export type DetailVisibility = (typeof detailVisibility.enumValues)[number];
export type PeriodStatus = (typeof periodStatus.enumValues)[number];
export type ActivityCategory = (typeof activityCategory.enumValues)[number];
export type ActivitySource = (typeof activitySource.enumValues)[number];
export type RecurrenceRule = (typeof recurrenceRule.enumValues)[number];
export type ExceptionType = (typeof exceptionType.enumValues)[number];
export type AvailabilityStatus = (typeof availabilityStatus.enumValues)[number];
export type AssignmentStatus = (typeof assignmentStatus.enumValues)[number];
export type Competency = (typeof competency.enumValues)[number];
export type AuditAction = (typeof auditAction.enumValues)[number];

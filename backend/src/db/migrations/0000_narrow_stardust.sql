CREATE TYPE "public"."activity_category" AS ENUM('kuliah', 'kerja', 'amanah_masjid', 'organisasi', 'pribadi', 'luang_preferred');--> statement-breakpoint
CREATE TYPE "public"."activity_source" AS ENUM('manual', 'rollover', 'import_krs', 'assignment');--> statement-breakpoint
CREATE TYPE "public"."assignment_status" AS ENUM('draft', 'sent', 'confirmed', 'declined', 'completed', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete', 'activate', 'deactivate', 'recompute');--> statement-breakpoint
CREATE TYPE "public"."availability_status" AS ENUM('exception_blocked', 'hard_blocked', 'soft_blocked', 'buffer', 'preferred_free', 'implicit_free');--> statement-breakpoint
CREATE TYPE "public"."competency" AS ENUM('imam', 'adzan', 'khutbah', 'mc', 'desain', 'videografi', 'teknisi', 'administrasi');--> statement-breakpoint
CREATE TYPE "public"."detail_visibility" AS ENUM('public', 'busy_only', 'coordinator_only');--> statement-breakpoint
CREATE TYPE "public"."domicile_zone" AS ENUM('dalam_kompleks', 'dekat', 'jauh');--> statement-breakpoint
CREATE TYPE "public"."exception_type" AS ENUM('izin', 'sakit', 'luar_kota', 'ujian', 'lainnya');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('mahasiswa', 'pekerja', 'keduanya', 'lainnya');--> statement-breakpoint
CREATE TYPE "public"."period_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."recurrence_rule" AS ENUM('weekly', 'biweekly_odd', 'biweekly_even', 'custom');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'coordinator', 'member', 'viewer');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_competencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"competency" "competency" NOT NULL,
	"level" text,
	CONSTRAINT "member_competency_unique" UNIQUE("member_id","competency")
);
--> statement-breakpoint
CREATE TABLE "member_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"invited_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"full_name" text NOT NULL,
	"nickname" text NOT NULL,
	"phone" text,
	"email" text NOT NULL,
	"photo_url" text,
	"member_status" "member_status" DEFAULT 'lainnya' NOT NULL,
	"division" text,
	"domicile_zone" "domicile_zone" DEFAULT 'dekat' NOT NULL,
	"detail_visibility" "detail_visibility" DEFAULT 'busy_only' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"joined_at" date,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "members_phone_unique" UNIQUE("phone"),
	CONSTRAINT "members_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" "period_status" DEFAULT 'draft' NOT NULL,
	"operational_start" time DEFAULT '04:00' NOT NULL,
	"operational_end" time DEFAULT '22:00' NOT NULL,
	"slot_minutes" integer DEFAULT 30 NOT NULL,
	"buffer_minutes" integer DEFAULT 30 NOT NULL,
	"stale_after_days" integer DEFAULT 30 NOT NULL,
	"availability_version" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "period_date_order" CHECK ("periods"."end_date" > "periods"."start_date"),
	CONSTRAINT "slot_divides_day" CHECK (1440 % "periods"."slot_minutes" = 0)
);
--> statement-breakpoint
CREATE TABLE "time_bands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "band_key_per_period" UNIQUE("period_id","key")
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"category" "activity_category" NOT NULL,
	"title" text NOT NULL,
	"location" text,
	"is_outside_area" boolean DEFAULT false NOT NULL,
	"note" text,
	"source" "activity_source" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"recurrence" "recurrence_rule" DEFAULT 'weekly' NOT NULL,
	"recurrence_meta" jsonb,
	CONSTRAINT "weekday_range" CHECK ("activity_schedules"."weekday" BETWEEN 1 AND 7),
	CONSTRAINT "time_order" CHECK ("activity_schedules"."end_time" > "activity_schedules"."start_time")
);
--> statement-breakpoint
CREATE TABLE "schedule_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"is_all_day" boolean DEFAULT true NOT NULL,
	"start_time" time,
	"end_time" time,
	"type" "exception_type" NOT NULL,
	"reason" text,
	"counts_against_quota" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exception_date_order" CHECK ("schedule_exceptions"."end_date" >= "schedule_exceptions"."start_date")
);
--> statement-breakpoint
CREATE TABLE "availability_aggregates" (
	"period_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"slot_index" smallint NOT NULL,
	"free_count" smallint NOT NULL,
	"soft_count" smallint NOT NULL,
	"total_active" smallint NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "availability_aggregates_period_id_weekday_slot_index_pk" PRIMARY KEY("period_id","weekday","slot_index")
);
--> statement-breakpoint
CREATE TABLE "availability_slots" (
	"member_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"slot_index" smallint NOT NULL,
	"status" "availability_status" NOT NULL,
	"source_activity_id" uuid,
	CONSTRAINT "availability_slots_member_id_period_id_weekday_slot_index_pk" PRIMARY KEY("member_id","period_id","weekday","slot_index")
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"duty_type_id" uuid,
	"period_id" uuid NOT NULL,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"status" "assignment_status" DEFAULT 'draft' NOT NULL,
	"assigned_by" uuid,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "duty_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"default_duration_minutes" integer,
	"required_competency" "competency",
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"action" "audit_action" NOT NULL,
	"diff" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_competencies" ADD CONSTRAINT "member_competencies_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_invitations" ADD CONSTRAINT "member_invitations_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_invitations" ADD CONSTRAINT "member_invitations_invited_by_members_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "periods" ADD CONSTRAINT "periods_created_by_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_bands" ADD CONSTRAINT "time_bands_period_id_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_period_id_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_schedules" ADD CONSTRAINT "activity_schedules_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_aggregates" ADD CONSTRAINT "availability_aggregates_period_id_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_period_id_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_source_activity_id_activities_id_fk" FOREIGN KEY ("source_activity_id") REFERENCES "public"."activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_duty_type_id_duty_types_id_fk" FOREIGN KEY ("duty_type_id") REFERENCES "public"."duty_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_period_id_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assigned_by_members_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_members_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "competency_lookup_idx" ON "member_competencies" USING btree ("competency");--> statement-breakpoint
CREATE INDEX "members_active_idx" ON "members" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "members_division_idx" ON "members" USING btree ("division");--> statement-breakpoint
CREATE INDEX "activities_member_period_idx" ON "activities" USING btree ("member_id","period_id");--> statement-breakpoint
CREATE INDEX "schedules_activity_idx" ON "activity_schedules" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "exceptions_member_range_idx" ON "schedule_exceptions" USING btree ("member_id","start_date","end_date");--> statement-breakpoint
CREATE INDEX "slots_lookup_idx" ON "availability_slots" USING btree ("period_id","weekday","slot_index","status");--> statement-breakpoint
CREATE INDEX "assignments_member_date_idx" ON "assignments" USING btree ("member_id","date");--> statement-breakpoint
CREATE INDEX "assignments_date_status_idx" ON "assignments" USING btree ("date","status");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_logs" USING btree ("created_at");
import { boolean, date, index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth.js";
import { competency, detailVisibility, domicileZone, memberStatus } from "./enums.js";

export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }).unique(),
    fullName: text("full_name").notNull(),
    nickname: text("nickname").notNull(),
    phone: text("phone").unique(),
    email: text("email").notNull().unique(),
    photoUrl: text("photo_url"),
    memberStatus: memberStatus("member_status").notNull().default("lainnya"),
    division: text("division"),
    domicileZone: domicileZone("domicile_zone").notNull().default("dekat"),
    detailVisibility: detailVisibility("detail_visibility").notNull().default("busy_only"),
    isActive: boolean("is_active").notNull().default(true),
    joinedAt: date("joined_at"),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("members_active_idx").on(t.isActive), index("members_division_idx").on(t.division)],
);

export const memberCompetencies = pgTable(
  "member_competencies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    competency: competency("competency").notNull(),
    level: text("level"),
  },
  (t) => [
    unique("member_competency_unique").on(t.memberId, t.competency),
    index("competency_lookup_idx").on(t.competency),
  ],
);

export const memberInvitations = pgTable("member_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  invitedBy: uuid("invited_by").references((): any => members.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const membersRelations = relations(members, ({ many, one }) => ({
  competencies: many(memberCompetencies),
  invitations: many(memberInvitations, { relationName: "memberInvitations" }),
  user: one(user, { fields: [members.userId], references: [user.id] }),
}));

export const memberCompetenciesRelations = relations(memberCompetencies, ({ one }) => ({
  member: one(members, { fields: [memberCompetencies.memberId], references: [members.id] }),
}));

export const memberInvitationsRelations = relations(memberInvitations, ({ one }) => ({
  member: one(members, {
    fields: [memberInvitations.memberId],
    references: [members.id],
    relationName: "memberInvitations",
  }),
}));

import { z } from "zod";

export const memberStatusEnum = z.enum(["mahasiswa", "pekerja", "keduanya", "lainnya"]);
export const domicileZoneEnum = z.enum(["dalam_kompleks", "dekat", "jauh"]);
export const detailVisibilityEnum = z.enum(["public", "busy_only", "coordinator_only"]);
export const competencyEnum = z.enum([
  "imam",
  "adzan",
  "khutbah",
  "mc",
  "desain",
  "videografi",
  "teknisi",
  "administrasi",
]);

export const createMemberSchema = z.object({
  fullName: z.string().min(1),
  nickname: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  memberStatus: memberStatusEnum.default("lainnya"),
  division: z.string().optional(),
  domicileZone: domicileZoneEnum.default("dekat"),
  detailVisibility: detailVisibilityEnum.default("busy_only"),
});

export const updateMemberSchema = createMemberSchema.partial();

export const updateSelfSchema = z.object({
  nickname: z.string().min(1).optional(),
  phone: z.string().optional(),
  memberStatus: memberStatusEnum.optional(),
  division: z.string().optional(),
  domicileZone: domicileZoneEnum.optional(),
  detailVisibility: detailVisibilityEnum.optional(),
  photoUrl: z.string().url().optional(),
});

export const listMembersQuerySchema = z.object({
  search: z.string().optional(),
  periodId: z.string().uuid().optional(),
  activeOnly: z.coerce.boolean().optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });

export const setCompetenciesSchema = z.object({
  competencies: z.array(z.object({ competency: competencyEnum, level: z.string().optional() })),
});

export const bulkDeleteMembersSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

import { z } from "zod";

export const activityCategoryEnum = z.enum([
  "kuliah",
  "kerja",
  "amanah_masjid",
  "organisasi",
  "pribadi",
  "luang_preferred",
]);

export const recurrenceRuleEnum = z.enum(["weekly", "biweekly_odd", "biweekly_even", "custom"]);

// endTime <= startTime berarti lintas tengah malam (mis. shift 22:00-06:00) —
// service memecahnya menjadi dua baris sebelum disimpan (Backend Plan §2.5),
// jadi di sini cukup ditolak kalau sama persis (durasi nol).
export const activityScheduleSchema = z
  .object({
    weekday: z.number().int().min(1).max(7),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    recurrence: recurrenceRuleEnum.default("weekly"),
  })
  .refine((s) => s.endTime !== s.startTime, { message: "Waktu mulai dan selesai tidak boleh sama" });

export const createActivitySchema = z.object({
  periodId: z.string().uuid(),
  memberId: z.string().uuid().optional(), // koordinator boleh isi milik orang lain
  category: activityCategoryEnum,
  title: z.string().min(1),
  location: z.string().optional(),
  isOutsideArea: z.boolean().default(false),
  note: z.string().optional(),
  schedules: z.array(activityScheduleSchema).min(1),
});

export const bulkCreateActivitySchema = z.object({
  activities: z.array(createActivitySchema).min(1),
});

export const updateActivitySchema = createActivitySchema.partial().extend({
  schedules: z.array(activityScheduleSchema).min(1).optional(),
});

export const checkConflictSchema = z.object({
  periodId: z.string().uuid(),
  memberId: z.string().uuid().optional(),
  excludeActivityId: z.string().uuid().optional(),
  schedules: z.array(activityScheduleSchema).min(1),
});

export const listActivitiesQuerySchema = z.object({
  periodId: z.string().uuid(),
  memberId: z.string().uuid().optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });

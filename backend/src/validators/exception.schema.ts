import { z } from "zod";

export const exceptionTypeEnum = z.enum(["izin", "sakit", "luar_kota", "ujian", "lainnya"]);

const exceptionShape = z.object({
  memberId: z.string().uuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isAllDay: z.boolean().default(true),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  type: exceptionTypeEnum,
  reason: z.string().optional(),
  countsAgainstQuota: z.boolean().default(false),
});

export const createExceptionSchema = exceptionShape.refine((e) => e.endDate >= e.startDate, {
  message: "Tanggal selesai harus setelah tanggal mulai",
});

export const updateExceptionSchema = exceptionShape.partial();

export const listExceptionsQuerySchema = z.object({
  memberId: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });

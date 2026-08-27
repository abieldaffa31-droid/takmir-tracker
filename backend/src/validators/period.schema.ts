import { z } from "zod";

export const createPeriodSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  operationalStart: z.string().regex(/^\d{2}:\d{2}$/).default("04:00"),
  operationalEnd: z.string().regex(/^\d{2}:\d{2}$/).default("22:00"),
  slotMinutes: z.number().int().positive().default(30),
  bufferMinutes: z.number().int().nonnegative().default(30),
  staleAfterDays: z.number().int().positive().default(30),
});

export const updatePeriodSchema = createPeriodSchema.partial();

export const bandSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  sortOrder: z.number().int(),
});

export const replaceBandsSchema = z.object({ bands: z.array(bandSchema).min(1) });

export const idParamSchema = z.object({ id: z.string().uuid() });

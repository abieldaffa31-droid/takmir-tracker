import { z } from "zod";

export const gridQuerySchema = z.object({
  periodId: z.string().uuid(),
  granularity: z.enum(["slot", "band"]).default("band"),
});

export const memberGridQuerySchema = z.object({ periodId: z.string().uuid() });

export const dayQuerySchema = z.object({
  periodId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  granularity: z.enum(["slot", "band"]).default("band"),
});

export const slotQuerySchema = z.object({
  periodId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export const searchBodySchema = z.object({
  periodId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  needed: z.number().int().positive(),
  filters: z
    .object({
      division: z.string().optional(),
      competencies: z
        .array(z.enum(["imam", "adzan", "khutbah", "mc", "desain", "videografi", "teknisi", "administrasi"]))
        .optional(),
      domicileZone: z.array(z.enum(["dalam_kompleks", "dekat", "jauh"])).optional(),
      applyBuffer: z.boolean().optional(),
    })
    .optional(),
});

export const recomputeBodySchema = z.object({
  periodId: z.string().uuid(),
  memberId: z.string().uuid().optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });

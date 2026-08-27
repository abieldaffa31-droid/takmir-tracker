import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";
import { ValidationError } from "../lib/errors.js";

type Schemas = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

export const validate = (schemas: Schemas) => (req: Request, _res: Response, next: NextFunction) => {
  for (const key of ["body", "query", "params"] as const) {
    const schema = schemas[key];
    if (!schema) continue;
    const result = schema.safeParse(req[key]);
    if (!result.success) return next(new ValidationError(result.error.flatten()));
    if (key === "query") {
      // Express 5: `req.query` tidak punya setter (getter murni dari URL) —
      // isi ulang objeknya di tempat, jangan ganti referensinya.
      for (const k of Object.keys(req.query)) delete (req.query as Record<string, unknown>)[k];
      Object.assign(req.query as Record<string, unknown>, result.data as Record<string, unknown>);
    } else {
      (req as unknown as Record<string, unknown>)[key] = result.data;
    }
  }
  next();
};

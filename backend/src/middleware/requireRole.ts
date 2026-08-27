import type { Request, Response, NextFunction } from "express";
import { ForbiddenError } from "../lib/errors.js";
import type { Role } from "../lib/types.js";

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!roles.includes(req.actor.role)) return next(new ForbiddenError());
    next();
  };

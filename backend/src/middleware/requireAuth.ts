import type { Request, Response, NextFunction } from "express";
import { auth } from "../config/auth.js";
import { memberRepo } from "../repositories/member.repo.js";
import { ForbiddenError, UnauthenticatedError } from "../lib/errors.js";
import type { Actor, Role } from "../lib/types.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      actor: Actor;
    }
  }
}

function toNodeHeaders(req: Request): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.append(key, value);
    else if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
  }
  return headers;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({ headers: toNodeHeaders(req) });
    if (!session) throw new UnauthenticatedError();

    const member = await memberRepo.byUserId(session.user.id);
    if (!member || !member.isActive) throw new ForbiddenError("Akun tidak aktif");

    req.actor = {
      userId: session.user.id,
      memberId: member.id,
      role: ((session.user as { role?: string }).role ?? "member") as Role,
    };
    next();
  } catch (err) {
    next(err);
  }
}

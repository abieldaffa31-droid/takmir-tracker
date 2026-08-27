import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { auditService } from "../services/audit.service.js";
import { ok } from "../lib/result.js";

export const auditRoutes = Router();
auditRoutes.use(requireAuth, requireRole("admin"));

auditRoutes.get("/", async (_req, res) => res.json(ok(await auditService.list())));

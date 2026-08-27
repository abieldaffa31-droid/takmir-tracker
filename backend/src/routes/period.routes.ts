import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import {
  createPeriodSchema,
  idParamSchema,
  replaceBandsSchema,
  updatePeriodSchema,
} from "../validators/period.schema.js";
import { periodService } from "../services/period.service.js";
import { ok, created } from "../lib/result.js";

export const periodRoutes = Router();
periodRoutes.use(requireAuth);

periodRoutes.get("/", async (_req, res) => res.json(ok(await periodService.list())));

periodRoutes.get("/active", async (_req, res) => res.json(ok(await periodService.getActive())));

periodRoutes.post(
  "/",
  requireRole("coordinator", "admin"),
  validate({ body: createPeriodSchema }),
  async (req, res) => res.status(201).json(created(await periodService.create(req.actor, req.body as any))),
);

periodRoutes.patch(
  "/:id",
  requireRole("coordinator", "admin"),
  validate({ params: idParamSchema, body: updatePeriodSchema }),
  async (req, res) => res.json(ok(await periodService.update(req.actor, (req.params.id as string), req.body))),
);

periodRoutes.post(
  "/:id/activate",
  requireRole("coordinator", "admin"),
  validate({ params: idParamSchema }),
  async (req, res) => res.json(ok(await periodService.activate(req.actor, (req.params.id as string)))),
);

periodRoutes.post(
  "/:id/archive",
  requireRole("coordinator", "admin"),
  validate({ params: idParamSchema }),
  async (req, res) => res.json(ok(await periodService.archive(req.actor, (req.params.id as string)))),
);

periodRoutes.post(
  "/:id/rollover",
  requireRole("coordinator", "admin"),
  validate({ params: idParamSchema, body: createPeriodSchema }),
  async (req, res) => res.status(201).json(created(await periodService.rollover(req.actor, (req.params.id as string), req.body as any))),
);

periodRoutes.get(
  "/:id/completion",
  requireRole("coordinator", "admin", "viewer"),
  validate({ params: idParamSchema }),
  async (req, res) => res.json(ok(await periodService.completionSummary(req.actor, (req.params.id as string)))),
);

periodRoutes.get("/:id/bands", validate({ params: idParamSchema }), async (req, res) =>
  res.json(ok(await periodService.listBands((req.params.id as string)))),
);

periodRoutes.put(
  "/:id/bands",
  requireRole("coordinator", "admin"),
  validate({ params: idParamSchema, body: replaceBandsSchema }),
  async (req, res) => res.json(ok(await periodService.replaceBands(req.actor, (req.params.id as string), req.body.bands))),
);

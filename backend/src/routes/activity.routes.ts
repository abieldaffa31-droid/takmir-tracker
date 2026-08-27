import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import {
  bulkCreateActivitySchema,
  checkConflictSchema,
  createActivitySchema,
  idParamSchema,
  listActivitiesQuerySchema,
  updateActivitySchema,
} from "../validators/activity.schema.js";
import { scheduleService } from "../services/schedule.service.js";
import { memberService } from "../services/member.service.js";
import { ok, created } from "../lib/result.js";

export const activityRoutes = Router();
activityRoutes.use(requireAuth);

activityRoutes.get("/", validate({ query: listActivitiesQuerySchema }), async (req, res) =>
  res.json(ok(await scheduleService.list(req.actor, req.query as any))),
);

activityRoutes.post("/", validate({ body: createActivitySchema }), async (req, res) =>
  res.status(201).json(created(await scheduleService.create(req.actor, req.body as any))),
);

activityRoutes.post("/bulk", validate({ body: bulkCreateActivitySchema }), async (req, res) =>
  res.status(201).json(created(await scheduleService.createMany(req.actor, req.body.activities))),
);

activityRoutes.patch("/:id", validate({ params: idParamSchema, body: updateActivitySchema }), async (req, res) =>
  res.json(ok(await scheduleService.update(req.actor, (req.params.id as string), req.body as any))),
);

activityRoutes.delete("/:id", validate({ params: idParamSchema }), async (req, res) => {
  await scheduleService.remove(req.actor, (req.params.id as string));
  res.status(204).send();
});

activityRoutes.post("/check-conflict", validate({ body: checkConflictSchema }), async (req, res) =>
  res.json(ok(await scheduleService.detectConflicts(req.actor, req.body as any))),
);

activityRoutes.post("/mark-reviewed", async (req, res) => res.json(ok(await memberService.markReviewed(req.actor))));

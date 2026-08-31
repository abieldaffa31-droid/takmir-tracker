import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import {
  bulkDeleteMembersSchema,
  createMemberSchema,
  idParamSchema,
  listMembersQuerySchema,
  setCompetenciesSchema,
  updateMemberSchema,
  updateSelfSchema,
} from "../validators/member.schema.js";
import { memberService } from "../services/member.service.js";
import { invitationService } from "../services/invitation.service.js";
import { ok, created } from "../lib/result.js";

export const memberRoutes = Router();
memberRoutes.use(requireAuth);

memberRoutes.get("/me", async (req, res) => res.json(ok(await memberService.getSelf(req.actor))));

memberRoutes.patch("/me", validate({ body: updateSelfSchema }), async (req, res) =>
  res.json(ok(await memberService.updateSelf(req.actor, req.body))),
);

memberRoutes.post("/me/mark-reviewed", async (req, res) => res.json(ok(await memberService.markReviewed(req.actor))));

memberRoutes.get("/", validate({ query: listMembersQuerySchema }), async (req, res) =>
  res.json(ok(await memberService.list(req.actor, req.query as any))),
);

memberRoutes.post(
  "/",
  requireRole("coordinator", "admin"),
  validate({ body: createMemberSchema }),
  async (req, res) => res.status(201).json(created(await memberService.create(req.actor, req.body as any))),
);

memberRoutes.get("/:id", validate({ params: idParamSchema }), async (req, res) =>
  res.json(ok(await memberService.byId(req.actor, (req.params.id as string)))),
);

memberRoutes.patch(
  "/:id",
  requireRole("coordinator", "admin"),
  validate({ params: idParamSchema, body: updateMemberSchema }),
  async (req, res) => res.json(ok(await memberService.update(req.actor, (req.params.id as string), req.body))),
);

memberRoutes.delete(
  "/:id",
  requireRole("admin"),
  validate({ params: idParamSchema }),
  async (req, res) => {
    await memberService.remove(req.actor, req.params.id as string);
    res.status(204).send();
  },
);

memberRoutes.post(
  "/bulk-delete",
  requireRole("admin"),
  validate({ body: bulkDeleteMembersSchema }),
  async (req, res) => res.json(ok(await memberService.removeMany(req.actor, req.body.ids))),
);

memberRoutes.post(
  "/:id/deactivate",
  requireRole("coordinator", "admin"),
  validate({ params: idParamSchema }),
  async (req, res) => res.json(ok(await memberService.deactivate(req.actor, (req.params.id as string)))),
);

memberRoutes.post(
  "/:id/reactivate",
  requireRole("coordinator", "admin"),
  validate({ params: idParamSchema }),
  async (req, res) => res.json(ok(await memberService.reactivate(req.actor, (req.params.id as string)))),
);

memberRoutes.post(
  "/:id/resend-invite",
  requireRole("coordinator", "admin"),
  validate({ params: idParamSchema }),
  async (req, res) => res.json(ok(await invitationService.resend((req.params.id as string), req.actor))),
);

memberRoutes.put(
  "/:id/competencies",
  requireRole("coordinator", "admin"),
  validate({ params: idParamSchema, body: setCompetenciesSchema }),
  async (req, res) => res.json(ok(await memberService.setCompetencies(req.actor, (req.params.id as string), req.body.competencies))),
);

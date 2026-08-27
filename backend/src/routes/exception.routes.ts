import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import {
  createExceptionSchema,
  idParamSchema,
  listExceptionsQuerySchema,
  updateExceptionSchema,
} from "../validators/exception.schema.js";
import { exceptionService } from "../services/exception.service.js";
import { ok, created } from "../lib/result.js";

export const exceptionRoutes = Router();
exceptionRoutes.use(requireAuth);

exceptionRoutes.get("/", validate({ query: listExceptionsQuerySchema }), async (req, res) =>
  res.json(ok(await exceptionService.list(req.query as any))),
);

exceptionRoutes.post("/", validate({ body: createExceptionSchema }), async (req, res) =>
  res.status(201).json(created(await exceptionService.create(req.actor, req.body as any))),
);

exceptionRoutes.patch("/:id", validate({ params: idParamSchema, body: updateExceptionSchema }), async (req, res) =>
  res.json(ok(await exceptionService.update(req.actor, (req.params.id as string), req.body as any))),
);

exceptionRoutes.delete("/:id", validate({ params: idParamSchema }), async (req, res) => {
  await exceptionService.remove(req.actor, (req.params.id as string));
  res.status(204).send();
});

import { Router } from "express";
import { memberRoutes } from "./member.routes.js";
import { periodRoutes } from "./period.routes.js";
import { activityRoutes } from "./activity.routes.js";
import { exceptionRoutes } from "./exception.routes.js";
import { auditRoutes } from "./audit.routes.js";
import { availabilityRoutes } from "./availability.routes.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ data: { status: "ok" } });
});

apiRouter.use("/members", memberRoutes);
apiRouter.use("/periods", periodRoutes);
apiRouter.use("/activities", activityRoutes);
apiRouter.use("/exceptions", exceptionRoutes);
apiRouter.use("/audit", auditRoutes);
apiRouter.use("/availability", availabilityRoutes);

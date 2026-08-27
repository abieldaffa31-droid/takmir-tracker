import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./config/auth.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiRouter } from "./routes/index.js";

export function createApp() {
  const app = express();

  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", env.FRONTEND_URL);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  // Better Auth menangani /api/auth/* sepenuhnya sendiri — dipasang sebelum
  // express.json() karena ia butuh membaca body mentah.
  app.all("/api/auth/*splat", toNodeHandler(auth));

  app.use(express.json());
  app.use("/api", apiRouter);
  app.use(errorHandler);

  return app;
}

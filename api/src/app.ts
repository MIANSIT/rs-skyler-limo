import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";

import { pool } from "./db.js";
import { env } from "./env.js";
import { errorHandler, notFound } from "./middleware.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { publicRouter } from "./routes/public.js";

export function createApp(): Express {
  const app = express();

  // Behind nginx, so req.ip must come from X-Forwarded-For or every rate limit
  // is keyed on the proxy and the whole internet shares one bucket.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // No Origin header means a server-to-server call (the Next.js app) or
        // curl — nothing for CORS to protect, so allow it.
        if (!origin || env.CORS_ORIGINS.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("Origin not allowed"));
      },
      methods: ["GET", "POST", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: "64kb" }));

  app.get("/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok", database: "up" });
    } catch {
      res.status(503).json({ status: "degraded", database: "down" });
    }
  });

  app.use("/api", publicRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/admin", adminRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";

import { pool } from "./db.js";
import { env, isProduction } from "./env.js";
import { UPLOADS_ROOT } from "./lib/uploads.js";
import { errorHandler, notFound } from "./middleware.js";
import { adminRouter } from "./routes/admin.js";
import { adminHeroRouter } from "./routes/hero.js";
import { adminVehiclesRouter } from "./routes/vehicles.js";
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
  app.use("/api/admin/vehicles", adminVehiclesRouter);
  app.use("/api/admin/hero", adminHeroRouter);
  app.use("/api/admin", adminRouter);

  /**
   * Uploaded photography, in development only.
   *
   * In production nginx serves `UPLOADS_DIR` directly from the public origin —
   * see `deploy/nginx.conf`. Static files have no business occupying a Node
   * event loop, and serving them from the site's own domain keeps them behind
   * Cloudflare's cache.
   */
  if (!isProduction) {
    app.use(
      "/uploads",
      (_req, res, next) => {
        // `helmet()` sets Cross-Origin-Resource-Policy: same-origin, which
        // stops the dashboard on another origin from rendering these in an
        // <img>. Vehicle photos are public images meant to be embedded, so the
        // uploads path — and only the uploads path — opts out. Every JSON
        // endpoint keeps the strict default.
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        next();
      },
      express.static(UPLOADS_ROOT, {
        // Generated filenames are unique per upload, so a long cache is safe.
        maxAge: "30d",
        index: false,
        dotfiles: "deny",
      }),
    );
  }

  app.get("/", (_req, res) => {
    res.json({ message: "Welcome to the RS SKLYER LIMO API" });
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

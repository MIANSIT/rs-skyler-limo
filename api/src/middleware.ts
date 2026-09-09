import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

import { isProduction } from "./env.js";
import { ApiError } from "./lib/http.js";
import { resolveSession, touchSession, type AdminUser } from "./services/auth.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminUser;
      sessionToken?: string;
    }
  }
}

/**
 * Bearer-token auth. The browser never holds this token — the Next.js server
 * keeps it in an httpOnly cookie on its own origin and forwards it here — so
 * there is no cross-site cookie to defend and no CSRF surface on the API.
 */
export const requireAdmin: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.get("authorization") ?? "";
    const [scheme, token] = header.split(" ");

    if (scheme?.toLowerCase() !== "bearer" || !token) {
      throw ApiError.unauthorized();
    }

    const session = await resolveSession(token);
    if (!session) throw ApiError.unauthorized("Your session has expired.");

    req.admin = session.user;
    req.sessionToken = token;

    // Fire-and-forget: a failed heartbeat must not fail the request.
    void touchSession(session.sessionId).catch(() => {});

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * A fixed-window limiter held in memory. Sufficient for one Node process behind
 * nginx, which is the deployment in the build plan; move to Redis the day a
 * second process appears.
 */
export function rateLimit(options: {
  windowMs: number;
  max: number;
  key?: (req: Parameters<RequestHandler>[0]) => string;
}): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();

  // Keep the map from growing without bound on a long-lived process.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, options.windowMs);
  sweep.unref();

  return (req, res, next) => {
    const key = options.key?.(req) ?? req.ip ?? "unknown";
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    entry.count += 1;

    if (entry.count > options.max) {
      res.set("Retry-After", `${Math.ceil((entry.resetAt - now) / 1000)}`);
      next(ApiError.tooMany());
      return;
    }

    next();
  };
}

export const notFound: RequestHandler = (_req, _res, next) => {
  next(ApiError.notFound("No such endpoint."));
};

// The fourth parameter is unused but load-bearing: Express identifies error
// handlers by arity, and dropping it turns this into ordinary middleware.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "validation_failed",
        message: "Check the highlighted fields.",
        fields: Object.fromEntries(
          error.issues.map((issue) => [
            issue.path.join(".") || "_",
            issue.message,
          ]),
        ),
      },
    });
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
    return;
  }

  // Anything reaching here is a bug. Log it in full; tell the caller nothing.
  console.error(`Unhandled error on ${req.method} ${req.originalUrl}`, error);

  res.status(500).json({
    error: {
      code: "internal_error",
      message: "Something went wrong at our end.",
      ...(isProduction
        ? {}
        : { debug: error instanceof Error ? error.message : String(error) }),
    },
  });
};

import { Router } from "express";

import { rateLimit, requireAdmin } from "../middleware.js";
import { loginSchema } from "../schemas.js";
import { login, logout } from "../services/auth.js";

export const authRouter: Router = Router();

// Keyed on the submitted address as well as the IP, so one operator fumbling
// their password cannot lock the office out, and an attacker rotating IPs
// against one account still runs into a wall.
const loginLimit = rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  key: (req) => {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.toLowerCase()
        : "unknown";
    return `${req.ip}:${email}`;
  },
});

authRouter.post("/login", loginLimit, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const result = await login(email, password, {
    userAgent: req.get("user-agent") ?? undefined,
    ip: req.ip,
  });

  // The token is handed to the Next.js server, which stores it in an httpOnly
  // cookie on its own origin. It is never sent to a browser directly.
  res.json({
    token: result.token,
    expiresAt: result.expiresAt.toISOString(),
    user: result.user,
  });
});

authRouter.post("/logout", requireAdmin, async (req, res) => {
  if (req.sessionToken) await logout(req.sessionToken);
  res.status(204).end();
});

authRouter.get("/me", requireAdmin, (req, res) => {
  res.json({ user: req.admin });
});

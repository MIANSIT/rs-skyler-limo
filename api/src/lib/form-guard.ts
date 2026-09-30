import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import type { RequestHandler } from "express";

import { env } from "../env.js";
import { ApiError } from "./http.js";

/**
 * Spam protection for the public forms that needs no third-party service.
 *
 * Rate limiting stops volume; this stops the cheap script. Two independent
 * checks, both invisible to a real customer:
 *
 *  1. **A trap field.** The forms carry a text input named `website` that is
 *     hidden from people and from assistive technology. A person never fills
 *     it; a script that fills every input does.
 *  2. **A signed, timed token.** The page asks the API for a token when it
 *     loads. It records when it was issued and is signed, so it cannot be
 *     forged or back-dated. A submission that arrives seconds after the page
 *     loaded is a script, and one with no valid token never loaded the page.
 *
 * It does not stop a patient script that drives a real browser, and nothing
 * short of a CAPTCHA or proof of work does. It is one layer behind the rate
 * limit, not a wall, and it adds no vendor to the privacy policy.
 */

// Without a configured secret, a random one per process. Tokens then stop
// working across a restart, so a form opened before a deploy fails once and
// works on a reload. Set FORM_TOKEN_SECRET to make them survive restarts.
const secret = env.FORM_TOKEN_SECRET ?? randomBytes(32).toString("hex");

/** Faster than a person can read and fill a form, so almost certainly a script. */
const MIN_AGE_MS = 3_000;

/** Long enough for a customer who leaves a tab open, short enough to expire. */
const MAX_AGE_MS = 6 * 60 * 60_000;

function sign(issuedAt: string): string {
  return createHmac("sha256", secret).update(issuedAt).digest("base64url");
}

export function issueFormToken(now = Date.now()): string {
  const issuedAt = String(now);
  return `${issuedAt}.${sign(issuedAt)}`;
}

export type GuardResult = "ok" | "trap" | "missing" | "forged" | "too-fast" | "expired";

export function checkFormGuard(
  input: { formToken?: unknown; website?: unknown },
  now = Date.now(),
): GuardResult {
  if (typeof input.website === "string" && input.website.trim() !== "") {
    return "trap";
  }

  if (typeof input.formToken !== "string" || input.formToken === "") {
    return "missing";
  }

  const [issuedAt = "", signature = ""] = input.formToken.split(".");
  const expected = sign(issuedAt);

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return "forged";

  const age = now - Number(issuedAt);
  if (!Number.isFinite(age)) return "forged";
  if (age < MIN_AGE_MS) return "too-fast";
  if (age > MAX_AGE_MS) return "expired";

  return "ok";
}

const MESSAGES: Record<Exclude<GuardResult, "ok">, string> = {
  trap: "We could not send that. Please try again in a moment.",
  missing: "We could not send that. Please reload the page and try again.",
  forged: "We could not send that. Please reload the page and try again.",
  "too-fast": "That was quick. Please wait a few seconds and send it again.",
  expired: "This page has been open a while. Please reload it and try again.",
};

/** Rejects the request before it reaches validation or the database. */
export const requireFormGuard: RequestHandler = (req, _res, next) => {
  const body = (req.body ?? {}) as { formToken?: unknown; website?: unknown };
  const result = checkFormGuard(body);

  if (result === "ok") {
    next();
    return;
  }

  // Say what a person can act on. The trap gets the same neutral message as a
  // hiccup, so a script cannot learn which check it tripped.
  console.warn(`[guard] refused a submission: ${result}`);
  next(ApiError.badRequest(MESSAGES[result]));
};

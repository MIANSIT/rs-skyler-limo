import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "../env.js";

/**
 * Signed payment links: `/pay/RS-4K2P9WD?token=<expiry>.<signature>`.
 *
 * The link is the credential, so it has to be unforgeable and narrow. The
 * signature covers the booking id, its reference, the amount and the expiry:
 *
 * - nobody can make a link for a booking they were not sent one for;
 * - a link cannot be replayed against a different booking;
 * - if an operator changes the price, every link for the old price stops
 *   working, so a customer is never charged a figure nobody agreed;
 * - it expires, so a link found in an old inbox is not a standing door.
 *
 * Stripe still decides what is charged: the amount comes from the booking row
 * when the Checkout Session is created, never from the link.
 */

const LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

type Signable = { id: number; reference: string; quotedTotalCents: number | null };

function key(): string | null {
  if (env.PAYMENT_LINK_SECRET) return env.PAYMENT_LINK_SECRET;
  if (env.STRIPE_SECRET_KEY) {
    // Derived, so the Stripe key itself is never used as an HMAC key directly
    // and the two can be told apart if either leaks.
    return createHmac("sha256", env.STRIPE_SECRET_KEY).update("rsskyler-payment-links").digest("hex");
  }
  return null;
}

function sign(booking: Signable, expiresAt: number, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${booking.id}.${booking.reference}.${booking.quotedTotalCents}.${expiresAt}`)
    .digest("base64url");
}

export function paymentLinksAvailable(): boolean {
  return key() !== null;
}

export function createPaymentLink(booking: Signable): { url: string; expiresAt: Date } {
  const secret = key();
  if (!secret) throw new Error("No payment link secret configured.");

  const expiresAt = Date.now() + LIFETIME_MS;
  const token = `${expiresAt}.${sign(booking, expiresAt, secret)}`;
  const base = env.SITE_BASE_URL.replace(/\/+$/, "");

  return {
    url: `${base}/pay/${encodeURIComponent(booking.reference)}?token=${encodeURIComponent(token)}`,
    expiresAt: new Date(expiresAt),
  };
}

export type LinkCheck = "valid" | "expired" | "invalid";

/** Constant-time check; `expired` only for a genuine link past its date. */
export function checkPaymentLink(booking: Signable, token: string): LinkCheck {
  const secret = key();
  if (!secret) return "invalid";

  const [rawExpiry = "", signature = ""] = token.split(".");
  const expiresAt = Number(rawExpiry);
  if (!Number.isInteger(expiresAt) || !signature) return "invalid";

  const expected = Buffer.from(sign(booking, expiresAt, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return "invalid";

  return Date.now() > expiresAt ? "expired" : "valid";
}

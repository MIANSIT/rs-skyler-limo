/**
 * Google Analytics 4, loaded only with consent and only when configured.
 *
 * Two switches, both of which must be on before a single byte is requested
 * from Google:
 *
 *  1. `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set. Unset — which is how every
 *     developer checkout and every preview runs — nothing here does anything,
 *     so analytics never pollutes local traffic or a staging environment.
 *  2. The visitor has accepted analytics in the consent banner. The banner
 *     already stores that decision; this reads it rather than assuming a
 *     dismissed banner meant yes.
 *
 * `NEXT_PUBLIC_` because it runs in the browser. A measurement ID is not a
 * secret — it is visible in the page source of every site that uses GA — but
 * it is still configuration, so it lives in the environment rather than here.
 */

export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || null;

export const analyticsConfigured = Boolean(GA_MEASUREMENT_ID);

type GtagArgs =
  | ["js", Date]
  | ["config", string, Record<string, unknown>?]
  | ["event", string, Record<string, unknown>?]
  | ["consent", "default" | "update", Record<string, unknown>];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: GtagArgs) => void;
  }
}

function gtag(...args: GtagArgs): void {
  if (typeof window === "undefined") return;
  window.dataLayer ??= [];
  window.dataLayer.push(args);
}

/** A page view, sent manually: the App Router does not reload between routes. */
export function trackPageView(path: string): void {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined") return;
  gtag("config", GA_MEASUREMENT_ID, { page_path: path });
}

/**
 * The conversions the brief actually asks about: which marketing produces
 * customers. Phone clicks, bookings and quote requests — not scroll depth.
 *
 * Safe to call unconditionally. With no measurement ID, or before consent,
 * `window.gtag` is undefined and this is a no-op, so call sites never need to
 * ask whether analytics is on.
 */
export type ConversionEvent =
  | "phone_click"
  | "booking_submitted"
  | "quote_submitted"
  | "review_submitted";

export function trackConversion(
  event: ConversionEvent,
  detail: Record<string, string | number> = {},
): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", event, detail);
}

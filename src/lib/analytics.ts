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

/**
 * Google Tag Manager container (Nov 2026, `GTM-PBFCRC7F` in production). Held
 * to exactly the same two switches as GA above: unset, nothing loads; set, it
 * still waits for the visitor to accept analytics. Tags added inside the
 * container later inherit that gate, because the container itself is never
 * fetched without consent — so the promise on the privacy page holds whatever
 * someone configures in the GTM web UI.
 */
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID?.trim() || null;

export const analyticsConfigured = Boolean(GA_MEASUREMENT_ID || GTM_ID);

/** Set by `<Analytics>` while the container is mounted (consent given). */
let gtmActive = false;
export function setGtmActive(active: boolean): void {
  gtmActive = active;
}

/** GTM listens on the dataLayer for objects with an `event` key. */
function pushToGtm(event: string, detail: Record<string, unknown>): void {
  if (!gtmActive || typeof window === "undefined") return;
  window.dataLayer ??= [];
  window.dataLayer.push({ event, ...detail });
}

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
  if (typeof window === "undefined") return;
  if (GA_MEASUREMENT_ID) gtag("config", GA_MEASUREMENT_ID, { page_path: path });
  // Pushed on the first page and on every route change, because the App
  // Router never reloads. In the container, trigger page tags on this
  // `page_view` event rather than on "All Pages" (`gtm.js`), which fires only
  // once per visit here — using both counts the landing page twice.
  pushToGtm("page_view", { page_path: path });
}

/**
 * The conversions the brief actually asks about: which marketing produces
 * customers. Phone clicks, bookings and quote requests — not scroll depth.
 *
 * Safe to call unconditionally. With no measurement ID or container, or before
 * consent, `window.gtag` is undefined and GTM is inactive, so this is a no-op, so call sites never need to
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
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") window.gtag("event", event, detail);
  pushToGtm(event, detail);
}

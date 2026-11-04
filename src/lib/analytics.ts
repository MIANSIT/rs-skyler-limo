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
 * Google Tag Manager container. Hard-coded, at the client's request (Nov
 * 2026), and loaded in the `<head>` of every page by the root layout as two
 * plain tags — the `gtm.js` script and the inline snippet below — so it is in
 * the page source, and it is **not gated on the cookie banner**: the container
 * loads, and page views and conversions reach the dataLayer, whether or not the
 * visitor has answered. No Consent Mode default is set, so Google tags run
 * normally from the first page. A visitor who declines in the banner is sent as
 * `analytics_storage: 'denied'` (see `setAnalyticsConsent`), which Google tags
 * honour from then on.
 *
 * If the container holds a GA4 tag for the same property, leave
 * `NEXT_PUBLIC_GA_MEASUREMENT_ID` unset, or every page view is counted twice.
 */
export const GTM_ID = "GTM-PBFCRC7F";

export const GTM_SRC = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;

export const analyticsConfigured = Boolean(GA_MEASUREMENT_ID || GTM_ID);

/**
 * The inline half of the snippet. `gtm.start` / `gtm.js` is the event GTM's
 * "All Pages" trigger listens for; without it the container loads but nothing
 * on a page-view trigger fires.
 */
export const gtmInlineScript = `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });`;

/** Set by `<Analytics>` from the banner's decision. Gates the standalone GA4
 *  tag only — GTM is not gated on it. */
let consentGranted = false;

/** Tells Consent Mode, and this module, what the visitor chose. */
export function setAnalyticsConsent(granted: boolean): void {
  consentGranted = granted;
  gtag("consent", "update", { analytics_storage: granted ? "granted" : "denied" });
}

/** GTM listens on the dataLayer for objects with an `event` key. */
function pushToGtm(event: string, detail: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
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

/**
 * Through the `window.gtag` the head script defines, which pushes an
 * `arguments` object: Google only treats those as commands, and silently
 * ignores a plain array pushed onto the dataLayer.
 */
function gtag(...args: GtagArgs): void {
  if (typeof window === "undefined") return;
  window.gtag?.(...args);
}

/** A page view, sent manually: the App Router does not reload between routes. */
export function trackPageView(path: string): void {
  if (typeof window === "undefined") return;
  if (GA_MEASUREMENT_ID && consentGranted) gtag("config", GA_MEASUREMENT_ID, { page_path: path });
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
 * Safe to call unconditionally. It always reaches GTM; the standalone GA4 tag
 * only sees it after consent.
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

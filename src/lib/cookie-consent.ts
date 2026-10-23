/**
 * A small, honest cookie-consent store.
 *
 * The site sets no analytics or advertising cookies today — see the Privacy
 * Policy's "Cookies" section. This exists so that changes, whenever they
 * arrive, only run after a visitor has actually said yes. Any future
 * analytics bootstrap (Search Console / Analytics, task T32) should check
 * `hasAnalyticsConsent()` before loading anything, rather than assuming
 * consent because a cookie was accepted for some other reason.
 *
 * `localStorage`, not a cookie: the choice only needs to be remembered on this
 * device, and nothing server-side needs to read it.
 */

const STORAGE_KEY = "rsskyler-cookie-consent";

export type CookieConsent = {
  analytics: boolean;
  decidedAt: string;
};

function parse(raw: string | null): CookieConsent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (typeof parsed.analytics !== "boolean" || typeof parsed.decidedAt !== "string") {
      return null;
    }
    return { analytics: parsed.analytics, decidedAt: parsed.decidedAt };
  } catch {
    return null;
  }
}

// `useSyncExternalStore`'s snapshot must return the same reference until the
// underlying value actually changes, or React re-renders forever. `today`
// solves the identical problem for the New York clock in
// `use-new-york-clock.ts` — this mirrors that pattern rather than deriving
// state from `localStorage` inside an effect, which is a hydration-mismatch
// footgun `react-hooks/set-state-in-effect` correctly refuses to allow.
let cachedRaw: string | null = null;
let cachedValue: CookieConsent | null = null;

/**
 * The decision for this page view, held in memory.
 *
 * This is the source of truth, and `localStorage` is only how it survives to
 * the next visit. The banner's visibility is derived from the snapshot below,
 * so when storage is unavailable — Safari with "Block all cookies", a private
 * window, an Instagram or TikTok in-app webview — a write that silently failed
 * used to leave the snapshot `null` and **the banner could never be
 * dismissed**. Tapping Accept did nothing at all, with no error to show for
 * it. Remembering the answer here means the banner always closes; on those
 * devices it simply asks again next visit, which is what the comment in
 * `setStoredConsent` always claimed happened.
 */
let memoryValue: CookieConsent | null = null;

/** The client snapshot for `useSyncExternalStore`. */
export function getConsentSnapshot(): CookieConsent | null {
  if (typeof window === "undefined") return null;

  // A decision made in this page view wins: it is the most recent, and it is
  // the only one that exists when storage is blocked.
  if (memoryValue) return memoryValue;

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }

  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parse(raw);
  }
  return cachedValue;
}

/** The server snapshot: nothing is known yet, which is honestly true. */
export function getServerConsentSnapshot(): CookieConsent | null {
  return null;
}

const listeners = new Set<() => void>();

/** For `useSyncExternalStore`'s subscribe argument. */
export function subscribeConsent(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setStoredConsent(consent: CookieConsent): void {
  if (typeof window === "undefined") return;

  // Memory first, and unconditionally. Persisting is best-effort; recording
  // the answer is not, because the banner closes on the back of it.
  memoryValue = consent;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // Private browsing / blocked storage: the choice holds for this visit and
    // the banner reappears on the next one, which is the safe way to fail.
  }
  for (const listener of listeners) listener();
}

/** What a future analytics loader should check before it runs. */
export function hasAnalyticsConsent(): boolean {
  return getConsentSnapshot()?.analytics === true;
}

/** The event the footer's "Cookie preferences" link dispatches to reopen the
 *  manage panel after a visitor has already decided once. */
export const OPEN_COOKIE_PREFERENCES_EVENT = "rsskyler:open-cookie-preferences";

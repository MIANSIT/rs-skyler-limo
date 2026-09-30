"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  OPEN_COOKIE_PREFERENCES_EVENT,
  getConsentSnapshot,
  getServerConsentSnapshot,
  setStoredConsent,
  subscribeConsent,
} from "@/lib/cookie-consent";

/**
 * Sits inside the footer, so it renders wherever `SiteFooter` does without the
 * footer itself needing to become a client component. Dispatches a DOM event
 * rather than reaching for context — the banner and this link never need to
 * exist on the page at the same time, so there is nothing to share state
 * through beyond "please reopen".
 */
export function CookiePreferencesLink({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_PREFERENCES_EVENT))}
      className={className}
    >
      Cookie preferences
    </button>
  );
}

const HIDDEN_ON = ["/book"];

/**
 * A banner, not a blocking modal: nothing on this site depends on a cookie
 * choice being made first, so there is nothing to gate behind it. It offers
 * accept, reject and a two-item manage panel, and stays hidden on `/book`
 * where `MobileActionBar` already argues for every pixel of a small screen.
 *
 * Visibility is derived from the stored consent via `useSyncExternalStore`
 * (see `cookie-consent.ts`) rather than set from an effect on mount — the
 * server genuinely does not know a visitor's choice, and this is the pattern
 * `useNewYorkClock` already uses for the same server/client gap.
 */
export function CookieConsentBanner() {
  const pathname = usePathname();
  const consent = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getServerConsentSnapshot,
  );
  const [reopened, setReopened] = useState(false);
  const [manage, setManage] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  // A response to a click on the footer's "Cookie preferences" link, not a
  // derived initial value — exactly the subscribe-to-an-external-system case
  // the lint rule expects an effect for.
  useEffect(() => {
    const reopen = () => {
      setAnalytics(getConsentSnapshot()?.analytics ?? false);
      setManage(true);
      setReopened(true);
    };
    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, reopen);
  }, []);

  const visible = reopened || consent === null;
  if (!visible) return null;
  if (HIDDEN_ON.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return null;
  }

  const decide = (nextAnalytics: boolean) => {
    setStoredConsent({ analytics: nextAnalytics, decidedAt: new Date().toISOString() });
    setReopened(false);
    setManage(false);
  };

  return (
    <div
      role="region"
      aria-label="Cookie preferences"
      /* Above the mobile action bar's height on small screens, flush to the
         bottom where that bar does not exist. Matches its own spacer math in
         `mobile-action-bar.tsx`. */
      className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-50 border-t border-midnight/10 bg-white px-4 py-5 shadow-[0_-8px_24px_rgba(11,33,66,0.10)] md:bottom-0 md:px-6 md:py-6"
    >
      <div className="mx-auto w-full max-w-6xl">
        {!manage ? (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="max-w-2xl text-[14px] leading-[1.6] text-charcoal">
              This site does not use tracking or advertising cookies. We may use
              analytics to see how the site is used, only if you allow it.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setManage(true)}
                className="font-sans text-[14px] text-midnight underline-offset-4 hover:underline"
              >
                Manage
              </button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => decide(false)}
                className="text-[14px]"
              >
                Reject non-essential
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => decide(true)}
                className="text-[14px]"
              >
                Accept all
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="font-sans text-[15px] font-semibold text-midnight">
                Cookie preferences
              </p>
              <div className="mt-3 flex flex-col gap-3">
                <label className="flex items-start gap-3 text-[14px] leading-[1.6] text-charcoal">
                  <input
                    type="checkbox"
                    checked
                    disabled
                    className="mt-1 h-4 w-4 shrink-0"
                    aria-label="Essential cookies (always on)"
                  />
                  <span>
                    <strong className="text-midnight">Essential</strong> — required
                    to run the site. Always on.
                  </span>
                </label>
                <label className="flex items-start gap-3 text-[14px] leading-[1.6] text-charcoal">
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={(event) => setAnalytics(event.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0"
                  />
                  <span>
                    <strong className="text-midnight">Analytics</strong> — helps us
                    see which pages are useful. Off unless you turn it on.
                  </span>
                </label>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setManage(false)}
                className="font-sans text-[14px] text-midnight underline-offset-4 hover:underline"
              >
                Back
              </button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => decide(analytics)}
                className="text-[14px]"
              >
                Save preferences
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

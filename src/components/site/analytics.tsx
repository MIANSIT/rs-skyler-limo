"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import {
  GA_MEASUREMENT_ID,
  setAnalyticsConsent,
  trackConversion,
  trackPageView,
} from "@/lib/analytics";
import {
  getConsentSnapshot,
  getServerConsentSnapshot,
  subscribeConsent,
} from "@/lib/cookie-consent";

/**
 * Applies the visitor's analytics choice, and loads Google Analytics once they
 * have said yes.
 *
 * Google Tag Manager is not loaded here: it is in the `<head>` of every page
 * (root layout), in Consent Mode with analytics denied. This component turns
 * that into `granted` when the banner is accepted, and back when it is
 * withdrawn from Cookie Preferences.
 *
 * Consent is read through `useSyncExternalStore` rather than an effect, so a
 * visitor who accepts gets analytics on the same interaction instead of on
 * their next navigation, with no hydration mismatch.
 */
export function Analytics() {
  const consent = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getServerConsentSnapshot,
  );

  const consented = consent?.analytics === true;
  const gaAllowed = Boolean(GA_MEASUREMENT_ID) && consented;

  return (
    <>
      {/* Before `PageViews`: sibling effects run in order, so consent is
          applied before the first page view is sent. */}
      <ConsentSync granted={consented} />

      {gaAllowed ? (
        <>
          <Script
            id="ga-src"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`gtag('config', '${GA_MEASUREMENT_ID}', { anonymize_ip: true });`}
          </Script>
        </>
      ) : null}

      {consented ? <PageViews /> : null}
      {consented ? <PhoneClicks /> : null}
    </>
  );
}

function ConsentSync({ granted }: { granted: boolean }) {
  useEffect(() => {
    setAnalyticsConsent(granted);
  }, [granted]);

  return null;
}

/** The App Router never reloads, so each navigation is reported by hand. */
function PageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    trackPageView(query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams]);

  return null;
}

/**
 * Phone clicks, caught once at the document rather than wired into each of the
 * dozen `tel:` links across the header, footer, hero and every page's closing
 * call to action. A new phone link anywhere is counted without being told to.
 */
function PhoneClicks() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const link = (event.target as Element | null)?.closest?.('a[href^="tel:"]');
      if (!link) return;
      trackConversion("phone_click", {
        page: window.location.pathname,
      });
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}

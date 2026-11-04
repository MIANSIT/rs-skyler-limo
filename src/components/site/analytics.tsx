"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import {
  GA_MEASUREMENT_ID,
  GTM_ID,
  trackConversion,
  trackPageView,
} from "@/lib/analytics";
import {
  getConsentSnapshot,
  getServerConsentSnapshot,
  subscribeConsent,
} from "@/lib/cookie-consent";

/**
 * Loads Google Analytics, but only after the visitor has said yes.
 *
 * Mounted on every page; renders nothing until both switches are on. The
 * script tag itself is conditional rather than loaded-then-disabled, so a
 * visitor who declines never makes a request to Google at all — "we run no
 * advertising trackers" on the privacy page stays literally true for them.
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
  const gaAllowed = consented && Boolean(GA_MEASUREMENT_ID);
  const gtmAllowed = consented && Boolean(GTM_ID);
  const allowed = gaAllowed || gtmAllowed;

  return (
    <>
      {allowed ? (
        <Script id="ga-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());${
            gaAllowed
              ? `\ngtag('config', '${GA_MEASUREMENT_ID}', { anonymize_ip: true });`
              : ""
          }${
            gtmAllowed
              ? `\ndataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });`
              : ""
          }`}
        </Script>
      ) : null}
      {gaAllowed ? (
        <Script
          id="ga-src"
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        />
      ) : null}
      {/* No `<noscript>` iframe: without JavaScript there is no consent to
          read, so loading the container there would track people who never
          said yes. */}
      {gtmAllowed ? (
        <Script
          id="gtm-src"
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`}
        />
      ) : null}

      {allowed ? <PageViews /> : null}
      {allowed ? <PhoneClicks /> : null}
    </>
  );
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

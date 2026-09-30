import { CookieConsentBanner } from "@/components/site/cookie-consent";
import { MobileActionBar } from "@/components/site/mobile-action-bar";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { contact } from "@/lib/content";

/**
 * The inbox the mobile bar's Email button writes to. Server-only, read here
 * and passed down, so it never needs a NEXT_PUBLIC_ prefix. Falls back to the
 * address in `content.ts` when unset.
 */
const supportEmail = process.env.SUPPORT_EMAIL?.trim() || contact.email;

/** The public-facing chrome. Everything a customer sees sits inside this. */
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {/* First thing a keyboard reaches: jumps past the header's nine stops.
          Hidden until focused, then shown as a gold-on-midnight button — the
          one ground where gold may carry text. */}
      <a
        href="#main"
        className="sr-only z-60 rounded-sm bg-midnight px-4 py-3 font-sans text-[15px] font-semibold text-gold focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <SiteHeader />
      {/* tabIndex -1 so the skip link moves keyboard focus here, not just the
          scroll position; scroll-mt clears the sticky header. */}
      <main id="main" tabIndex={-1} className="flex-1 scroll-mt-24 focus:outline-none">
        {children}
      </main>
      <SiteFooter />
      <MobileActionBar email={supportEmail} />
      <CookieConsentBanner />
    </>
  );
}

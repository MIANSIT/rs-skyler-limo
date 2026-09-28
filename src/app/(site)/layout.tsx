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
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <MobileActionBar email={supportEmail} />
      <CookieConsentBanner />
    </>
  );
}

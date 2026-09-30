import { LocalBusinessSchema } from "@/components/site/local-business-schema";
import { MobileActionBar } from "@/components/site/mobile-action-bar";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

/** The public-facing chrome. Everything a customer sees sits inside this. */
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {/* Emitted on every public page, not just the homepage. The node carries
          a stable `@id`, so repeating it describes one business many times
          rather than many businesses — and whichever page a search engine
          happens to crawl first still identifies the entity. It sits inside
          this layout and not the root one so it never reaches the dashboard. */}
      <LocalBusinessSchema />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <MobileActionBar />
    </>
  );
}

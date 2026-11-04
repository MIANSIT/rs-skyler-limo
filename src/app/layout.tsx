import type { Metadata } from "next";
import { Fraunces, Public_Sans } from "next/font/google";

import { GTM_SRC, gtmInlineScript } from "@/lib/analytics";
import { siteDescription, siteUrl } from "@/lib/site";

import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--font-fraunces",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-public-sans",
});

export const metadata: Metadata = {
  /* `www` is the canonical host and the apex 301s to it, so every absolute URL
     Next derives from this — Open Graph, canonicals, the sitemap — has to name
     `www` too. Pointing it at the apex made each one a redirect. */
  metadataBase: new URL(siteUrl),
  title: {
    default: "RSSkyler Limo — Premium Chauffeur Service in New York City",
    template: "%s · RSSkyler Limo",
  },
  /* This is the line Google prints under the result, so it has to be true.
     Shared with the LocalBusiness node — see the note in `src/lib/site.ts`. */
  description: siteDescription,
  openGraph: {
    title: "RSSkyler Limo — Arrive in Style",
    description:
      "New York City's accessible-luxury chauffeur service. Book a car in under a minute.",
    siteName: "RSSkyler Limo",
    locale: "en_US",
    type: "website",
  },
};

/**
 * Document shell only: fonts, tokens and default metadata.
 *
 * The marketing chrome lives in `(site)/layout.tsx` and the dashboard chrome in
 * `admin/(shell)/layout.tsx`. Putting the header and footer here would render
 * the public navigation over the operator's dashboard, and nest one `<main>`
 * inside another.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // `data-scroll-behavior` tells Next the smooth scrolling in globals.css is
    // deliberate, so it switches it off during route changes (a new page
    // starts at the top instantly instead of gliding there).
    <html
      lang="en"
      className={`${fraunces.variable} ${publicSans.variable}`}
      data-scroll-behavior="smooth"
    >
      {/* Google Tag Manager, on every page, in the server-rendered <head> —
          plain tags rather than next/script, whose `beforeInteractive` is
          queued in <body> and only moved here once the runtime boots, which
          tag checkers reading the page source cannot see. Not gated on the
          cookie banner; see `GTM_ID` in `src/lib/analytics.ts`. */}
      <head>
        <script async src={GTM_SRC} />
        <script
          id="gtm-init"
          dangerouslySetInnerHTML={{ __html: gtmInlineScript }}
        />
      </head>
      <body className="flex min-h-screen flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

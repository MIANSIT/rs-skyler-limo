import type { Metadata } from "next";
import { Fraunces, Public_Sans } from "next/font/google";

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
  title: {
    default: "Reservations · RSSkylerLimo",
    template: "%s · RSSkylerLimo",
  },
  // Belt and braces with `robots.ts`: this host holds customer names, phone
  // numbers and home addresses and must never be indexed.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Document shell only. The signed-in chrome lives in `(shell)/layout.tsx` so
 * `/login` — which by definition has no session — does not render a nav that
 * would try to read one.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${publicSans.variable}`}>
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  );
}

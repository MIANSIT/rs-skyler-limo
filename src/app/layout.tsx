import type { Metadata } from "next";
import { Fraunces, Public_Sans } from "next/font/google";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

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
  metadataBase: new URL("https://rsskylerlimo.com"),
  title: {
    default: "RSSkyler Limo — Premium Chauffeur Service in New York City",
    template: "%s · RSSkyler Limo",
  },
  description:
    "Private, punctual chauffeured travel across all five boroughs. Flight-tracked airport transfers, hourly charters, corporate accounts, weddings and events.",
  openGraph: {
    title: "RSSkyler Limo — Arrive in Style",
    description:
      "New York City's accessible-luxury chauffeur service. Book a car in under a minute.",
    siteName: "RSSkyler Limo",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${publicSans.variable}`}>
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

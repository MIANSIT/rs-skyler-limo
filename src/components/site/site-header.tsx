"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Logo } from "@/components/brand/logo";
import { ButtonLinkOnDark } from "@/components/ui/button";
import { clsx } from "@/lib/clsx";
import { contact, nav } from "@/lib/content";

/**
 * Consistent chrome, per Chapter 7: midnight header on every screen, with gold
 * reserved for the single primary action.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-midnight">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" aria-label="RSSkyler Limo — home">
          <Logo tone="dark" priority />
        </Link>

        {/* Desktop nav from `lg`, not `md`. The lockup, four links at 15px and
            the CTA need about 900px; between 768 and 900 the links wrapped to
            two lines and collided with the wordmark. */}
        <nav className="hidden items-center gap-8 lg:flex">
          {nav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "font-sans text-[15px] transition-colors",
                  active ? "text-gold" : "text-white/80 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* The phone number is a header requirement and was missing entirely.
            It sits beside the CTA on desktop and is the first item in the
            mobile panel, since a phone is where most of these calls start.

            Outlined rather than gold: the chrome persists on every screen, and
            the gold action belongs to the page the client is actually on. */}
        <div className="hidden items-center gap-6 lg:flex">
          <a
            href={contact.phoneHref}
            className="font-sans text-[15px] font-medium text-white underline-offset-4 tabular-nums transition-colors hover:text-gold hover:underline"
          >
            {contact.phone}
          </a>
          <ButtonLinkOnDark href="/#book">Book a car</ButtonLinkOnDark>
        </div>

        {/* Below `lg` the number collapses to an icon so it survives beside the
            lockup on a 360px screen without the menu having to be opened. */}
        <a
          href={contact.phoneHref}
          aria-label={`Call RSSkyler Limo on ${contact.phone}`}
          className="ml-auto p-2 text-white lg:hidden"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24c1.1.37 2.3.57 3.5.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.2.2 2.4.57 3.5a1 1 0 0 1-.25 1z" />
          </svg>
        </a>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="-mr-2 p-2 text-white lg:hidden"
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            aria-hidden
          >
            {open ? (
              <path d="m6 6 12 12M18 6 6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          className="border-t border-white/10 px-6 pt-4 pb-6 lg:hidden"
        >
          <ul className="flex flex-col">
            {nav.map((item) => (
              <li key={item.href} className="border-b border-white/10">
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 font-sans text-white/85 hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <a
            href={contact.phoneHref}
            onClick={() => setOpen(false)}
            className="mt-6 flex items-center justify-between border-b border-white/10 pb-3 font-sans text-white"
          >
            <span className="text-[13px] tracking-[0.12em] text-white/55 uppercase">
              Call us
            </span>
            <span className="text-[15px] font-medium tabular-nums">
              {contact.phone}
            </span>
          </a>

          <ButtonLinkOnDark
            href="/#book"
            className="mt-6 w-full"
            onClick={() => setOpen(false)}
          >
            Book a car
          </ButtonLinkOnDark>
        </nav>
      ) : null}
    </header>
  );
}

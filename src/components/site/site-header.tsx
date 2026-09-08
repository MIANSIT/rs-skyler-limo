"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Logo } from "@/components/brand/logo";
import { ButtonLinkOnDark } from "@/components/ui/button";
import { clsx } from "@/lib/clsx";
import { nav } from "@/lib/content";

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

        <nav className="hidden items-center gap-8 md:flex">
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

        {/* Outlined rather than gold: the chrome persists on every screen, and
            the gold action belongs to the page the client is actually on. */}
        <div className="hidden md:block">
          <ButtonLinkOnDark href="/#book">Book a car</ButtonLinkOnDark>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="-mr-2 p-2 text-white md:hidden"
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
          className="border-t border-white/10 px-6 pt-4 pb-6 md:hidden"
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

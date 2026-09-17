"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Logo } from "@/components/brand/logo";
import { ButtonLinkOnDark } from "@/components/ui/button";
import { clsx } from "@/lib/clsx";
import { contact, nav } from "@/lib/content";

/**
 * Consistent chrome, per Chapter 7: midnight header on every screen, with gold
 * reserved for the single primary action.
 *
 * Three zones on one row that never wraps — lockup, navigation, actions — each
 * `shrink-0` so nothing is squeezed into a second line. The bar broke badly
 * before: at 1024px the wordmark overlapped the first link and four items wrapped,
 * because five links plus a phone number plus a button need about 1010px and the
 * content column at that width is 976px. The density now steps up with the
 * viewport rather than assuming the widest case fits everywhere.
 */
export function SiteHeader() {
  const pathname = usePathname();

  /**
   * The route the menu was opened on, rather than a boolean.
   *
   * A route change then closes the panel for free — including a back or forward
   * gesture, which no link handler sees. The obvious alternative, resetting a
   * boolean from an effect keyed on the pathname, sets state synchronously
   * during an effect and triggers a cascading render; the lint rule that
   * forbids it is right.
   */
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const setOpen = (next: boolean) => setOpenFor(next ? pathname : null);

  // A fixed-position panel over a scrollable body scrolls the page behind it.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 bg-midnight">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 xl:gap-6 xl:px-8">
        <Link
          href="/"
          aria-label="RSSkyler Limo — home"
          /* `flex` on the anchor itself: see the note in `Logo`. A block anchor
             would reintroduce the line box that knocked the lockup 4px out of
             alignment with the navigation. */
          className="flex shrink-0 items-center"
        >
          <Logo tone="dark" priority />
        </Link>

        {/*
          The horizontal menu appears at `xl`, not `lg`.

          Five links, a phone number and a button need roughly 980px of a bar
          that also carries the lockup. At 1024 that fit only by abbreviating
          every label and hiding the number, which is a menu pretending to fit.
          Below 1280 the burger does the job properly and shows the full
          wording — a laptop gets the same complete menu a phone does.
        */}
        {/* One gap at every desktop width. The container caps at 1152px, so a
            wider gap on a wider screen only eats the margin beside the phone —
            1920 ended up looking tighter than 1440. */}
        <nav className="hidden items-center gap-6 xl:flex">
          {nav.map((item) => {
            // No entry points at the site root, so a prefix match is enough.
            const active = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "font-sans text-[15px] whitespace-nowrap transition-colors",
                  active ? "text-gold" : "text-white/80 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2 xl:gap-4">
          {/*
            One phone control at every width, rather than two that must be kept
            in step. Below xl it is the icon — enough room for the nav — and from
            xl the number itself. Calling is never more than one tap, and never
            requires opening the menu.
          */}
          <a
            href={contact.phoneHref}
            aria-label={`Call RSSkyler Limo on ${contact.phone}`}
            className="flex items-center gap-2 rounded-sm p-2 font-sans text-[15px] font-medium text-white transition-colors hover:text-gold xl:px-1"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 xl:hidden"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24c1.1.37 2.3.57 3.5.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.2.2 2.4.57 3.5a1 1 0 0 1-.25 1z" />
            </svg>
            <span className="hidden tabular-nums xl:inline">{contact.phone}</span>
          </a>

          {/*
            Hidden by a wrapper, not by a class on the button.

            `clsx` here is a plain join, not tailwind-merge, so `hidden` passed
            to `ButtonLinkOnDark` lands alongside the `inline-flex` in its base
            class. Both are display utilities of equal specificity, `inline-flex`
            wins on stylesheet order, and the button renders on phones — which
            it did, pushing 117px of overflow onto a 320px screen.

            Outlined rather than gold: the chrome persists on every screen, and
            the gold action belongs to the page the client is actually on.
          */}
          <span className="hidden xl:block">
            <ButtonLinkOnDark href="/#book">Book a car</ButtonLinkOnDark>
          </span>

          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="-mr-1 p-2 text-white xl:hidden"
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
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          /* Capped and scrollable: on a landscape phone the panel is taller than
             the viewport, and without this the last links and the CTA are
             unreachable. */
          className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-white/10 px-4 pt-3 pb-6 sm:px-6 xl:hidden"
        >
          <ul className="flex flex-col">
            {nav.map((item) => (
              <li key={item.href} className="border-b border-white/10">
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block py-3.5 font-sans text-white/85 hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <a
            href={contact.phoneHref}
            onClick={() => setOpen(false)}
            className="mt-5 flex items-center justify-between gap-4 border-b border-white/10 pb-3.5 font-sans text-white"
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
            className="mt-5 w-full"
            onClick={() => setOpen(false)}
          >
            Book a car
          </ButtonLinkOnDark>
        </nav>
      ) : null}
    </header>
  );
}

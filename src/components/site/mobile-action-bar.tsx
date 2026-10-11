"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { bookingSheet, useBookingSheet } from "@/lib/public/booking-sheet";

/**
 * A fixed EMAIL / BOOK bar for phones. Email rather than Call at the client's
 * request (Sept 2026): they would rather a request arrive in writing. There is
 * no phone number anywhere on the site (removed Oct 2026).
 *
 * Neither button is gold. Gold is one action per view and belongs to the page
 * the customer is on, exactly as the outlined header CTA already does; a bar
 * that persists on every screen would otherwise put a second gold action on
 * all of them. Email is outlined on midnight, Book is white with midnight text.
 *
 * It renders only below `md`. On the booking page itself the bar is hidden:
 * the form is the action there.
 *
 * Email opens a new message with the subject "Query", addressed to
 * `SUPPORT_EMAIL` from `.env.local` (passed down by the layout, so the
 * address can change without a code edit). Book opens the booking sheet when
 * the page has one — the homepage, where the hero card is hidden on phones —
 * and goes to `/book` everywhere else.
 */

const HIDDEN_ON = ["/book"];

const buttonBase =
  "flex min-h-12 flex-1 items-center justify-center gap-2 rounded-sm px-3 font-sans text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

function EmailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="1" />
      <path d="m3.5 6 8.5 7 8.5-7" />
    </svg>
  );
}

export function MobileActionBar({ email }: { email: string }) {
  const pathname = usePathname();
  const sheet = useBookingSheet();
  const bookClass = `${buttonBase} bg-white text-midnight hover:bg-grey`;

  if (HIDDEN_ON.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return null;
  }

  return (
    <>
      {/* Reserves the bar's height at the end of the page so it never covers
          the footer's last line. Same height as the bar, plus the notch inset. */}
      <div
        aria-hidden
        className="h-[calc(4.5rem+env(safe-area-inset-bottom,0px))] bg-midnight md:hidden"
      />

      <nav
        aria-label="Quick actions"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-midnight px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:hidden"
      >
        <div className="mx-auto flex max-w-md gap-3">
          <a
            href={`mailto:${email}?subject=${encodeURIComponent("Query")}`}
            className={`${buttonBase} border border-white/40 text-white hover:border-white hover:bg-white/10`}
          >
            <EmailIcon />
            Email
          </a>

          {sheet.available ? (
            <button
              type="button"
              onClick={bookingSheet.open}
              aria-haspopup="dialog"
              aria-expanded={sheet.open}
              className={bookClass}
            >
              Book
            </button>
          ) : (
            <Link href="/book" className={bookClass}>
              Book
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}

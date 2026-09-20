"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { contact } from "@/lib/content";

/**
 * A fixed CALL / BOOK bar for phones, with TEXT added only when the business
 * has said it reads texts.
 *
 * The brief is explicit that a text line must not be offered unless someone is
 * monitoring it, so TEXT is behind `contact.smsEnabled` (off today). Flip that
 * one flag in `content.ts` and the third button appears, with no other change.
 *
 * Neither button is gold. Gold is one action per view and belongs to the page
 * the customer is on, exactly as the outlined header CTA already does; a bar
 * that persists on every screen would otherwise put a second gold action on
 * all of them. Call is outlined on midnight, Book is white with midnight text.
 *
 * It renders only below `md`, where the header's phone icon is the sole other
 * way to call. On the booking page itself the bar is hidden: the form is the
 * action there.
 */

const HIDDEN_ON = ["/book"];

const buttonBase =
  "flex min-h-12 flex-1 items-center justify-center gap-2 rounded-sm px-3 font-sans text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

function CallIcon() {
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
      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24c1.1.37 2.3.57 3.5.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.2.2 2.4.57 3.5a1 1 0 0 1-.25 1z" />
    </svg>
  );
}

function TextIcon() {
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
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
    </svg>
  );
}

export function MobileActionBar() {
  const pathname = usePathname();

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
            href={contact.phoneHref}
            className={`${buttonBase} border border-white/40 text-white hover:border-white hover:bg-white/10`}
          >
            <CallIcon />
            Call
          </a>

          {contact.smsEnabled ? (
            <a
              href={contact.smsHref}
              className={`${buttonBase} border border-white/40 text-white hover:border-white hover:bg-white/10`}
            >
              <TextIcon />
              Text
            </a>
          ) : null}

          <Link
            href="/book"
            className={`${buttonBase} bg-white text-midnight hover:bg-grey`}
          >
            Book
          </Link>
        </div>
      </nav>
    </>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { HeroBookingCard } from "@/components/site/hero-booking-card";
import type { FleetVehicle } from "@/lib/api/types";
import { clsx } from "@/lib/clsx";
import { bookingSheet, useBookingSheet } from "@/lib/public/booking-sheet";

/**
 * The hero's booking card as a bottom sheet, for phones only.
 *
 * Below `md` the card is taken out of the hero — the client wanted the hero
 * copy on its own there — and this is how a customer reaches it: the Book
 * button in `MobileActionBar` slides it up. Same card, same behaviour, so
 * nothing about booking differs between a phone and a laptop.
 *
 * Stays mounted so the slide can run in both directions; `inert` keeps it out
 * of the tab order and away from screen readers while it is closed.
 */
export function BookingSheet({ fleet }: { fleet: FleetVehicle[] }) {
  const { open } = useBookingSheet();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => bookingSheet.register(), []);

  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") bookingSheet.close();
    };
    // The page behind should not scroll while the sheet is up.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Past `md` the bar and this sheet are gone; do not leave the page locked
  // if the window is widened with the sheet open.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const onChange = () => query.matches && bookingSheet.close();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return (
    <div
      className={clsx("fixed inset-0 z-50 md:hidden", !open && "pointer-events-none")}
      inert={!open}
    >
      <div
        aria-hidden
        onClick={bookingSheet.close}
        className={clsx(
          "absolute inset-0 bg-midnight-deep/70 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Book a car"
        className={clsx(
          "absolute inset-x-0 bottom-0 max-h-[90svh] overflow-y-auto rounded-t-2xl border-t border-white/15 bg-midnight px-4 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.7)] transition-transform duration-300 ease-out motion-reduce:transition-none",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="flex items-center justify-between pb-3">
          <span aria-hidden className="mx-auto h-1 w-10 rounded-full bg-white/25" />
        </div>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-[20px] font-semibold text-white">Book a car</p>
          <button
            ref={closeRef}
            type="button"
            onClick={bookingSheet.close}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-gold"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <HeroBookingCard fleet={fleet} />

        <Link
          href="/quote"
          onClick={bookingSheet.close}
          className="mt-4 inline-block font-sans text-[14px] text-white/80 underline-offset-4 hover:text-white hover:underline"
        >
          Wedding, event or corporate account? Request a quote
        </Link>
      </div>
    </div>
  );
}

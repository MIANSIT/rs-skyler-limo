import type { Metadata } from "next";

import { Reveal } from "@/components/motion/reveal";
import { BookingForm } from "@/components/site/booking-form";
import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/ui/section";
import { getBookingOptionsSafely, getFleetSafely } from "@/lib/public/fleet";
import { tripTypes } from "@/lib/public/trip-types";

export const metadata: Metadata = {
  title: "Book a Car",
  description:
    "Airport transfers, point-to-point rides and hourly charters across New York City. Fixed fares within New York City, published before you book.",
};

/**
 * The full booking form, on its own page.
 *
 * The only place the form lives. The homepage hero shows a booking card
 * instead (`HeroBookingCard` in `hero-booking-card.tsx`) — trip type and a
 * vehicle, chosen there, arrive here as `?trip=` and `?vehicle=`.
 */
export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [fleet, bookingOptions, query] = await Promise.all([
    getFleetSafely(),
    getBookingOptionsSafely(),
    searchParams,
  ]);

  // Set by the homepage hero's booking card. Anything unrecognised falls back
  // to the form's own defaults rather than erroring.
  const trip = tripTypes.find((option) => option.value === query.trip)?.value;
  const vehicle = typeof query.vehicle === "string" ? query.vehicle : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Book a car"
        title="A fare and a confirmed pickup in under a minute"
        intro="Airport, point to point or hourly. Fixed fares within New York City are shown before you book — everything else is priced by a person, usually within the hour."
      />

      {/*
        Dark, like the homepage: the deep-midnight ground, the same slow gold
        wash the hero uses, and the form as the hero's glass card. The trip
        summary beside it fills in as the customer chooses.
      */}
      <Section tone="deep" className="relative overflow-clip">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-1/4 -right-1/4 h-[90%] w-[70%] rounded-full bg-[radial-gradient(closest-side,rgba(212,160,23,0.10),transparent)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-1/3 -left-1/4 h-[80%] w-[60%] rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.05),transparent)]"
        />
        <Reveal className="relative">
          <div data-reveal>
            <BookingForm
              fleet={fleet}
              options={bookingOptions}
              initialTrip={trip}
              initialVehicle={vehicle}
              tone="dark"
              withSummary
            />
          </div>
        </Reveal>
      </Section>
    </>
  );
}

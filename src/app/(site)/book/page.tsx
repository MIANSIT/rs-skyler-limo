import type { Metadata } from "next";

import { Reveal } from "@/components/motion/reveal";
import { BookingForm } from "@/components/site/booking-form";
import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/ui/section";
import { getBookingOptionsSafely, getFleetSafely } from "@/lib/public/fleet";

export const metadata: Metadata = {
  title: "Book a Car",
  description:
    "Airport transfers, point-to-point rides and hourly charters across New York City. Fixed fares within the five boroughs, published before you book.",
};

/**
 * The full booking form, on its own page.
 *
 * The homepage hero keeps this form inline only from `lg` up, where it sits
 * beside the copy rather than dominating a stacked mobile section — see the
 * `data-hero-card` block in `hero.tsx`. Below `lg` the hero shows a "Get a
 * quote" CTA that lands here instead, so a phone never has to scroll a
 * multi-step form out from under a full hero first.
 */
export default async function BookPage() {
  const [fleet, bookingOptions] = await Promise.all([
    getFleetSafely(),
    getBookingOptionsSafely(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Book a car"
        title="A fare and a confirmed pickup in under a minute"
        intro="Airport, point to point or hourly. Fixed fares within the five boroughs are shown before you book — everything else is priced by a person, usually within the hour."
      />

      <Section tone="grey">
        <Reveal className="mx-auto max-w-2xl">
          <div data-reveal>
            <BookingForm fleet={fleet} options={bookingOptions} />
          </div>
        </Reveal>
      </Section>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import { AirportRateGrid } from "@/components/site/airport-sections";
import { PageHeader } from "@/components/site/page-header";
import { ButtonLink } from "@/components/ui/button";
import { PlaneIcon } from "@/components/ui/icon";
import { Section, SectionHeading } from "@/components/ui/section";
import { airportPages } from "@/lib/airport-pages";
import { childSeatFee, hourlyWaitingRate } from "@/lib/content";
import { getBookingOptionsSafely, getFleetSafely } from "@/lib/public/fleet";
import { CtaBand } from "@/components/site/cta-band";

export const metadata: Metadata = {
  title: "Airport Transportation",
  description:
    "Fixed-fare car service between the five boroughs and JFK, LaGuardia, Newark, Teterboro and Westchester. Every fare published before you book, tolls and gratuity included.",
};

/**
 * The hub: how an airport transfer works, the whole rate card, and a way into
 * each airport's own page. What is specific to one airport belongs on that
 * airport's page, not here — the brief is explicit about not repeating them.
 */
const steps = [
  {
    title: "Book with your flight",
    body: "Airport, direction, vehicle and flight number. The fare appears before you confirm.",
  },
  {
    title: "Keep your reference",
    body: "It is shown the moment you submit, and emailed to you. With your phone number it is all Track a ride needs.",
  },
  {
    title: "We count from your landing",
    body: "Complimentary waiting runs from when your flight actually lands, not when it was due.",
  },
  {
    title: "Pay the fare you saw",
    body: "Tolls and gratuity are inside it. It moves only for something you add to the trip.",
  },
];

const included = [
  {
    title: "Tolls and gratuity",
    body: "Inside every fixed airport fare. They do not appear later as extra lines.",
  },
  {
    title: "Waiting, counted from landing",
    body: `45 minutes on domestic flights and 60 on international, from your actual landing time. After that, $${hourlyWaitingRate} per hour in 15-minute increments — and we call before it starts.`,
  },
  {
    title: "Meet and greet, on request",
    body: "Ask in the notes when you book, and your chauffeur waits inside arrivals with a name board.",
  },
  {
    title: "Child seats",
    body: `Rear-facing, forward-facing or booster, at $${childSeatFee} per seat. How many fit depends on the vehicle.`,
  },
  {
    title: "Free cancellation",
    body: "More than 6 hours before pickup, at no charge. Inside 6 hours the full fare applies.",
  },
  {
    title: "A person for everything else",
    body: "If your address is outside the five boroughs, the transfer is quoted by a person and agreed before you travel.",
  },
];

export default async function AirportTransportationPage() {
  const [fleet, options] = await Promise.all([
    getFleetSafely(),
    getBookingOptionsSafely(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Airport transportation"
        title="Every New York airport, at a fare you see first"
        intro="JFK, LaGuardia, Newark, Teterboro and Westchester, to or from anywhere in the five boroughs. The fare is on the page before you book, and it is the fare you pay."
      />

      <Section tone="light">
        <Reveal>
          <SectionHeading
            eyebrow="How it works"
            title="Four steps from booking to kerb"
            data-reveal
          />
          <ol
            data-reveal
            className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
          >
            {steps.map((step, index) => (
              <li key={step.title} className="border-t border-midnight/10 pt-6">
                {/* A large decorative numeral is the one way gold may sit on
                    white — a graphic, not a sentence. */}
                <span
                  aria-hidden
                  className="font-display block text-[34px] leading-none font-semibold text-gold tabular-nums"
                >
                  {index + 1}
                </span>
                <h3 className="font-sans mt-4 text-[17px] font-semibold text-midnight">
                  {step.title}
                </h3>
                <p className="mt-2 text-[15px] leading-[1.7] text-charcoal">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </Reveal>
      </Section>

      <Section tone="grey">
        <Reveal>
          <SectionHeading
            eyebrow="The rate card"
            title="Every airport, every vehicle"
            intro="Between the airport and any address in the five boroughs, in either direction. These are the same figures the booking form prices from."
            data-reveal
          />
          <div data-reveal className="mt-10">
            <AirportRateGrid fleet={fleet} options={options} />
          </div>
          <div data-reveal className="mt-10">
            {/* The page's one gold action. */}
            <ButtonLink href="/book" variant="cta" size="lg">
              Book an airport transfer
            </ButtonLink>
          </div>
        </Reveal>
      </Section>

      <Section tone="light">
        <Reveal>
          <SectionHeading
            eyebrow="What the fare covers"
            title="Written down, so nothing arrives on the invoice unannounced"
            data-reveal
          />
          <ul
            data-reveal
            className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
          >
            {included.map((item) => (
              <li key={item.title} className="border-t border-midnight/10 pt-6">
                <h3 className="font-sans text-[17px] font-semibold text-midnight">
                  {item.title}
                </h3>
                <p className="mt-3 text-[15px] leading-[1.7] text-charcoal">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
          <p data-reveal className="mt-10 text-[15px] leading-[1.7] text-charcoal">
            The full rules are in our{" "}
            <Link
              href="/terms"
              className="font-medium text-midnight underline underline-offset-4"
            >
              terms
            </Link>
            .
          </p>
        </Reveal>
      </Section>

      <Section tone="dark">
        <Reveal>
          <SectionHeading
            tone="dark"
            eyebrow="By airport"
            title="Each airport asks something different"
            intro="What matters at JFK is not what matters at Teterboro. Each page covers its own airport."
            data-reveal
          />
          <ul
            data-reveal
            className="mt-12 grid gap-x-10 gap-y-2 md:grid-cols-2"
          >
            {airportPages.map((page) => (
              <li key={page.code} className="border-t border-white/15">
                <Link
                  href={`/${page.slug}`}
                  className="group flex gap-4 py-6"
                >
                  <PlaneIcon className="mt-0.5 h-6 w-6 shrink-0 text-gold" />
                  <span>
                    <span className="font-sans block text-[17px] font-semibold text-white group-hover:underline group-hover:underline-offset-4">
                      {page.eyebrow}
                    </span>
                    <span className="mt-2 block text-[15px] leading-[1.7] text-white/70">
                      {page.summary}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      </Section>

      <CtaBand />
    </>
  );
}

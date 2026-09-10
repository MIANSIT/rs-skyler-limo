import type { Metadata } from "next";

import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/ui/section";
import { hourlyWaitingRate, childSeatFee, bookingAirports } from "@/lib/content";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Cancellation window, complimentary wait time, and how a final fare is calculated after your trip. Written plainly, before you book.",
};

/** Reviewed with the terms; change both together. */
const LAST_UPDATED = "9 September 2026";

const cancellation = [
  {
    when: "More than 6 hours before pickup",
    fee: "$0",
    note: "Cancel free of charge. Any authorisation held on your card is released.",
  },
  {
    when: "Less than 6 hours before pickup",
    fee: "100%",
    note: "The full fare is charged. The vehicle and chauffeur are already committed to you.",
  },
  {
    when: "No-show",
    fee: "100%",
    note: "Treated as a late cancellation. Tell us you are delayed and we will wait — see below.",
  },
];

const waitTime = [
  {
    pickup: "Domestic flights",
    free: "45 minutes",
    from: "Your actual landing time, tracked from the flight number on the booking — not your scheduled time.",
  },
  {
    pickup: "International flights",
    free: "60 minutes",
    from: "Your actual landing time. The extra quarter hour covers immigration and baggage.",
  },
  {
    pickup: "Point-to-point and hourly",
    free: "15 minutes",
    from: "The pickup time on your confirmation.",
  },
];

const collected = [
  {
    term: "Your name and phone number",
    detail:
      "So the chauffeur can reach you at the kerb, and so we can call you if anything about the trip changes.",
  },
  {
    term: "Your email address",
    detail:
      "For the confirmation, the reservation ID and the final invoice. We do not add you to a mailing list off the back of a booking.",
  },
  {
    term: "Pickup and drop-off addresses",
    detail:
      "Including any stops. These go to the chauffeur driving you and nowhere else. Where you were picked up and dropped is not discussed between bookings.",
  },
  {
    term: "Your flight number, on airport transfers",
    detail:
      "Used to track your arrival so a delayed landing moves your pickup rather than costing you a fare.",
  },
  {
    term: "Payment details",
    detail:
      "Card details are entered with our payment processor and are never stored on our systems. We keep only the authorisation reference and the last four digits, which is what appears on your invoice.",
  },
];

export default function TermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Terms & conditions"
        title="What you are agreeing to, in plain words"
        intro="These are the terms that decide what you pay and when. We would rather you read them before you book than discover them on an invoice."
      />

      <Section tone="light">
        <Reveal>
          <SectionHeading
            eyebrow="Cancelling"
            title="Six hours, then the fare stands"
            intro="A booking holds a specific car and a specific chauffeur for a specific hour. Six hours is long enough for us to fill that slot; less than six is not."
            data-reveal
          />

          <div data-reveal className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left">
              <caption className="sr-only">Cancellation fees</caption>
              <thead>
                <tr className="border-b border-midnight/15">
                  <th
                    scope="col"
                    className="py-3 pr-6 font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/70 uppercase"
                  >
                    When you cancel
                  </th>
                  <th
                    scope="col"
                    className="py-3 pr-6 font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/70 uppercase"
                  >
                    Fee
                  </th>
                  <th
                    scope="col"
                    className="py-3 font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/70 uppercase"
                  >
                    What that means
                  </th>
                </tr>
              </thead>
              <tbody>
                {cancellation.map((row) => (
                  <tr
                    key={row.when}
                    className="border-b border-midnight/10 last:border-0"
                  >
                    <th
                      scope="row"
                      className="py-5 pr-6 align-top font-sans text-[15px] font-semibold text-midnight"
                    >
                      {row.when}
                    </th>
                    <td className="py-5 pr-6 align-top font-sans text-[17px] font-semibold text-midnight tabular-nums">
                      {row.fee}
                    </td>
                    <td className="max-w-md py-5 align-top text-[15px] leading-[1.7] text-charcoal">
                      {row.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            data-reveal
            className="mt-10 max-w-2xl border-l-2 border-gold bg-grey px-6 py-5"
          >
            <h3 className="font-sans text-[15px] font-semibold text-midnight">
              If we cancel
            </h3>
            <p className="mt-2 text-[15px] leading-[1.7] text-charcoal">
              You are refunded in full, whatever the notice. No fee, no partial
              charge, and any authorisation on your card is released the same
              day. We will also try to put another vehicle on the job before we
              cancel at all — but if we cannot, you are not out of pocket for
              our problem.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section tone="grey">
        <Reveal>
          <SectionHeading
            eyebrow="Waiting"
            title="The clock starts when you land, not when you were due"
            intro="We track your flight. A delayed arrival moves your pickup with it, and your complimentary wait time begins at the wheels-down time, so a three-hour delay costs you nothing."
            data-reveal
          />

          <dl
            data-reveal
            className="mt-12 grid gap-x-10 gap-y-12 md:grid-cols-3"
          >
            {waitTime.map((row) => (
              <div key={row.pickup} className="border-t-2 border-gold pt-6">
                <dt className="font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/70 uppercase">
                  {row.pickup}
                </dt>
                <dd>
                  <p className="font-display mt-3 text-[30px] leading-none font-semibold text-midnight tabular-nums">
                    {row.free}
                  </p>
                  <p className="mt-1 font-sans text-[13px] tracking-[0.06em] text-charcoal/70 uppercase">
                    Complimentary
                  </p>
                  <p className="mt-4 text-[15px] leading-[1.7] text-charcoal">
                    {row.from}
                  </p>
                </dd>
              </div>
            ))}
          </dl>

          <p
            data-reveal
            className="mt-12 max-w-2xl border-l-2 border-midnight/20 pl-6 text-[15px] leading-[1.7] text-charcoal"
          >
            Past the complimentary window, waiting is billed at{" "}
            <strong className="font-semibold text-midnight tabular-nums">
              ${hourlyWaitingRate} per hour
            </strong>
            , charged in 15-minute increments. We call before the meter starts.
          </p>
        </Reveal>
      </Section>

      <Section tone="light">
        <Reveal>
          <SectionHeading
            eyebrow="Your final invoice"
            title="The fare can only move for things you asked for"
            intro="You are quoted a fixed fare before you book. It changes afterwards only if the trip itself changed — never because of traffic, a longer route, or a driver running behind."
            data-reveal
          />

          <ul data-reveal className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">
            {[
              {
                title: "Extra waiting",
                body: `Charged only once your complimentary window has run out — ${waitTime
                  .map((row) => `${row.free} on ${row.pickup.toLowerCase()}`)
                  .join(", ")}. After that, $${hourlyWaitingRate} per hour, billed in 15-minute increments.`,
              },
              {
                title: "Extra stops or a changed route",
                body: "A flat fee for an additional stop within the same zone. A larger change is recalculated on the added mileage and time, and confirmed with you in the car.",
              },
              {
                title: "Tolls and parking",
                body: "Added at cost, and only where they were not already included in your quoted fare. We do not mark them up.",
              },
              {
                title: "Your receipt",
                body: "A final invoice is emailed automatically once the trip closes, showing the quoted fare and every adjustment on its own line.",
              },
            ].map((item) => (
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
        </Reveal>
      </Section>

      <Section tone="grey">
        <Reveal>
          <SectionHeading
            eyebrow="Booking"
            title="What we ask for, and why"
            intro="Every field on the booking form exists because a chauffeur needs it to arrive at the right place, at the right time, in the right car."
            data-reveal
          />

          <dl data-reveal className="mt-10 flex max-w-3xl flex-col gap-8">
            {[
              {
                term: "Where you are going",
                detail:
                  "Pickup address, drop-off address, and any stops in between.",
              },
              {
                term: "Your flight, on airport transfers",
                detail: `A flight number is required for pickups at ${bookingAirports.join(
                  ", ",
                )}. It is how we track your landing and hold the car for a delay.`,
              },
              {
                term: "Passengers and luggage",
                detail:
                  "Counts for both. The form recommends a vehicle class that fits — a fourth passenger and four cases is an SUV, not a sedan.",
              },
              {
                term: "Child seats",
                detail: `Rear-facing, forward-facing or booster, at $${childSeatFee} per seat, up to two seats per vehicle. Fitted and checked before we set off.`,
              },
              {
                term: "Meet and greet, and anything else",
                detail:
                  "A chauffeur waiting inside arrivals with a name board, or any request you would otherwise have to phone in.",
              },
              {
                term: "Your agreement to these terms",
                detail:
                  "You confirm you have read and accept these terms on the booking form, before any payment is authorised. The form will not submit without it, and no card is charged or held until you have.",
              },
              {
                term: "Payment",
                detail:
                  "A card authorisation or deposit hold is placed at booking. Nothing is captured until the trip is complete and the final fare is settled.",
              },
              {
                term: "Confirmation",
                detail:
                  "Emailed immediately, with your reservation ID and a summary of the trip. That ID is what the tracking page accepts.",
              },
            ].map((item) => (
              <div
                key={item.term}
                className="grid gap-2 border-t border-midnight/10 pt-5 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-8"
              >
                <dt className="font-sans text-[15px] font-semibold text-midnight">
                  {item.term}
                </dt>
                <dd className="text-[15px] leading-[1.7] text-charcoal">
                  {item.detail}
                </dd>
              </div>
            ))}
          </dl>

          <p
            data-reveal
            className="mt-10 max-w-2xl text-[15px] leading-[1.7] text-charcoal"
          >
            Your base fare, taxes, fees and total are shown before you confirm.
            There is no figure on the final invoice you have not already seen or
            asked for.
          </p>
        </Reveal>
      </Section>

      <Section tone="light">
        <Reveal>
          <SectionHeading
            eyebrow="Your information"
            title="What we hold, and why we need it"
            intro="We collect what it takes to get a car to you and settle the fare. Nothing else, and nothing kept for longer than that requires."
            data-reveal
          />

          <dl data-reveal className="mt-10 flex max-w-3xl flex-col gap-8">
            {collected.map((item) => (
              <div
                key={item.term}
                className="grid gap-2 border-t border-midnight/10 pt-5 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-8"
              >
                <dt className="font-sans text-[15px] font-semibold text-midnight">
                  {item.term}
                </dt>
                <dd className="text-[15px] leading-[1.7] text-charcoal">
                  {item.detail}
                </dd>
              </div>
            ))}
          </dl>

          <ul
            data-reveal
            className="mt-10 grid max-w-3xl gap-x-10 gap-y-6 md:grid-cols-2"
          >
            {[
              "We do not sell your details, and we do not pass them to anyone beyond the chauffeur driving you and the processor taking the payment.",
              "Access is restricted to reservations staff, and every change to your booking is recorded against the person who made it.",
              "Your chauffeur is given your name, your phone number and the route — not your payment details.",
              "Ask us at any time for a copy of what we hold on you, or for it to be deleted once your trips are settled.",
            ].map((line) => (
              <li
                key={line}
                className="border-l-2 border-midnight/15 pl-5 text-[15px] leading-[1.7] text-charcoal"
              >
                {line}
              </li>
            ))}
          </ul>
        </Reveal>
      </Section>

      <Section tone="grey">
        <Reveal>
          <SectionHeading
            eyebrow="After your trip"
            title="We ask how it went, and we publish what you say"
            intro="Every completed trip gets an automated request to rate the ride. What you write is yours."
            data-reveal
          />

          <ul data-reveal className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">
            {[
              {
                title: "Ratings are not filtered",
                body: "Any rating may appear on this site or on our Google Business Profile. We select testimonials from clients who have agreed to be quoted, and we do not withhold a review because it is critical.",
              },
              {
                title: "A poor rating reaches a person",
                body: "Anything below four stars is routed straight to management the same day, alongside being published. A complaint that only reaches a dashboard has not been dealt with.",
              },
            ].map((item) => (
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
        </Reveal>
      </Section>

      <Section tone="dark">
        <Reveal>
          <SectionHeading
            tone="dark"
            eyebrow="Questions"
            title="Ask before you book, not after"
            intro="If any of this is unclear for the trip you have in mind, call reservations. Someone answers, at any hour."
            data-reveal
          />

          <div data-reveal className="mt-10 flex flex-wrap items-center gap-6">
            <ButtonLink href="/" variant="cta">
              Book a car
            </ButtonLink>
            <a
              href="tel:+12125550147"
              className="text-[17px] text-white underline-offset-4 tabular-nums hover:underline"
            >
              +1 (212) 555-0147
            </a>
          </div>

          <p data-reveal className="mt-12 text-[13px] text-white/55">
            Last updated{" "}
            <span className="tabular-nums">{LAST_UPDATED}</span>. These terms
            cover cancellation, waiting, billing and booking. Rates are in US
            dollars.
          </p>
        </Reveal>
      </Section>
    </>
  );
}

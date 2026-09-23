import Link from "next/link";

import { CountUp } from "@/components/motion/count-up";
import { Reveal } from "@/components/motion/reveal";
import { BoroughMarquee } from "@/components/site/borough-marquee";
import { FleetCard } from "@/components/site/fleet-card";
import { Hero } from "@/components/site/hero";
import {
  About,
  AirportTransfers,
  Faq,
  Reviews,
  ServiceAreas,
} from "@/components/site/home-sections";
import { BookingStatusPreview } from "@/components/site/booking-status-preview";
import { HowItWorks } from "@/components/site/how-it-works";
import { ButtonLink, ButtonLinkOnDark } from "@/components/ui/button";
import {
  BriefcaseIcon,
  ClockIcon,
  MapPinIcon,
  PlaneIcon,
  RingsIcon,
  ShieldIcon,
} from "@/components/ui/icon";
import {
  Container,
  Eyebrow,
  RationaleNote,
  Section,
  SectionHeading,
} from "@/components/ui/section";
import { bookingAirports, services, values } from "@/lib/content";
import { getBookingOptionsSafely, getFleetSafely } from "@/lib/public/fleet";
import { getHeroMediaSafely } from "@/lib/public/hero-media";
import { getReviewsSafely } from "@/lib/public/reviews";

const serviceIcons = [PlaneIcon, ClockIcon, BriefcaseIcon, MapPinIcon, RingsIcon];

export default async function HomePage() {
  // One fetch, shared by the booking widget and the fleet strip below.
  const [fleet, bookingOptions, heroMedia, reviewsData] = await Promise.all([
    getFleetSafely(),
    getBookingOptionsSafely(),
    getHeroMediaSafely(),
    getReviewsSafely(),
  ]);

  return (
    <>
      <Hero fleet={fleet} bookingOptions={bookingOptions} media={heroMedia} />
      <BoroughMarquee />

      {/* Services — deep-midnight ground, at the client's request for a dark-first
          homepage (see the note on `Section`'s `deep` tone). Gold still
          appears only as icons and rules, never as a sentence of text. */}
      <Section tone="deep">
        <Reveal>
          <SectionHeading
            tone="dark"
            eyebrow="What we do"
            title="Five services, one standard"
            intro="A car that is where it said it would be, driven by someone who already knows the route. Everything else is detail."
            data-reveal
          />
        </Reveal>

        <Reveal className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => {
            const Icon = serviceIcons[index];
            return (
              <Link
                key={service.name}
                href={service.href}
                data-reveal
                className="group flex flex-col border-t border-white/15 pt-6"
              >
                <Icon className="h-6 w-6 text-gold" />
                <h3 className="font-sans mt-5 text-[17px] font-semibold text-white">
                  {service.name}
                </h3>
                <p className="mt-3 flex-1 text-[15px] leading-[1.7] text-white/75">
                  {service.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 font-sans text-[14px] font-medium text-white underline-offset-4 group-hover:underline">
                  Learn more
                  <span aria-hidden>→</span>
                </span>
              </Link>
            );
          })}
        </Reveal>
      </Section>

      {/*
        Tracking — midnight ground, the one place gold carries text.

        This section used to promise automatic delay notifications, flight
        tracking and a shareable live link, illustrated with a moving car and a
        five-minute ETA. None of those exist: there is no flight-tracking
        integration, no email of any kind, and `/track` is a two-field lookup.
        It now describes the lookup, which is the thing that actually works.
      */}
      <Section tone="dark">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <SectionHeading
              tone="dark"
              eyebrow="Calm under pressure"
              title="Check your booking without calling anyone"
              intro="Every request gets a reference. That reference and the phone number on the booking are enough to see where it stands — no account, no password, no app."
              data-reveal
            />
            <ul
              data-reveal
              className="mt-8 flex flex-col gap-3 text-[15px] text-white/75"
            >
              {[
                "Your reference is shown the moment you submit",
                "Two fields to look it up — nothing to remember",
                "Agreed fares appear against the booking once set",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span aria-hidden className="mt-2.5 h-px w-4 shrink-0 bg-gold" />
                  {item}
                </li>
              ))}
            </ul>
            <div data-reveal className="mt-9">
              <ButtonLink href="/track" variant="secondary">
                Track a ride
              </ButtonLink>
            </div>
          </Reveal>

          <Reveal y={34}>
            <BookingStatusPreview />
          </Reveal>
        </div>
      </Section>

      {/* Booking flow */}
      <Section tone="deep">
        <Reveal>
          <SectionHeading
            tone="dark"
            eyebrow="How booking works"
            title="Shorter than describing the trip out loud"
            intro="Four steps, and only the first one needs you."
            data-reveal
          />
        </Reveal>
        <HowItWorks tone="dark" />
      </Section>

      {/* Fleet */}
      <Section tone="dark">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            tone="dark"
            eyebrow="The fleet"
            title="Every class, chosen without a phone call"
            intro="Each class states plainly who it is for, what it holds, how many child seats it takes, and where the fare starts."
            data-reveal
          />
          <ButtonLinkOnDark href="/fleet" data-reveal>
            Compare the fleet
          </ButtonLinkOnDark>
        </Reveal>

        {/*
          Two from `sm`, three from `lg`, four only from `xl`. Two columns held
          all the way to `xl` left each compact card ~400–470px on a typical
          laptop window — nearly double its ~270px design width, with the small
          text and specs stranded in the extra space. Four straight from `lg`
          overcorrects the other way: the content column is 1024px there, which
          leaves each card ~220px — narrower than the spec labels inside it.
          Three at `lg` lands close to the design width (~300px) without either
          problem.
        */}
        <Reveal
          className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          y={30}
        >
          {fleet.map((vehicle) => (
            <div key={vehicle.slug} data-reveal className="flex min-w-0">
              <FleetCard vehicle={vehicle} variant="compact" tone="dark" />
            </div>
          ))}
        </Reveal>
      </Section>

      <AirportTransfers airports={bookingOptions.airports} tone="deep" />
      <ServiceAreas tone="dark" />

      {/* Values + counters */}
      <Section tone="deep">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-20">
          <Reveal className="lg:col-span-5">
            <SectionHeading
              tone="dark"
              eyebrow="Why clients stay"
              title="Discreet excellence"
              intro="The best compliment is a client who never had to think about the logistics at all."
              data-reveal
            />
            {/*
              These were 98% on-time arrivals, a 12-minute average airport wait
              and 24/7 live dispatch. Nothing in the system measures any of
              them. What is left is countable: the boroughs we cover, the
              airports on the rate card, and the classes actually in the fleet
              — the last read from the database, so it cannot drift.
            */}
            <div data-reveal className="mt-10 grid grid-cols-2 gap-8">
              <Stat value={5} label="Boroughs served" />
              <Stat value={bookingAirports.length} label="Airports on the rate card" />
              {/* Omitted rather than zero when the API is unreachable — see the
                  matching note in the hero. */}
              {fleet.length > 0 ? (
                <Stat
                  value={fleet.length}
                  label={fleet.length === 1 ? "Vehicle class" : "Vehicle classes"}
                />
              ) : null}
            </div>
          </Reveal>

          <Reveal className="lg:col-span-7">
            <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {values.map((value) => (
                <div key={value.title} data-reveal>
                  <dt className="font-sans text-[17px] font-semibold text-white">
                    {value.title}
                  </dt>
                  <dd className="mt-3 text-[15px] leading-[1.7] text-white/70">
                    {value.body}
                  </dd>
                </div>
              ))}
            </dl>
            <div data-reveal className="mt-10 flex items-start gap-4 border-t border-white/15 pt-8">
              <ShieldIcon className="mt-0.5 h-6 w-6 shrink-0 text-gold" />
              {/* "Inspected on a fixed cadence" named a schedule nobody
                  publishes or tracks. Licensing and background checks are
                  requirements of operating here; the rest was decoration. */}
              <p className="text-[15px] leading-[1.7] text-white/70">
                Every chauffeur is licensed and background-checked before they
                drive for us. Conversations, routes and client details stay in
                the car.
              </p>
            </div>
          </Reveal>
        </div>
      </Section>

      <Reviews data={reviewsData} tone="dark" />
      <About tone="deep" />

      {/* Positioning note, set in the guide's own rationale device */}
      <Section tone="dark">
        <Reveal className="mx-auto max-w-3xl">
          <div data-reveal>
            <RationaleNote label="Our position" tone="dark">
              RSSkyler Limo is New York City&rsquo;s accessible-luxury chauffeur
              service — the confidence of a five-star hotel car, without the
              velvet-rope distance.
            </RationaleNote>
          </div>
        </Reveal>
      </Section>

      <Faq tone="deep" />

      {/* Closing CTA */}
      <section className="bg-midnight">
        <Container className="border-t border-white/15 py-20 md:py-24">
          <Reveal className="flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-center">
            <div data-reveal className="max-w-xl">
              <Eyebrow tone="dark">Ready when you are</Eyebrow>
              <p className="font-display mt-4 text-[26px] leading-tight font-semibold text-white md:text-[34px]">
                Get a fare and a confirmed pickup in under a minute.
              </p>
            </div>
            <div data-reveal className="flex flex-wrap gap-4">
              <ButtonLink href="/book" variant="cta" size="lg">
                Book a car
              </ButtonLink>
              <Link
                href="/corporate"
                className="inline-flex items-center px-2 py-4 font-sans text-[15px] text-white/80 underline-offset-4 hover:text-white hover:underline"
              >
                Open a corporate account
              </Link>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}

function Stat({
  value,
  suffix,
  label,
}: {
  value: number;
  suffix?: string;
  label: string;
}) {
  return (
    <div>
      <p className="font-display text-[34px] leading-none font-semibold text-white tabular-nums">
        <CountUp to={value} suffix={suffix} />
      </p>
      <p className="mt-3 font-sans text-[13px] tracking-widest text-white/55 uppercase">
        {label}
      </p>
    </div>
  );
}

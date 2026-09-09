import Link from "next/link";

import { CountUp } from "@/components/motion/count-up";
import { Reveal } from "@/components/motion/reveal";
import { BoroughMarquee } from "@/components/site/borough-marquee";
import { FleetCard } from "@/components/site/fleet-card";
import { Hero } from "@/components/site/hero";
import { HowItWorks } from "@/components/site/how-it-works";
import { RoutePreview } from "@/components/site/route-preview";
import { ButtonLink } from "@/components/ui/button";
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
import { fleet, services, values } from "@/lib/content";

const serviceIcons = [PlaneIcon, ClockIcon, BriefcaseIcon, MapPinIcon, RingsIcon];

export default function HomePage() {
  return (
    <>
      <Hero />
      <BoroughMarquee />

      {/* Services — light ground, so gold appears only as icons and rules. */}
      <Section tone="light">
        <Reveal>
          <SectionHeading
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
                className="group border-t border-midnight/10 pt-6"
              >
                <Icon className="h-6 w-6 text-gold" />
                <h3 className="font-sans mt-5 text-[17px] font-semibold text-midnight underline-offset-4 group-hover:underline">
                  {service.name}
                </h3>
                <p className="mt-3 text-[15px] leading-[1.7] text-charcoal">
                  {service.description}
                </p>
              </Link>
            );
          })}
        </Reveal>
      </Section>

      {/* Tracking — midnight ground, the one place gold carries text. */}
      <Section tone="dark">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <SectionHeading
              tone="dark"
              eyebrow="Calm under pressure"
              title="You should never have to ask where the car is"
              intro="Flight delays, driver changes and reroutes are handled and communicated automatically — plainly, and before you notice anything is wrong. Share a live link with an assistant or a family member; they will not need the app."
              data-reveal
            />
            <ul
              data-reveal
              className="mt-8 flex flex-col gap-3 text-[15px] text-white/75"
            >
              {[
                "Flight-tracked pickup across JFK, LaGuardia and Newark",
                "A shareable tracking link, no download required",
                "Your driver's name and vehicle, sent the day before",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span aria-hidden className="mt-2.5 h-px w-4 shrink-0 bg-gold" />
                  {item}
                </li>
              ))}
            </ul>
            <div data-reveal className="mt-9">
              <ButtonLink href="/track" variant="cta">
                Track a ride
              </ButtonLink>
            </div>
          </Reveal>

          <Reveal y={34}>
            <RoutePreview />
          </Reveal>
        </div>
      </Section>

      {/* Booking flow */}
      <Section tone="light">
        <Reveal>
          <SectionHeading
            eyebrow="How booking works"
            title="Shorter than describing the trip out loud"
            intro="Four steps, and only the first one needs you."
            data-reveal
          />
        </Reveal>
        <HowItWorks />
      </Section>

      {/* Fleet */}
      <Section tone="grey">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="The fleet"
            title="Four classes, chosen without a phone call"
            intro="Each class states plainly who it is for, what it holds, and where the fare starts."
            data-reveal
          />
          <ButtonLink href="/fleet" variant="secondary" data-reveal>
            Compare all four
          </ButtonLink>
        </Reveal>

        <Reveal className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4" y={30}>
          {fleet.map((vehicle) => (
            <div key={vehicle.slug} data-reveal className="flex">
              <FleetCard vehicle={vehicle} />
            </div>
          ))}
        </Reveal>
      </Section>

      {/* Values + counters */}
      <Section tone="dark">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-20">
          <Reveal className="lg:col-span-5">
            <SectionHeading
              tone="dark"
              eyebrow="Why clients stay"
              title="Discreet excellence"
              intro="The best compliment is a client who never had to think about the logistics at all."
              data-reveal
            />
            <div data-reveal className="mt-10 grid grid-cols-2 gap-8">
              <Stat value={12} suffix=" min" label="Average airport wait" />
              <Stat value={98} suffix="%" label="On-time arrivals" />
              <Stat value={5} label="Boroughs served" />
              <Stat value={24} suffix="/7" label="Live dispatch" />
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
              <p className="text-[15px] leading-[1.7] text-white/70">
                Every chauffeur is background-checked and every vehicle
                inspected on a fixed cadence. Conversations, routes and client
                details stay in the car.
              </p>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* Positioning note, set in the guide's own rationale device */}
      <Section tone="light">
        <Reveal className="mx-auto max-w-3xl">
          <div data-reveal>
            <RationaleNote label="Our position">
              RSSkyler Limo is New York City&rsquo;s accessible-luxury chauffeur
              service — the confidence of a five-star hotel car, without the
              velvet-rope distance.
            </RationaleNote>
          </div>
        </Reveal>
      </Section>

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
              <ButtonLink href="/#book" variant="cta" size="lg">
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

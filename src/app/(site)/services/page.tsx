import type { Metadata } from "next";
import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/page-header";
import {
  BriefcaseIcon,
  ClockIcon,
  MapPinIcon,
  PlaneIcon,
  RingsIcon,
} from "@/components/ui/icon";
import { Section, SectionHeading } from "@/components/ui/section";
import { weddingPackages } from "@/lib/content";
import { CtaBand } from "@/components/site/cta-band";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Airport transfers, point-to-point rides, hourly charters, corporate accounts, events and weddings across New York City — what each one is and how it is priced.",
};

/**
 * Every service the booking and quote forms actually accept, and nothing they
 * do not. `id` is the anchor the homepage and footer link to — `#hourly` in
 * particular, since hourly work has no page of its own.
 */
const detail = [
  {
    id: "airport",
    Icon: PlaneIcon,
    name: "Airport transfers",
    body: "To or from JFK, LaGuardia, Newark, Teterboro and Westchester. Give us the flight number and your complimentary waiting runs from when you actually land.",
    pricing: "Fixed fare within the five boroughs, shown before you book.",
    link: { href: "/airport-transportation", label: "Airports and fares" },
  },
  {
    id: "point-to-point",
    Icon: MapPinIcon,
    name: "Point to point",
    body: "One address to another — a dinner, a meeting, a station. Fifteen minutes of complimentary waiting from the pickup time on your confirmation.",
    pricing: "Quoted by a person and agreed before you travel.",
    link: { href: "/book", label: "Request a ride" },
  },
  {
    id: "hourly",
    Icon: ClockIcon,
    name: "Hourly charters",
    body: "A car and chauffeur on standby for a day of meetings, appointments or stops that will not keep to a schedule. Tell us roughly where and for how long.",
    pricing: "Quoted by a person for the hours you need.",
    link: { href: "/book", label: "Request an hourly car" },
  },
  {
    id: "corporate",
    Icon: BriefcaseIcon,
    name: "Corporate accounts",
    body: "Monthly invoicing with every trip itemised, one named contact, and booking on behalf of anyone in your organisation.",
    pricing: "A rate card agreed for your account.",
    link: { href: "/corporate", label: "Corporate accounts" },
  },
  {
    id: "events",
    Icon: MapPinIcon,
    name: "Events",
    body: "Several vehicles on one timeline for conferences, galas and private functions, with guest transport planned before the day.",
    pricing: "Quoted for the event as a whole.",
    link: { href: "/weddings", label: "Weddings & events" },
  },
  {
    id: "weddings",
    Icon: RingsIcon,
    name: "Weddings",
    body: `Three packages — ${weddingPackages
      .map((item) => item.tier)
      .join(", ")
      .replace(/, ([^,]*)$/, " and $1")} — from a single car for the couple to a motorcade across several days.`,
    pricing: "Quoted for the day, once we know the plan.",
    link: { href: "/weddings", label: "Wedding packages" },
  },
];

export default function ServicesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Services"
        title="What we do, and how each one is priced"
        intro="Six ways to use a car and a chauffeur in New York. Airport transfers carry a fare you see before you book; everything else is priced by a person and agreed before you travel."
      />

      <Section tone="light">
        <Reveal>
          <SectionHeading
            eyebrow="The services"
            title="One standard, whatever the trip"
            data-reveal
          />
        </Reveal>

        <div className="mt-12 flex flex-col">
          {detail.map((item) => (
            <Reveal key={item.id}>
              {/* scroll-mt clears the sticky header when arriving by anchor. */}
              <article
                id={item.id}
                data-reveal
                className="grid scroll-mt-28 gap-6 border-t border-midnight/10 py-10 md:grid-cols-12 md:gap-10"
              >
                <div className="flex gap-4 md:col-span-4">
                  <item.Icon className="mt-1 h-6 w-6 shrink-0 text-gold" />
                  <h2 className="font-display text-[22px] font-semibold text-midnight md:text-[26px]">
                    {item.name}
                  </h2>
                </div>
                <div className="md:col-span-8">
                  <p className="max-w-2xl text-[16px] leading-[1.7] text-charcoal">
                    {item.body}
                  </p>
                  <p className="mt-4 text-[15px] leading-[1.7] text-midnight">
                    <span className="font-semibold">Priced: </span>
                    {item.pricing}
                  </p>
                  <Link
                    href={item.link.href}
                    className="mt-5 inline-flex items-center gap-1.5 py-1 font-sans text-[15px] font-medium text-midnight underline underline-offset-4"
                  >
                    {item.link.label}
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="grey">
        <Reveal>
          <SectionHeading
            eyebrow="Pricing"
            title="Two ways a trip is priced, and never a third"
            data-reveal
          />
          <div data-reveal className="mt-12 grid gap-10 md:grid-cols-2">
            <div className="border-t-2 border-gold pt-6">
              <h3 className="font-sans text-[17px] font-semibold text-midnight">
                Fixed
              </h3>
              <p className="mt-3 text-[15px] leading-[1.7] text-charcoal">
                An airport transfer between one of our airports and an address
                in the five boroughs. The fare is on the rate card, shown before
                you book, with tolls and gratuity inside it.
              </p>
            </div>
            <div className="border-t-2 border-gold pt-6">
              <h3 className="font-sans text-[17px] font-semibold text-midnight">
                Quoted
              </h3>
              <p className="mt-3 text-[15px] leading-[1.7] text-charcoal">
                Everything else. You send the details, a person comes back with
                a fare, and nothing is charged until you accept it. That figure
                then holds — it does not move for traffic or a longer route.
              </p>
            </div>
          </div>
        </Reveal>
      </Section>

      <CtaBand eyebrow="Not sure which fits?" title="Describe the trip once and we will price it — or book it now." primary="quote" />
    </>
  );
}

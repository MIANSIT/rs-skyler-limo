import type { Metadata } from "next";
import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import { About } from "@/components/site/home-sections";
import { PageHeader } from "@/components/site/page-header";
import { ShieldIcon } from "@/components/ui/icon";
import { RationaleNote, Section, SectionHeading } from "@/components/ui/section";
import { values } from "@/lib/content";
import { CtaBand } from "@/components/site/cta-band";

export const metadata: Metadata = {
  title: "About",
  description:
    "RSSkyler Limo is a New York City chauffeur service: published airport fares, plain terms, licensed and background-checked chauffeurs, across all five boroughs.",
};

/**
 * Who the company is, in plain language.
 *
 * The company story — who runs it, when it began, what it owns — is the `about`
 * entry in `content.ts`, and only the business can supply it. Until it does,
 * that section renders nothing in production (and a labelled sample in
 * development). Everything else on this page restates something the site
 * already commits to elsewhere, so none of it is new.
 */
const practices = [
  {
    title: "Fares published before you book",
    body: "Airport transfers inside the city are priced from a rate card you can read, not a figure worked out afterwards.",
    href: "/airport-transportation",
    link: "The rate card",
  },
  {
    title: "Terms in plain words",
    body: "Cancellation, waiting and the final invoice are written down, and the invoice follows them.",
    href: "/terms",
    link: "Our terms",
  },
  {
    title: "Reviews from real trips only",
    body: "A review can be left only against a completed booking, and every one is read before it is published.",
    href: "/review",
    link: "Review a trip",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="A New York chauffeur service that says what it does"
        intro="The confidence of a five-star hotel car, without the velvet-rope distance. Driving in all five boroughs and to every New York airport."
      />

      <About tone="light" />

      <Section tone="grey">
        <Reveal>
          <SectionHeading
            eyebrow="What we hold to"
            title="Four things that do not change between trips"
            data-reveal
          />
        </Reveal>
        <Reveal className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2">
          {values.map((value) => (
            <div
              key={value.title}
              data-reveal
              className="border-t border-midnight/10 pt-6"
            >
              <h3 className="font-sans text-[17px] font-semibold text-midnight">
                {value.title}
              </h3>
              <p className="mt-3 text-[15px] leading-[1.7] text-charcoal">
                {value.body}
              </p>
            </div>
          ))}
        </Reveal>
        <Reveal>
          <div
            data-reveal
            className="mt-12 flex items-start gap-4 border-t border-midnight/10 pt-8"
          >
            <ShieldIcon className="mt-0.5 h-6 w-6 shrink-0 text-gold" />
            <p className="max-w-2xl text-[15px] leading-[1.7] text-charcoal">
              Every chauffeur is licensed and background-checked before they
              drive for us. Conversations, routes and client details stay in the
              car.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section tone="light">
        <Reveal>
          <SectionHeading
            eyebrow="How we work"
            title="Things you can check for yourself"
            data-reveal
          />
          <ul
            data-reveal
            className="mt-12 grid gap-x-10 gap-y-10 md:grid-cols-3"
          >
            {practices.map((item) => (
              <li key={item.title} className="border-t-2 border-gold pt-6">
                <h3 className="font-sans text-[17px] font-semibold text-midnight">
                  {item.title}
                </h3>
                <p className="mt-3 text-[15px] leading-[1.7] text-charcoal">
                  {item.body}
                </p>
                <Link
                  href={item.href}
                  className="mt-4 inline-flex items-center gap-1.5 py-1 font-sans text-[15px] font-medium text-midnight underline underline-offset-4"
                >
                  {item.link}
                  <span aria-hidden>→</span>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal className="mt-16 max-w-3xl">
          <div data-reveal>
            <RationaleNote label="Our position">
              Premium enough for a client who expects everything handled;
              approachable enough that a first-time booker never feels out of
              place.
            </RationaleNote>
          </div>
        </Reveal>
      </Section>

      <CtaBand eyebrow="Arrive in style" title="The best introduction is a trip." />
    </>
  );
}

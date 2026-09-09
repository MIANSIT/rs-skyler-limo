import type { Metadata } from "next";

import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/page-header";
import { ButtonLink } from "@/components/ui/button";
import { RingsIcon } from "@/components/ui/icon";
import {
  RationaleNote,
  Section,
  SectionHeading,
} from "@/components/ui/section";
import { weddingPackages } from "@/lib/content";

export const metadata: Metadata = {
  title: "Weddings & Events",
  description:
    "Classic, Signature and Bespoke wedding packages. Coordinated multi-vehicle logistics for a day that cannot slip.",
};

/**
 * The division's voice warms further than the core brand: more present tense,
 * more sensory detail, less operational language. Same palette, same typefaces.
 */
export default function WeddingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Every detail, minded"
        title="The most photographed day we will ever take part in"
        intro="Cars that are already waiting when the doors open. A coordinator who has walked the route. A timeline rehearsed long before anyone is running late in good shoes."
      />

      <Section tone="light">
        <Reveal>
          <SectionHeading
            eyebrow="Packages"
            title="Three tiers, sized to the day"
            intro="Every tier includes a route walked in advance and a direct line to your coordinator."
            data-reveal
          />
        </Reveal>

        <Reveal className="mt-14 grid gap-6 lg:grid-cols-3" y={30}>
          {weddingPackages.map((pkg, index) => (
            <article
              key={pkg.tier}
              data-reveal
              className="flex flex-col border border-midnight/10 bg-white p-8"
            >
              <span
                aria-hidden
                className="font-display text-[26px] leading-none font-semibold text-gold tabular-nums"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="font-display mt-6 text-[22px] font-semibold text-midnight">
                {pkg.tier}
              </h3>
              <p className="font-display mt-3 text-[16px] text-charcoal italic">
                {pkg.summary}
              </p>
              <ul className="mt-7 flex flex-1 flex-col gap-3 text-[15px] leading-[1.7] text-charcoal">
                {pkg.includes.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-2.5 h-px w-4 shrink-0 bg-gold"
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <ButtonLink
                href="#enquire"
                variant="secondary"
                className="mt-8 w-full"
              >
                Enquire about {pkg.tier}
              </ButtonLink>
            </article>
          ))}
        </Reveal>
      </Section>

      <Section tone="dark">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <SectionHeading
              tone="dark"
              eyebrow="On the day"
              title="A calm on-site presence"
              intro="Your coordinator arrives before the first vehicle and stays until the last guest is away. Drivers hold their positions, engines quiet, doors opened on cue."
              data-reveal
            />
          </Reveal>

          <Reveal className="grid gap-8 sm:grid-cols-2">
            {[
              {
                title: "Rehearsed timings",
                body: "Built with your planner, allowing for the photographs that always run long.",
              },
              {
                title: "Guest transport",
                body: "Shuttle planning between ceremony, reception and hotels, on one schedule.",
              },
              {
                title: "Golden hour by design",
                body: "We work the light into the route, not around it.",
              },
              {
                title: "One number to call",
                body: "Your coordinator's, from the first conversation to the final drop-off.",
              },
            ].map((item) => (
              <div key={item.title} data-reveal>
                <RingsIcon className="h-6 w-6 text-gold" />
                <h3 className="font-sans mt-4 text-[17px] font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-[15px] leading-[1.7] text-white/70">
                  {item.body}
                </p>
              </div>
            ))}
          </Reveal>
        </div>
      </Section>

      <Section tone="grey" id="enquire">
        <Reveal className="mx-auto max-w-3xl text-center">
          <div data-reveal className="text-left">
            <RationaleNote label="Every detail, minded">
              The division borrows RSSkyler&rsquo;s full visual system — same
              palette, same typefaces — and warms the voice. It is a
              specialised extension of the brand, not a separate one.
            </RationaleNote>
          </div>
          <h2
            data-reveal
            className="font-display mt-12 text-[26px] font-semibold text-midnight md:text-[34px]"
          >
            Tell us the date.
          </h2>
          <p data-reveal className="mt-4 text-[17px] leading-[1.7] text-charcoal">
            We will hold provisional vehicles for seven days while you decide.
          </p>
          <div data-reveal className="mt-9 flex flex-wrap justify-center gap-4">
            <ButtonLink
              href="mailto:weddings@rsskylerlimo.com"
              variant="cta"
              size="lg"
            >
              Start a wedding enquiry
            </ButtonLink>
            <ButtonLink href="/fleet" variant="secondary" size="lg">
              See the fleet
            </ButtonLink>
          </div>
        </Reveal>
      </Section>
    </>
  );
}

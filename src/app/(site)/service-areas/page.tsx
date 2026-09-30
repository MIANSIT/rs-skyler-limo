import type { Metadata } from "next";
import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/page-header";
import { ButtonLink } from "@/components/ui/button";
import { MapPinIcon } from "@/components/ui/icon";
import { Section, SectionHeading } from "@/components/ui/section";
import { airportPageHref, airportPages } from "@/lib/airport-pages";
import { serviceAreas } from "@/lib/content";
import { CtaBand } from "@/components/site/cta-band";

export const metadata: Metadata = {
  title: "Service Areas",
  description:
    "Chauffeured car service across Manhattan, Brooklyn, Queens, the Bronx and Staten Island, with fixed airport fares from every borough. Trips beyond the city are quoted.",
};

/**
 * Only the places the business has confirmed it serves: the five boroughs.
 *
 * The brief forbids listing neighbourhoods that are not actually served, so
 * none are listed until the operator supplies them — `neighbourhoods` in
 * `serviceAreas` (content.ts) is the switch. The other side of the same rule:
 * nothing here names New Jersey, Westchester or Connecticut as served. Trips
 * there are quoted, which is what the page says.
 */
export default function ServiceAreasPage() {
  return (
    <>
      <PageHeader
        eyebrow="Service areas"
        title="All five boroughs, run to one standard"
        intro="Pickups and drop-offs anywhere in Manhattan, Brooklyn, Queens, the Bronx and Staten Island. Every one of them is inside the fixed airport fare."
      />

      <Section tone="light">
        <Reveal>
          <SectionHeading
            eyebrow="Borough by borough"
            title="Where we drive"
            intro="The fixed fare to each airport is the same from anywhere in the city, so which borough you leave from changes the route, not the price."
            data-reveal
          />
        </Reveal>

        <div className="mt-12 grid gap-x-10 gap-y-2 md:grid-cols-2">
          {serviceAreas.map((area) => (
            <Reveal key={area.borough}>
              <article
                data-reveal
                className="flex h-full flex-col border-t border-midnight/15 py-8"
              >
                <div className="flex items-center gap-3">
                  <MapPinIcon className="h-6 w-6 shrink-0 text-gold" />
                  <h2 className="font-display text-[22px] font-semibold text-midnight md:text-[26px]">
                    {area.borough}
                  </h2>
                </div>
                <p className="mt-4 max-w-xl text-[15px] leading-[1.7] text-charcoal">
                  {area.note}
                </p>

                {area.neighbourhoods.length > 0 ? (
                  <p className="mt-4 max-w-xl text-[15px] leading-[1.7] text-charcoal">
                    <span className="font-semibold text-midnight">
                      Including{" "}
                    </span>
                    {area.neighbourhoods.join(", ")}.
                  </p>
                ) : null}

                <p className="mt-5 font-sans text-[14px] text-charcoal">
                  <span className="font-medium tracking-[0.08em] text-charcoal/70 uppercase">
                    Nearest airports{" "}
                  </span>
                  {area.nearestAirports.map((code, index) => {
                    const page = airportPages.find((item) => item.code === code);
                    const href = airportPageHref(code);
                    return (
                      <span key={code}>
                        {index > 0 ? " · " : ""}
                        {href && page ? (
                          <Link
                            href={href}
                            className="font-medium text-midnight underline underline-offset-4"
                          >
                            {page.name}
                          </Link>
                        ) : (
                          code
                        )}
                      </span>
                    );
                  })}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="grey">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-20">
          <Reveal className="lg:col-span-7">
            <SectionHeading
              eyebrow="Beyond the city"
              title="Further than the five boroughs? We price it"
              intro="A pickup or drop-off at an address outside New York City — on Long Island, in New Jersey, in Westchester or further — is not on the fixed rate card, even on an airport run. Send us the details and a person comes back with a fare. Nothing is charged until you accept it."
              data-reveal
            />
            <div data-reveal className="mt-8">
              {/* The page's one gold action. */}
              <ButtonLink href="/quote" variant="cta" size="lg">
                Get a quote
              </ButtonLink>
            </div>
          </Reveal>
          <Reveal className="lg:col-span-5">
            <p
              data-reveal
              className="border-l-2 border-gold bg-white px-6 py-5 text-[15px] leading-[1.7] text-charcoal"
            >
              Airport transfers inside the city are priced up front.{" "}
              <Link
                href="/airport-transportation"
                className="font-medium text-midnight underline underline-offset-4"
              >
                See every airport and fare
              </Link>
              .
            </p>
          </Reveal>
        </div>
      </Section>

      <CtaBand primary="none" />
    </>
  );
}

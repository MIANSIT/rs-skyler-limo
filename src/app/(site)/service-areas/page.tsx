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
  alternates: { canonical: "/service-areas" },
  title: "Service Areas",
  description:
    "Chauffeured car service across New York City, Long Island, Westchester, New Jersey and Connecticut. Published airport fares cover Manhattan; every other trip is quoted before you travel.",
};

/**
 * Only the places the business has confirmed it serves. Since Nov 2026 the
 * client states that as New York City, Long Island, Westchester, New Jersey
 * and Connecticut — the same wording as the homepage and /contact — and the
 * page has one entry per area (`serviceAreas` in content.ts), each with the
 * airports that serve it. The borough-by-borough entries were replaced at the
 * client's request.
 *
 * The brief forbids listing neighbourhoods that are not actually served, so
 * none are listed until the operator supplies them — `neighbourhoods` in
 * `serviceAreas` (content.ts) is the switch.
 *
 * Service area and pricing are two different claims and this page has to keep
 * them apart. All five areas are served. Only
 * Manhattan carries a *published* fare (`FIXED_FARE_AREA` in
 * `api/src/services/pricing.ts`, Oct 2026); the rest are quoted. Saying "every
 * borough is inside the fixed fare", as this page used to, would now be a
 * price promise the booking form refuses to honour.
 */
export default function ServiceAreasPage() {
  return (
    <>
      <PageHeader
        eyebrow="Service areas"
        title="Serving New York City and Beyond"
        intro="Pickup and drop-off service across New York City, Long Island, Westchester, New Jersey, and Connecticut. Airport transfers to and from Manhattan carry a published fare; everywhere else a reservations agent prices the trip before you travel."
      />

      <Section tone="light">
        <Reveal>
          <SectionHeading
            eyebrow="Where we drive"
            title="Five areas, one standard"
            intro="Published airport fares cover Manhattan, and the fare to each airport is the same from anywhere on the island. Everywhere else a reservations agent prices the trip and agrees it with you first."
            data-reveal
          />
        </Reveal>

        <div className="mt-12 grid gap-x-10 gap-y-2 md:grid-cols-2">
          {serviceAreas.map((area) => (
            <Reveal key={area.area}>
              <article
                data-reveal
                className="flex h-full flex-col border-t border-midnight/15 py-8"
              >
                <div className="flex items-center gap-3">
                  <MapPinIcon className="h-6 w-6 shrink-0 text-gold" />
                  <h2 className="font-display text-[22px] font-semibold text-midnight md:text-[26px]">
                    {area.area}
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
                    Airports{" "}
                  </span>
                  {area.airports.map((code, index) => {
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
              eyebrow="Get a price"
              title="Somewhere else, or not sure? We price it"
              intro="Send us the pickup, the drop-off and the date, and a reservations agent comes back with a fare. Nothing is charged until you accept it."
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

import type { Metadata } from "next";

import { Reveal } from "@/components/motion/reveal";
import { FleetCard } from "@/components/site/fleet-card";
import { PageHeader } from "@/components/site/page-header";
import { ButtonLink } from "@/components/ui/button";
import { RationaleNote, Section, SectionHeading } from "@/components/ui/section";
import { fleet } from "@/lib/content";

export const metadata: Metadata = {
  title: "Fleet",
  description:
    "Four vehicle classes — Luxury Sedan, Luxury SUV, Premium SUV and Sprinter Van. Passengers, luggage and starting fares, stated plainly.",
};

const comparison = [
  { label: "Passengers", key: "passengers" },
  { label: "Luggage", key: "luggage" },
  { label: "From", key: "from" },
] as const;

export default function FleetPage() {
  return (
    <>
      <PageHeader
        eyebrow="The fleet"
        title="Four classes, one standard"
        intro="Every class is maintained on the same inspection cadence and driven by the same vetted chauffeurs. The difference is room, not care."
      />

      <Section tone="light">
        <Reveal className="grid gap-6 md:grid-cols-2" y={30}>
          {fleet.map((vehicle) => (
            <div key={vehicle.slug} data-reveal className="flex">
              <FleetCard vehicle={vehicle} />
            </div>
          ))}
        </Reveal>
      </Section>

      <Section tone="grey">
        <Reveal>
          <SectionHeading
            eyebrow="Side by side"
            title="Compare without calling support"
            data-reveal
          />
          <div data-reveal className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <caption className="sr-only">
                Fleet comparison by passengers, luggage capacity and starting
                fare
              </caption>
              <thead>
                <tr className="border-b border-midnight/15">
                  <th
                    scope="col"
                    className="pb-3 font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/70 uppercase"
                  >
                    Class
                  </th>
                  {comparison.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      className="pb-3 font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/70 uppercase"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fleet.map((vehicle) => (
                  <tr
                    key={vehicle.slug}
                    className="border-b border-midnight/10"
                  >
                    <th
                      scope="row"
                      className="py-4 font-sans text-[15px] font-semibold text-midnight"
                    >
                      {vehicle.name}
                    </th>
                    {comparison.map((column) => (
                      <td
                        key={column.key}
                        className="py-4 text-[15px] text-charcoal tabular-nums"
                      >
                        {vehicle[column.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p data-reveal className="mt-5 text-[13px] text-charcoal/70">
            Starting fares are for point-to-point travel within Manhattan and
            include tolls and gratuity. Your quote is fixed before you book.
          </p>
        </Reveal>
      </Section>

      <Section tone="light">
        <Reveal className="mx-auto max-w-3xl">
          <div data-reveal>
            <RationaleNote label="On photography">
              Vehicle imagery on this page will be RSSkyler&rsquo;s own fleet on
              real New York routes, shot at golden or blue hour — never stock
              photography of unrelated luxury cars. A client who has already
              ridden with us should recognise the car.
            </RationaleNote>
          </div>
          <div data-reveal className="mt-10 text-center">
            <ButtonLink href="/#book" variant="cta" size="lg">
              Get a fixed fare
            </ButtonLink>
          </div>
        </Reveal>
      </Section>
    </>
  );
}

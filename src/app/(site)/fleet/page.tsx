import type { Metadata } from "next";

import { Reveal } from "@/components/motion/reveal";
import { FleetCard } from "@/components/site/fleet-card";
import { PageHeader } from "@/components/site/page-header";
import { ButtonLink } from "@/components/ui/button";
import { RationaleNote, Section, SectionHeading } from "@/components/ui/section";
import { getFleetSafely } from "@/lib/public/fleet";
import { contact } from "@/lib/content";

export const metadata: Metadata = {
  title: "Fleet",
  description:
    "Every vehicle class with real passenger and luggage capacities, child-seat availability and starting fares. Stated plainly, before you book.",
};

function fare(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

export default async function FleetPage() {
  const fleet = await getFleetSafely();

  return (
    <>
      <PageHeader
        eyebrow="The fleet"
        title="One standard, whichever you choose"
        intro="Every class is maintained on the same inspection cadence and driven by the same vetted chauffeurs. The difference is room, not care."
      />

      <Section tone="light">
        {fleet.length === 0 ? (
          <div className="mx-auto max-w-xl text-center">
            <p className="text-[17px] leading-[1.7] text-charcoal">
              Our fleet listing is briefly unavailable. Call reservations on{" "}
              <a
                href={contact.phoneHref}
                className="text-midnight underline-offset-4 tabular-nums hover:underline"
              >
                {contact.phone}
              </a>{" "}
              and someone will talk you through the options.
            </p>
          </div>
        ) : (
          <Reveal className="grid gap-6 md:grid-cols-2" y={30}>
            {fleet.map((vehicle) => (
              <div key={vehicle.slug} data-reveal className="flex min-w-0">
                <FleetCard vehicle={vehicle} />
              </div>
            ))}
          </Reveal>
        )}
      </Section>

      {fleet.length > 0 ? (
        <Section tone="grey">
          <Reveal>
            <SectionHeading
              eyebrow="Side by side"
              title="Compare without calling support"
              data-reveal
            />
            <div data-reveal className="relative mt-10 overflow-x-auto">
              <table className="w-full min-w-[44rem] border-collapse text-left">
                <caption className="sr-only">
                  Fleet comparison by passengers, luggage, child seats and
                  starting fare
                </caption>
                <thead>
                  <tr className="border-b border-midnight/15">
                    {[
                      "Class",
                      "Passengers",
                      "Luggage",
                      "Child seats",
                      "From",
                    ].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="pb-3 font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/70 uppercase"
                      >
                        {heading}
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
                      <td className="py-4 text-[15px] text-charcoal tabular-nums">
                        Up to {vehicle.passengerCapacity}
                      </td>
                      <td className="py-4 text-[15px] text-charcoal tabular-nums">
                        {vehicle.luggageCapacity} large cases
                      </td>
                      <td className="py-4 text-[15px] text-charcoal tabular-nums">
                        {vehicle.maxChildSeats === 0
                          ? "—"
                          : `Up to ${vehicle.maxChildSeats}`}
                      </td>
                      <td className="py-4 text-[15px] text-charcoal tabular-nums">
                        {fare(vehicle.baseFareCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p data-reveal className="mt-5 text-[13px] text-charcoal/70">
              Airport transfers within the five boroughs have a published fare,
              shown before you confirm. Point-to-point and hourly travel is
              priced by a reservations agent — send the details and we come back
              with a fare. Child seats are $35 each. All fares include tolls and
              gratuity.
            </p>
          </Reveal>
        </Section>
      ) : null}

      <Section tone="light">
        <Reveal className="mx-auto max-w-3xl">
          <div data-reveal>
            <RationaleNote label="On photography">
              Vehicle imagery on this page is RSSkyler&rsquo;s own fleet on real
              New York routes, shot at golden or blue hour — never stock
              photography of unrelated luxury cars. A client who has already
              ridden with us should recognise the car.
            </RationaleNote>
          </div>
          <div data-reveal className="mt-10 text-center">
            <ButtonLink href="/book" variant="cta" size="lg">
              Get a fixed fare
            </ButtonLink>
          </div>
        </Reveal>
      </Section>
    </>
  );
}

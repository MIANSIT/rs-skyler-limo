import type { Metadata } from "next";

import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/page-header";
import { RoutePreview } from "@/components/site/route-preview";
import { TrackForm } from "@/components/site/track-form";
import { getFleetSafely } from "@/lib/public/fleet";
import { Section, SectionHeading } from "@/components/ui/section";
import { contact } from "@/lib/content";

export const metadata: Metadata = {
  title: "Track a ride",
  description:
    "Enter a booking reference to see your driver's live position, vehicle and ETA. No app required.",
};

export default async function TrackPage() {
  // Vehicle names come from the fleet the operator maintains, not a copy.
  const fleet = await getFleetSafely();
  const vehicleNames = Object.fromEntries(
    fleet.map((vehicle) => [vehicle.slug, vehicle.name]),
  );

  return (
    <>
      <PageHeader
        eyebrow="Live tracking"
        title="Where is my car"
        intro="Enter your reference and the phone number on the booking. Nothing to install, and it works on any phone."
      />

      <Section tone="light">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <SectionHeading
              eyebrow="Find a booking"
              title="Two details, nothing to install"
              data-reveal
            />
            <div data-reveal>
              <TrackForm vehicleNames={vehicleNames} />
            </div>

            <p data-reveal className="mt-6 text-[15px] leading-[1.7] text-charcoal">
              No reference to hand? Call dispatch on{" "}
              <a
                href={contact.phoneHref}
                className="text-midnight underline-offset-4 tabular-nums hover:underline"
              >
                {contact.phone}
              </a>{" "}
              — someone will look it up for you.
            </p>
          </Reveal>

          <Reveal y={30}>
            <div data-reveal>
              <p className="font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/70 uppercase">
                What you will see
              </p>
              <div className="mt-5">
                <RoutePreview />
              </div>
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}

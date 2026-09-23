import type { Metadata } from "next";

import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/page-header";
import { BookingStatusPreview } from "@/components/site/booking-status-preview";
import { TrackForm } from "@/components/site/track-form";
import { getFleetSafely } from "@/lib/public/fleet";
import { Section, SectionHeading } from "@/components/ui/section";
import { contact } from "@/lib/content";

export const metadata: Metadata = {
  title: "Track a ride",
  description:
    "Enter your booking reference and the phone number on it to see its status, pickup, vehicle and fare. No account or app required.",
};

/**
 * `?reference=` fills in the reference, so a link from an email or from the
 * confirmation screen leaves only the phone number to type. Accepted only in
 * the shape of one of our references; anything else is ignored rather than
 * echoed into the page.
 */
export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = (await searchParams).reference;
  const candidate = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  const initialReference = /^R[SQ]-[0-9A-Z]{7}$/.test(candidate) ? candidate : "";

  // Vehicle names come from the fleet the operator maintains, not a copy.
  const fleet = await getFleetSafely();
  const vehicleNames = Object.fromEntries(
    fleet.map((vehicle) => [vehicle.slug, vehicle.name]),
  );

  return (
    <>
      <PageHeader
        eyebrow="Track a ride"
        title="Check your booking"
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
              <TrackForm vehicleNames={vehicleNames} initialReference={initialReference} />
            </div>

            <p data-reveal className="mt-6 text-[15px] leading-[1.7] text-charcoal">
              No reference to hand? Call dispatch on{" "}
              <a
                href={contact.phoneHref}
                className="text-midnight underline underline-offset-4 tabular-nums"
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
              {/* The preview is drawn for a midnight ground (white text, gold
                  label), so on this light section it becomes a solid midnight
                  panel itself — no outlined card inside a midnight box. */}
              <div className="mt-5">
                <BookingStatusPreview ground="light" />
              </div>
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}

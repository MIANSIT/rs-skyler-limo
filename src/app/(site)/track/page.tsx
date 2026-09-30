import type { Metadata } from "next";

import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/page-header";
import { BookingStatusPreview } from "@/components/site/booking-status-preview";
import { TrackForm } from "@/components/site/track-form";
import { getBookingOptionsSafely, getFleetSafely } from "@/lib/public/fleet";
import { Section, SectionHeading } from "@/components/ui/section";
import { contact } from "@/lib/content";

export const metadata: Metadata = {
  title: "Track a ride",
  description:
<<<<<<< HEAD
    "Enter a booking reference to see your driver's live position, vehicle and ETA. No app required.",
  /* Per-customer and gated on a reference plus the phone number on the booking:
     there is nothing here to rank for. Matches the disallow in `robots.ts` — a
     disallowed page can still be indexed from an inbound link, and this is the
     half that actually keeps it out of the results. */
  robots: { index: false, follow: true },
=======
    "Enter your booking reference and the phone number on it to see its status, pickup, vehicle and fare. No account or app required.",
>>>>>>> ba3b8c6abf39eb34e57333e48bb082104657f731
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
  const [fleet, options] = await Promise.all([getFleetSafely(), getBookingOptionsSafely()]);
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

      {/*
        Dark, like the homepage and /book: the deep-midnight ground with the
        same slow gold wash, and the lookup and its result as glass cards.
      */}
      <Section tone="deep" className="relative overflow-clip">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-1/4 -right-1/4 h-[90%] w-[70%] rounded-full bg-[radial-gradient(closest-side,rgba(212,160,23,0.10),transparent)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-1/3 -left-1/4 h-[80%] w-[60%] rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.05),transparent)]"
        />
        <div className="relative grid gap-14 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <SectionHeading
              tone="dark"
              eyebrow="Find a booking"
              title="Two details, nothing to install"
              data-reveal
            />
            <div data-reveal>
              <TrackForm
                vehicleNames={vehicleNames}
                initialReference={initialReference}
                fleet={fleet}
                placesEnabled={options.placesEnabled}
              />
            </div>

            <p data-reveal className="mt-6 text-[15px] leading-[1.7] text-white/75">
              No reference to hand? Call dispatch on{" "}
              <a
                href={contact.phoneHref}
                className="text-white underline underline-offset-4 tabular-nums"
              >
                {contact.phone}
              </a>{" "}
              — someone will look it up for you.
            </p>
          </Reveal>

          <Reveal y={30}>
            <div data-reveal>
              <p className="font-sans text-[13px] font-medium tracking-[0.08em] text-white/60 uppercase">
                What you will see
              </p>
              <div className="mt-5">
                <BookingStatusPreview ground="dark" />
              </div>
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}

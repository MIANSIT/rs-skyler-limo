import type { Metadata } from "next";

import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/page-header";
import { RoutePreview } from "@/components/site/route-preview";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Section, SectionHeading } from "@/components/ui/section";

export const metadata: Metadata = {
  title: "Track a ride",
  description:
    "Enter a booking reference to see your driver's live position, vehicle and ETA. No app required.",
};

export default function TrackPage() {
  return (
    <>
      <PageHeader
        eyebrow="Live tracking"
        title="Where is my car"
        intro="Enter the reference from your confirmation. The link works on any phone, and it can be forwarded to an assistant or a family member who does not have the app."
      />

      <Section tone="light">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <SectionHeading
              eyebrow="Find a booking"
              title="One reference, nothing to install"
              data-reveal
            />
            <form
              data-reveal
              className="mt-8 flex flex-col gap-5 border border-midnight/10 p-6 md:p-8"
            >
              <Field
                label="Booking reference"
                id="reference"
                hint="Six characters, printed at the top of your confirmation email."
              >
                <Input
                  id="reference"
                  name="reference"
                  placeholder="RS4K2P"
                  className="tabular-nums uppercase"
                  required
                />
              </Field>
              <Field
                label="Mobile number"
                id="mobile"
                hint="The number on the booking. We send a one-time code."
              >
                <Input id="mobile" name="mobile" type="tel" required />
              </Field>
              <Button type="submit" variant="cta" className="sm:self-start">
                Show my ride
              </Button>
            </form>

            <p data-reveal className="mt-6 text-[15px] leading-[1.7] text-charcoal">
              No reference to hand? Call dispatch on{" "}
              <a
                href="tel:+12125550147"
                className="text-midnight underline-offset-4 tabular-nums hover:underline"
              >
                +1 (212) 555-0147
              </a>{" "}
              — someone answers, at any hour.
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

import type { Metadata } from "next";

import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/page-header";
import { QuoteForm } from "@/components/site/quote-form";
import { ButtonLink } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/ui/section";
import { contact } from "@/lib/content";

export const metadata: Metadata = {
  title: "Get a Quote",
  description:
    "Tell us about the trip and a reservations agent comes back with a price. Corporate travel, weddings, events and hourly charters across New York City.",
};

/**
 * The general quote surface.
 *
 * Airport transfers inside the five boroughs are priced from the published rate
 * card and should go through the booking form instead — a customer who can see
 * a fixed fare should not have to wait for a person. This page is for
 * everything the rate card does not cover, which is most of the business.
 */
export default function QuotePage() {
  return (
    <>
      <PageHeader
        eyebrow="Get a quote"
        title="Tell us about the trip and we will price it"
        intro="Anything outside the published airport fares is quoted by a person. Send the details and a reservations agent comes back with a figure — usually the same day."
      />

      <Section tone="light">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-20">
          <Reveal className="lg:col-span-5">
            <SectionHeading
              eyebrow="Before you start"
              title="Two things worth knowing"
              data-reveal
            />

            <div data-reveal className="mt-10 flex flex-col gap-8">
              <div className="border-t border-midnight/10 pt-6">
                <h3 className="font-sans text-[17px] font-semibold text-midnight">
                  Airport runs may not need a quote at all
                </h3>
                <p className="mt-3 text-[15px] leading-[1.7] text-charcoal">
                  Transfers between the five boroughs and JFK, LaGuardia,
                  Newark, Teterboro or Westchester are priced from a published
                  rate card. You will see the fare before you book.
                </p>
                <div className="mt-5">
                  <ButtonLink href="/book" variant="secondary">
                    Book an airport transfer
                  </ButtonLink>
                </div>
              </div>

              <div className="border-t border-midnight/10 pt-6">
                <h3 className="font-sans text-[17px] font-semibold text-midnight">
                  A quote is not a booking
                </h3>
                <p className="mt-3 text-[15px] leading-[1.7] text-charcoal">
                  Nothing is reserved and nothing is charged until you agree the
                  price. If the date is urgent,{" "}
                  <a
                    href={contact.phoneHref}
                    className="font-medium text-midnight underline underline-offset-4"
                  >
                    call {contact.phone}
                  </a>{" "}
                  rather than waiting on a reply.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal y={30} className="lg:col-span-7">
            <div data-reveal className="bg-grey p-6 md:p-8">
              <h2 className="font-display text-[22px] font-semibold text-midnight">
                Request a quote
              </h2>
              <p className="mt-3 mb-8 text-[15px] leading-[1.7] text-charcoal">
                The more you can tell us about the route and the timings, the
                closer the first number will be.
              </p>
              <QuoteForm defaultServiceType="other" />
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}

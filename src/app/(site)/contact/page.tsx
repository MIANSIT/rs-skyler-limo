import type { Metadata } from "next";

import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/page-header";
import { QuoteForm } from "@/components/site/quote-form";
import { ButtonLink } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/ui/section";
import { contact } from "@/lib/content";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Call, email or send the details of your trip. RSSkyler Limo serves all five boroughs of New York City.",
};

/**
 * Only what the business can stand behind: the phone, the email and the area.
 * No opening hours, no street address and no text line appear because none has
 * been confirmed — `smsEnabled` in `content.ts` is the switch for the last.
 */
export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Speak to a person, or send us the details"
        intro="Call for anything urgent. For a price on a trip, write it down once and a reservations agent comes back to you."
      />

      <Section tone="light">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-20">
          <Reveal className="lg:col-span-5">
            <SectionHeading eyebrow="Reach us" title="The direct lines" />

            <dl data-reveal className="mt-10 flex flex-col">
              <div className="border-t border-midnight/10 py-6">
                <dt className="font-sans text-[13px] font-medium tracking-[0.12em] text-charcoal/70 uppercase">
                  Phone
                </dt>
                <dd className="mt-2">
                  <a
                    href={contact.phoneHref}
                    className="font-display text-[24px] font-semibold text-midnight tabular-nums underline-offset-4 hover:underline sm:text-[28px]"
                  >
                    {contact.phone}
                  </a>
                  <p className="mt-2 text-[15px] leading-[1.7] text-charcoal">
                    The quickest way to change or confirm a trip that is
                    happening soon.
                  </p>
                </dd>
              </div>

              <div className="border-t border-midnight/10 py-6">
                <dt className="font-sans text-[13px] font-medium tracking-[0.12em] text-charcoal/70 uppercase">
                  Email
                </dt>
                <dd className="mt-2">
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-[17px] font-medium text-midnight underline underline-offset-4 [overflow-wrap:anywhere]"
                  >
                    {contact.email}
                  </a>
                  <p className="mt-2 text-[15px] leading-[1.7] text-charcoal">
                    For itineraries, invoices and anything that is easier to
                    write down.
                  </p>
                </dd>
              </div>

              {contact.smsEnabled ? (
                <div className="border-t border-midnight/10 py-6">
                  <dt className="font-sans text-[13px] font-medium tracking-[0.12em] text-charcoal/70 uppercase">
                    Text
                  </dt>
                  <dd className="mt-2">
                    <a
                      href={contact.smsHref}
                      className="text-[17px] font-medium text-midnight tabular-nums underline underline-offset-4"
                    >
                      {contact.phone}
                    </a>
                  </dd>
                </div>
              ) : null}

              <div className="border-t border-b border-midnight/10 py-6">
                <dt className="font-sans text-[13px] font-medium tracking-[0.12em] text-charcoal/70 uppercase">
                  Where we drive
                </dt>
                <dd className="mt-2 text-[17px] text-midnight">
                  {contact.serviceArea}
                </dd>
              </div>
            </dl>

            <div data-reveal className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/book" variant="secondary">
                Book an airport transfer
              </ButtonLink>
              <ButtonLink href="/track" variant="secondary">
                Track a ride
              </ButtonLink>
            </div>
          </Reveal>

          <Reveal y={30} className="lg:col-span-7">
            <div data-reveal className="bg-grey p-6 md:p-8">
              <h2 className="font-display text-[22px] font-semibold text-midnight">
                Send us the details
              </h2>
              <p className="mt-3 mb-8 text-[15px] leading-[1.7] text-charcoal">
                Tell us where, when and how many. A reservations agent replies
                with a price — nothing is reserved or charged until you agree
                it.
              </p>
              <QuoteForm defaultServiceType="other" />
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}

import type { Metadata } from "next";

import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/page-header";
import { QuoteForm } from "@/components/site/quote-form";
import { BriefcaseIcon, ShieldIcon } from "@/components/ui/icon";
import { Section, SectionHeading } from "@/components/ui/section";
import { corporateFeatures } from "@/lib/content";
import { CtaBand } from "@/components/site/cta-band";

export const metadata: Metadata = {
  title: "Corporate Accounts",
  description:
    "Monthly invoicing, fixed airport fares and a single point of contact for company travel programmes across New York City.",
};

/**
 * How an account is actually opened.
 *
 * This replaced a service-level table that published four commitments — a
 * vehicle on site ten minutes early, confirmation within five, invoices on the
 * first, and credits for anything missed. None of them were measured anywhere,
 * and the brief forbids advertising what the company does not provide. A real
 * SLA belongs here the day one is agreed and tracked.
 */
const steps = [
  {
    title: "Tell us how you travel",
    body: "Roughly how many trips a month, which airports, and who books them. The form below is enough to start.",
  },
  {
    title: "We propose a rate card",
    body: "Fixed fares for the airport routes you use most, and a basis for everything else. Written down, so procurement has something to review.",
  },
  {
    title: "One invoice a month",
    body: "Trips are billed together at the end of the month with every journey itemised against its reference.",
  },
];

export default function CorporatePage() {
  return (
    <>
      <PageHeader
        eyebrow="Your city, chauffeured"
        title="A travel program your finance team will not have to chase"
        intro="Monthly invoicing, fixed airport fares, and one named contact who knows how your organisation travels. Built for the travel manager evaluating vendors, not just the traveller in the car."
      />

      <Section tone="light">
        <Reveal>
          <SectionHeading
            eyebrow="What an account gives you"
            title="Everything a procurement review actually asks about"
            data-reveal
          />
        </Reveal>

        <Reveal className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {corporateFeatures.map((feature) => (
            <div
              key={feature.title}
              data-reveal
              className="border-t border-midnight/10 pt-6"
            >
              <h3 className="font-sans text-[17px] font-semibold text-midnight">
                {feature.title}
              </h3>
              <p className="mt-3 text-[15px] leading-[1.7] text-charcoal">
                {feature.body}
              </p>
            </div>
          ))}
        </Reveal>
      </Section>

      <Section tone="dark">
        <Reveal>
          <SectionHeading
            tone="dark"
            eyebrow="Opening an account"
            title="Three steps, and the first one is this page"
            intro="No onboarding portal and no minimum spend. A conversation, a rate card, and an invoice at the end of the month."
            data-reveal
          />
          <ol
            data-reveal
            className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
          >
            {steps.map((step, index) => (
              <li key={step.title} className="border-t border-white/15 pt-6">
                {/* Gold as a large decorative numeral is the one way it is
                    allowed to carry weight beside white text. */}
                <span
                  aria-hidden
                  className="font-display block text-[34px] leading-none font-semibold text-gold tabular-nums"
                >
                  {index + 1}
                </span>
                <h3 className="font-sans mt-4 text-[17px] font-semibold text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-[15px] leading-[1.7] text-white/70">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </Reveal>
      </Section>

      {/* `#enquire` is where the closing band's Get a quote lands. */}
      <Section tone="grey" id="enquire">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <SectionHeading
              eyebrow="Trust & safety"
              title="Stated, rather than assumed"
              intro="Discretion is a core value, so it is worth writing down what it means in practice."
              data-reveal
            />
            <ul data-reveal className="mt-8 flex flex-col gap-6">
              {[
                {
                  Icon: ShieldIcon,
                  title: "Chauffeur vetting",
                  body: "Every chauffeur is licensed and background-checked before they drive for us.",
                },
                {
                  Icon: BriefcaseIcon,
                  title: "Confidentiality",
                  body: "Conversations, routes and passenger details are not shared, logged for marketing, or discussed between bookings.",
                },
              ].map((item) => (
                <li key={item.title} className="flex gap-4">
                  <item.Icon className="mt-0.5 h-6 w-6 shrink-0 text-gold" />
                  <div>
                    <h3 className="font-sans text-[17px] font-semibold text-midnight">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-[1.7] text-charcoal">
                      {item.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal y={30}>
            <div data-reveal className="bg-white p-6 md:p-8">
              <h2 className="font-display text-[22px] font-semibold text-midnight">
                Open an account
              </h2>
              <p className="mt-3 mb-8 text-[15px] leading-[1.7] text-charcoal">
                Tell us how your organisation travels. We come back with a
                proposed rate card.
              </p>

              {/*
                This was a `<form>` with no action. Pressing the button
                navigated away and discarded the enquiry silently — no reply, no
                error, and nothing in the dashboard. It now posts to the quote
                endpoint that was already waiting for it.
              */}
              <QuoteForm
                defaultServiceType="corporate"
                lockService
                submitLabel="Request a rate card"
                showDate={false}
                detailsLabel="Monthly travel"
                detailsHint="Approximate trips per month, which airports you use most, and who does the booking."
              />
            </div>
          </Reveal>
        </div>
      </Section>

      <CtaBand eyebrow="Your city, chauffeured" title="Open an account, or book a single trip today." primary="none" quoteHref="#enquire" />
    </>
  );
}

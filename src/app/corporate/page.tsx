import type { Metadata } from "next";

import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/page-header";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { BriefcaseIcon, ShieldIcon } from "@/components/ui/icon";
import { Section, SectionHeading } from "@/components/ui/section";
import { corporateFeatures } from "@/lib/content";

export const metadata: Metadata = {
  title: "Corporate Accounts",
  description:
    "Monthly invoicing, written SLAs and a single point of contact for company travel programs across New York City.",
};

const slas = [
  { metric: "Vehicle on site", value: "10 min", note: "before scheduled pickup" },
  { metric: "Booking confirmation", value: "5 min", note: "by written reply" },
  { metric: "Dispatch reachable", value: "24/7", note: "by phone and email" },
  { metric: "Invoice issued", value: "1st", note: "of each month" },
];

export default function CorporatePage() {
  return (
    <>
      <PageHeader
        eyebrow="Your city, chauffeured"
        title="A travel program your finance team will not have to chase"
        intro="Monthly invoicing, written service levels, and one named contact who knows how your organisation travels. Built for the travel manager evaluating vendors, not just the traveller in the car."
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
            eyebrow="Service levels"
            title="Committed in writing at account setup"
            intro="Agreed numbers, not assumed ones. Anything we miss is credited without you having to ask."
            data-reveal
          />
          <dl
            data-reveal
            className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
          >
            {slas.map((sla) => (
              <div key={sla.metric} className="border-t border-white/15 pt-6">
                <dt className="font-sans text-[13px] tracking-[0.08em] text-white/55 uppercase">
                  {sla.metric}
                </dt>
                <dd className="font-display mt-3 text-[34px] leading-none font-semibold text-white tabular-nums">
                  {sla.value}
                </dd>
                <p className="mt-2 text-[13px] text-white/55">{sla.note}</p>
              </div>
            ))}
          </dl>
        </Reveal>
      </Section>

      <Section tone="grey">
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
                  body: "Background checks at hire and re-verified annually. Consistent driver assignment for repeat travellers.",
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
              <p className="mt-3 text-[15px] leading-[1.7] text-charcoal">
                Tell us how your organisation travels. We reply within one
                business day with a proposed SLA and rate card.
              </p>

              <form className="mt-8 flex flex-col gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Name" id="name">
                    <Input id="name" name="name" required />
                  </Field>
                  <Field label="Company" id="company">
                    <Input id="company" name="company" required />
                  </Field>
                  <Field label="Work email" id="email">
                    <Input id="email" name="email" type="email" required />
                  </Field>
                  <Field label="Phone" id="phone">
                    <Input id="phone" name="phone" type="tel" />
                  </Field>
                </div>
                <Field
                  label="Monthly travel"
                  id="volume"
                  hint="Approximate trips per month, and which airports you use most."
                >
                  <Textarea id="volume" name="volume" />
                </Field>
                <Button type="submit" variant="cta" className="sm:self-start">
                  Request a rate card
                </Button>
              </form>
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}

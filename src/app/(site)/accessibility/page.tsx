import type { Metadata } from "next";

import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Container, Section, SectionHeading } from "@/components/ui/section";
import { contact } from "@/lib/content";

export const metadata: Metadata = {
  title: "Accessibility",
  description:
    "Our commitment to a site that works with a keyboard, a screen reader or low vision, what we have actually built toward that, and how to tell us where it falls short.",
};

/** Reviewed alongside the terms and privacy policy; change together where they touch. */
const LAST_UPDATED = "23 September 2026";

/**
 * Written the same way as the terms and privacy pages: only what is actually
 * built. No claim of formal certification or a completed third-party audit —
 * neither has happened — and "aim for" language where that is honestly all
 * that is true yet.
 */
const built = [
  {
    title: "Real headings, in order",
    body: "Every page uses one H1 and nested headings beneath it, so a screen reader's heading list is a usable table of contents rather than a wall of identically-weighted text.",
  },
  {
    title: "Labelled forms",
    body: "Every field on the booking, quote, review and contact forms has a real label, not a placeholder standing in for one. Errors are announced next to the field they belong to, not just by colour.",
  },
  {
    title: "Operable without a mouse",
    body: "Every link, button, menu and form control is a native, focusable element. Nothing here depends on hover to reveal information or a click target too small to reach by keyboard.",
  },
  {
    title: "Contrast that is checked, not assumed",
    body: "Text colour is drawn from a small set of combinations we have measured against WCAG's contrast ratios, not picked by eye. Gold, the one colour least forgiving on this front, never carries a sentence of text on a light background.",
  },
  {
    title: "Alt text on images that mean something",
    body: "A photo of a vehicle or a chauffeur describes what it shows. A purely decorative image is marked as such, so it is skipped rather than read aloud as noise.",
  },
  {
    title: "Numbers that line up",
    body: "Fares, dates and flight times use tabular figures, so a column of numbers stays a column instead of drifting with each digit's width.",
  },
];

export default function AccessibilityPage() {
  return (
    <>
      <PageHeader
        eyebrow="Accessibility"
        title="Built to work for whoever is using it"
        intro="A site that only works for a mouse, perfect eyesight and a fast connection is not finished. This is what we have actually done about that, and where to tell us we have missed something."
      />

      <Section tone="light">
        <Reveal>
          <SectionHeading
            eyebrow="Our commitment"
            title="Aiming at WCAG 2.1, Level AA"
            intro="That is the standard we build against. We have not commissioned a formal third-party audit, so this is a statement of intent and ongoing practice — not a certificate."
            data-reveal
          />
        </Reveal>
      </Section>

      <Section tone="grey">
        <Reveal>
          <SectionHeading
            eyebrow="What that means today"
            title="Specific practices, not a general promise"
            data-reveal
          />

          <ul data-reveal className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">
            {built.map((item) => (
              <li key={item.title} className="border-t border-midnight/10 pt-6">
                <h3 className="font-sans text-[17px] font-semibold text-midnight">
                  {item.title}
                </h3>
                <p className="mt-3 text-[15px] leading-[1.7] text-charcoal">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </Reveal>
      </Section>

      <section className="bg-midnight">
        <Container className="py-20 md:py-24">
          <Reveal>
            <h2
              data-reveal
              className="font-display max-w-2xl text-[26px] leading-tight font-semibold text-white md:text-[34px]"
            >
              Found something that does not work for you?
            </h2>
            <p
              data-reveal
              className="mt-5 max-w-2xl text-[17px] leading-[1.7] text-white/75"
            >
              Tell us what page, what you were trying to do, and what happened
              instead. We will look at it and get back to you — and if you would
              rather book by phone than through the form, someone answers, at
              any hour.
            </p>

            <div data-reveal className="mt-10 flex flex-wrap items-center gap-6">
              <a
                href={`mailto:${contact.email}`}
                className="text-white underline underline-offset-4"
              >
                {contact.email}
              </a>
              <a
                href={contact.phoneHref}
                className="inline-block py-2 text-[17px] text-white underline-offset-4 tabular-nums hover:underline"
              >
                {contact.phone}
              </a>
            </div>

            <div data-reveal className="mt-10">
              <ButtonLink href="/book" variant="cta">
                Book a car
              </ButtonLink>
            </div>

            <p data-reveal className="mt-12 text-[13px] text-white/55">
              Last updated{" "}
              <span className="tabular-nums">{LAST_UPDATED}</span>.
            </p>
          </Reveal>
        </Container>
      </section>
    </>
  );
}

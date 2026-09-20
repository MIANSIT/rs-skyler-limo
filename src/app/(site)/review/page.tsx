import type { Metadata } from "next";

import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/page-header";
import { ReviewForm } from "@/components/site/review-form";
import { Section, SectionHeading } from "@/components/ui/section";
import { contact } from "@/lib/content";

export const metadata: Metadata = {
  title: "Review your trip",
  description:
    "Tell us how your trip went. Use your booking reference and the phone number on the booking.",
};

/**
 * Reviewing needs a completed booking, so the reference can arrive pre-filled
 * from the tracking page. The phone number is still asked for: a reference
 * travels in email and on paper and should not be enough on its own.
 */
export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference } = await searchParams;
  const initialReference = (reference ?? "").slice(0, 20).toUpperCase();

  return (
    <>
      <PageHeader
        eyebrow="Your review"
        title="How was your trip?"
        intro="A few honest words help us and help the next traveller. You can review a trip once it is complete."
      />

      <Section tone="light">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-20">
          <Reveal className="lg:col-span-4">
            <SectionHeading
              eyebrow="Before you start"
              title="What we ask for"
              data-reveal
            />
            <ul
              data-reveal
              className="mt-8 flex flex-col gap-3 text-[15px] leading-[1.7] text-charcoal"
            >
              {[
                "Your booking reference and the phone number on it, so only real customers review.",
                "A rating and a few sentences.",
                "We read each review before it is published.",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span aria-hidden className="mt-3 h-px w-4 shrink-0 bg-gold" />
                  {item}
                </li>
              ))}
            </ul>
            <p data-reveal className="mt-8 text-[15px] leading-[1.7] text-charcoal">
              If something went wrong and you would like us to put it right, call
              us on{" "}
              <a
                href={contact.phoneHref}
                className="font-medium text-midnight underline underline-offset-4 tabular-nums"
              >
                {contact.phone}
              </a>
              . Your review is welcome either way.
            </p>
          </Reveal>

          <Reveal y={30} className="lg:col-span-8">
            <div data-reveal>
              <ReviewForm initialReference={initialReference} />
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}

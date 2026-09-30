import type { Metadata } from "next";
import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/ui/section";
import { contact, demoReviews } from "@/lib/content";
import { getReviewsSafely } from "@/lib/public/reviews";
import { CtaBand } from "@/components/site/cta-band";

export const metadata: Metadata = {
  title: "Reviews",
  description:
    "Reviews from RSSkyler Limo customers, each tied to a completed trip and read before it is published.",
};

/**
 * Every approved review, not just the homepage's six.
 *
 * Genuine reviews only: each one was left against a completed booking and
 * approved by an operator (see `api/src/services/reviews.ts`). With none
 * approved yet, production says so plainly rather than filling the page; the
 * labelled demo set appears in development only, as on the homepage.
 *
 * Stars are midnight, never gold — a gold glyph is text, and gold text on
 * white fails contrast. Gold appears only as the rule above each quote.
 */
export default async function ReviewsPage() {
  const data = await getReviewsSafely();

  const live = data.reviews.map((review) => ({
    key: String(review.id),
    quote: review.comment,
    name: review.displayName,
    context: undefined as string | undefined,
    rating: review.rating,
    date: new Date(review.createdAt).toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      month: "long",
      year: "numeric",
    }),
  }));
  const demo = live.length === 0 && demoReviews.length > 0;
  const items = demo
    ? demoReviews.map((review, index) => ({
        key: `demo-${index}`,
        quote: review.quote,
        name: review.name,
        context: review.context,
        rating: 5,
        date: undefined as string | undefined,
      }))
    : live;

  return (
    <>
      <PageHeader
        eyebrow="Reviews"
        title="In our customers’ words"
        intro="Every review here was left against a completed trip and read by our team before it was published. We do not write them, and we do not pick only the kind ones."
      />

      <Section tone="light">
        {items.length === 0 ? (
          <Reveal className="max-w-2xl">
            <SectionHeading
              eyebrow="No reviews yet"
              title="The first ones are on their way"
              intro="We only publish reviews from customers who have completed a trip with us, so this page fills as trips are completed. Rode with us? Yours could be the first."
              data-reveal
            />
          </Reveal>
        ) : (
          <>
            <Reveal className="flex flex-wrap items-end justify-between gap-6">
              <SectionHeading
                eyebrow={demo ? "Sample layout" : "Published reviews"}
                title={demo ? "Demo reviews, development only" : "What clients say"}
                data-reveal
              />
              {!demo && data.average !== null ? (
                <p data-reveal className="font-sans text-[15px] text-charcoal">
                  <span className="text-[26px] font-semibold text-midnight tabular-nums">
                    {data.average.toFixed(1)}
                  </span>{" "}
                  out of 5 from <span className="tabular-nums">{data.count}</span>{" "}
                  {data.count === 1 ? "review" : "reviews"}
                </p>
              ) : null}
            </Reveal>

            <Reveal className="mt-12 grid gap-x-10 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
              {items.map((review) => (
                <figure
                  key={review.key}
                  data-reveal
                  className="flex flex-col border-t-2 border-gold pt-6"
                >
                  <p
                    role="img"
                    aria-label={`${review.rating} out of 5`}
                    className="text-[16px] tracking-[0.15em] text-midnight"
                  >
                    {"★".repeat(review.rating)}
                    <span className="text-midnight/20">
                      {"★".repeat(5 - review.rating)}
                    </span>
                  </p>
                  <blockquote className="font-display mt-3 flex-1 text-[17px] leading-[1.6] text-midnight italic">
                    &ldquo;{review.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-5 font-sans text-[14px] text-charcoal">
                    <span className="font-semibold text-midnight">{review.name}</span>
                    {review.context ? <span>, {review.context}</span> : null}
                    {review.date ? (
                      <span className="block text-charcoal/70">{review.date}</span>
                    ) : null}
                  </figcaption>
                </figure>
              ))}
            </Reveal>
          </>
        )}
      </Section>

      <Section tone="grey">
        <Reveal className="grid gap-10 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-7">
            <SectionHeading
              eyebrow="Leave a review"
              title="Rode with us? Tell us how it went"
              intro="You need the reference from your booking and the phone number on it, so only real customers can review. We read every one before it goes up."
              data-reveal
            />
          </div>
          <div data-reveal className="flex flex-wrap items-center gap-4 lg:col-span-5 lg:justify-end">
            {/* The page's one gold action. */}
            <ButtonLink href="/review" variant="cta" size="lg">
              Review a completed trip
            </ButtonLink>
            {data.googleReviewUrl ? (
              <ButtonLink
                href={data.googleReviewUrl}
                variant="secondary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Review us on Google
              </ButtonLink>
            ) : null}
          </div>
        </Reveal>
        <p className="mt-10 text-[15px] leading-[1.7] text-charcoal">
          Something went wrong on a trip? We would rather hear it directly — call{" "}
          <a
            href={contact.phoneHref}
            className="font-medium text-midnight tabular-nums underline underline-offset-4"
          >
            {contact.phone}
          </a>{" "}
          or use the{" "}
          <Link href="/contact" className="font-medium text-midnight underline underline-offset-4">
            contact page
          </Link>
          .
        </p>
      </Section>

      <CtaBand title="Ride with us, then tell us how it went." primary="none" />
    </>
  );
}

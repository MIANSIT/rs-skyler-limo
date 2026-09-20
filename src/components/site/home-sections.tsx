import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button";
import { MapPinIcon, PlaneIcon } from "@/components/ui/icon";
import { Section, SectionHeading } from "@/components/ui/section";
import {
  about,
  aboutIsDemo,
  bookingAirports,
  boroughs,
  demoReviews,
  faqs,
} from "@/lib/content";
import type { Airport, ReviewsResponse } from "@/lib/api/types";

/**
 * The airports come from the dashboard, so a name added or hidden there shows
 * here. When the API cannot be reached the list falls back to the static names
 * rather than rendering an empty section.
 */
export function AirportTransfers({ airports }: { airports: Airport[] }) {
  const names =
    airports.length > 0 ? airports.map((a) => a.name) : [...bookingAirports];

  return (
    <Section tone="light">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-20">
        <Reveal className="lg:col-span-6">
          <SectionHeading
            eyebrow="Airport transfers"
            title="A fixed fare between the airport and the five boroughs"
            intro="Tell us the airport, the direction and the vehicle, and the fare appears before you book. Tolls and gratuity are included."
            data-reveal
          />
          <div data-reveal className="mt-8 flex flex-wrap gap-4">
            <ButtonLink href="/book" variant="secondary">
              Book an airport transfer
            </ButtonLink>
          </div>
        </Reveal>

        <Reveal className="lg:col-span-6">
          <ul data-reveal className="grid gap-x-8 sm:grid-cols-2">
            {names.map((name) => (
              <li
                key={name}
                className="flex items-center gap-3 border-t border-midnight/10 py-4"
              >
                <PlaneIcon className="h-5 w-5 shrink-0 text-gold" />
                <span className="font-sans text-[16px] font-medium text-midnight">
                  {name}
                </span>
              </li>
            ))}
          </ul>
          <p
            data-reveal
            className="mt-6 border-t border-midnight/10 pt-5 text-[15px] leading-[1.7] text-charcoal"
          >
            Give us your flight number when you book. A trip that starts or ends
            outside New York City is quoted by a person instead.
          </p>
        </Reveal>
      </div>
    </Section>
  );
}

/**
 * Deliberately only the boroughs. The brief says a service-areas section may
 * list only places actually served, and the one thing the business has
 * confirmed is the five boroughs. Neighbourhoods and nearby towns go here once
 * the operator supplies them.
 */
export function ServiceAreas() {
  return (
    <Section tone="grey">
      <Reveal>
        <SectionHeading
          eyebrow="Where we drive"
          title="All five boroughs, run to one standard"
          intro="Pickups and drop-offs in Manhattan, Brooklyn, Queens, the Bronx and Staten Island. Somewhere further? Send us the trip and we will price it."
          data-reveal
        />
        <ul
          data-reveal
          className="mt-10 grid grid-cols-2 gap-x-8 sm:grid-cols-3 lg:grid-cols-5"
        >
          {boroughs.map((borough) => (
            <li
              key={borough}
              className="flex items-center gap-2.5 border-t border-midnight/15 py-4"
            >
              <MapPinIcon className="h-5 w-5 shrink-0 text-gold" />
              <span className="font-sans text-[16px] font-semibold text-midnight">
                {borough}
              </span>
            </li>
          ))}
        </ul>
        <div data-reveal className="mt-8">
          <ButtonLink href="/quote" variant="secondary">
            Get a quote
          </ButtonLink>
        </div>
      </Reveal>
    </Section>
  );
}

/**
 * Approved customer reviews. While there are none, the development-only demo
 * set stands in (labelled); in production the section renders nothing.
 */
export function Reviews({ data }: { data: ReviewsResponse }) {
  const live = data.reviews.slice(0, 6).map((review) => ({
    key: String(review.id),
    quote: review.comment,
    name: review.displayName,
    context: undefined as string | undefined,
    rating: review.rating,
  }));
  const demo = live.length === 0 && demoReviews.length > 0;
  const items = demo
    ? demoReviews.map((review, index) => ({
        key: `demo-${index}`,
        quote: review.quote,
        name: review.name,
        context: review.context,
        rating: 5,
      }))
    : live;

  if (items.length === 0) return null;

  return (
    <Section tone="light">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="In their words"
            title="What clients say"
            data-reveal
          />
          {!demo && data.average !== null ? (
            <p data-reveal className="font-sans text-[15px] text-charcoal">
              <span className="text-[22px] font-semibold text-midnight tabular-nums">
                {data.average.toFixed(1)}
              </span>{" "}
              out of 5 from <span className="tabular-nums">{data.count}</span>{" "}
              {data.count === 1 ? "review" : "reviews"}
            </p>
          ) : null}
        </div>
        {demo ? <DemoNotice>Demo reviews, development only</DemoNotice> : null}

        <div className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          {items.map((review) => (
            <figure
              key={review.key}
              data-reveal
              className="flex flex-col border-t-2 border-gold pt-6"
            >
              {/* Midnight, not gold: a gold glyph is text on white (2.4:1). */}
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
              </figcaption>
            </figure>
          ))}
        </div>

        <div data-reveal className="mt-10 flex flex-wrap gap-4">
          <ButtonLink href="/review" variant="secondary">
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
    </Section>
  );
}

export function Faq() {
  // Structured data so the answers can appear in search results. `<` is
  // escaped so a stray tag in an answer can never close the script element.
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  }).replace(/</g, "\\u003c");

  return (
    <Section tone="grey">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-20">
        <Reveal className="lg:col-span-4">
          <SectionHeading
            eyebrow="Questions"
            title="Before you book"
            intro="The answers people ask for most, matching our terms."
            data-reveal
          />
          <p data-reveal className="mt-6 text-[15px] leading-[1.7] text-charcoal">
            Something else? See the{" "}
            <Link
              href="/contact"
              className="font-medium text-midnight underline underline-offset-4"
            >
              contact page
            </Link>
            .
          </p>
        </Reveal>

        <Reveal className="lg:col-span-8">
          <div data-reveal className="border-b border-midnight/15">
            {faqs.map((item) => (
              <details
                key={item.question}
                className="group border-t border-midnight/15"
              >
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-6 py-5 font-sans text-[17px] font-semibold text-midnight [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span
                    aria-hidden
                    className="shrink-0 text-[22px] leading-none text-midnight transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="max-w-2xl pb-6 text-[15px] leading-[1.7] text-charcoal">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
    </Section>
  );
}

/** Shown only while stand-in content is on screen; never in production. */
function DemoNotice({ children }: { children: string }) {
  return (
    <p
      data-reveal
      className="mt-4 inline-block border border-midnight/30 px-3 py-1 font-sans text-[12px] font-medium tracking-[0.08em] text-charcoal uppercase"
    >
      {children}
    </p>
  );
}

/** Renders nothing until the business supplies its own story. */
export function About() {
  if (!about) return null;

  return (
    <Section tone="grey">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-20">
        <Reveal className="lg:col-span-7">
          <SectionHeading eyebrow="About us" title={about.title} data-reveal />
          {aboutIsDemo ? <DemoNotice>Demo copy, development only</DemoNotice> : null}
          <div data-reveal className="mt-8 flex max-w-2xl flex-col gap-5">
            {about.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-[16px] leading-[1.7] text-charcoal">
                {paragraph}
              </p>
            ))}
          </div>
        </Reveal>

        <Reveal className="lg:col-span-5">
          <dl data-reveal className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-1">
            {about.facts.map((fact) => (
              <div key={fact.label} className="border-t border-midnight/15 py-4">
                <dt className="font-sans text-[13px] font-medium tracking-[0.12em] text-charcoal/70 uppercase">
                  {fact.label}
                </dt>
                <dd className="mt-1 font-sans text-[17px] font-semibold text-midnight">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </Section>
  );
}

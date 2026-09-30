import type { Metadata } from "next";
import Link from "next/link";

import { Faq, faqJsonLd } from "@/components/site/home-sections";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/ui/section";
import { airportPages } from "@/lib/airport-pages";
import { faqs } from "@/lib/content";
import { CtaBand } from "@/components/site/cta-band";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Fares, tolls, cancellation, waiting time, child seats and each New York airport — answered plainly, and matching our terms.",
};

/**
 * Every question the site answers, on one page.
 *
 * Nothing here is written for this page: the general answers are `faqs` in
 * `content.ts` (the homepage's), and each airport's are its own page's, so an
 * answer changes in one place and both pages follow. The sections are stacked
 * with their own structured data switched off and the page emits one combined
 * FAQPage instead, which is what search engines expect of a single URL.
 */
export default function FaqPage() {
  const all = [...faqs, ...airportPages.flatMap((page) => page.faqs)];

  return (
    <>
      <PageHeader
        eyebrow="Questions"
        title="Answers before you book"
        intro="What a trip costs, what is included, how long we wait and how to cancel. Every answer matches our terms."
      />

      {/* Jump links: the page is long, and most visitors want one airport. */}
      <nav aria-label="Questions by topic" className="border-b border-midnight/10 bg-white">
        <Container className="flex flex-wrap gap-x-6 gap-y-2 py-5">
          {[
            { href: "#general", label: "Booking & fares" },
            ...airportPages.map((page) => ({
              href: `#${page.code.toLowerCase()}`,
              label: page.name,
            })),
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="py-1.5 font-sans text-[15px] font-medium text-midnight underline-offset-4 hover:underline"
            >
              {item.label}
            </a>
          ))}
        </Container>
      </nav>

      <Faq
        id="general"
        tone="light"
        structuredData={false}
        eyebrow="Booking & fares"
        title="The questions people ask most"
        intro="Fares, cancelling, waiting and child seats — the same answers as our terms."
        aside={
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
        }
      />

      {airportPages.map((page, index) => (
        <Faq
          key={page.code}
          id={page.code.toLowerCase()}
          tone={index % 2 === 0 ? "grey" : "light"}
          structuredData={false}
          items={page.faqs}
          eyebrow={page.eyebrow}
          title={`Flying with ${page.name}`}
          intro={page.summary}
          aside={
            <p data-reveal className="mt-6 text-[15px] leading-[1.7] text-charcoal">
              Fares and more on the{" "}
              <Link
                href={`/${page.slug}`}
                className="font-medium text-midnight underline underline-offset-4"
              >
                {page.name} page
              </Link>
              .
            </p>
          }
        />
      ))}

      <CtaBand eyebrow="Still wondering?" title="Ask a person, get a price, or book now." />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: faqJsonLd(all) }}
      />
    </>
  );
}

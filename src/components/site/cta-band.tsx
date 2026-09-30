import { Reveal } from "@/components/motion/reveal";
import { ButtonLink, ButtonLinkOnDark } from "@/components/ui/button";
import { Container, Eyebrow } from "@/components/ui/section";
import { contact } from "@/lib/content";

/**
 * The closing band on every important page: Book, Get a quote, Call.
 *
 * Midnight ground, so the one gold button is on the one ground where gold is
 * at home. Which action is gold depends on the page: `book` for pages whose job
 * is getting a car booked, `quote` where a price is the natural next step
 * (services). The other two stay outlined — one gold action per view.
 * `quoteHref` lets a page with its own enquiry form point Get a quote at it.
 *
 * `none` outlines all three. Use it where the section just above ends in the
 * page's own gold button (a form's submit, say): on a phone the two land in
 * the same screen, and the page's own action should keep the gold.
 */
export function CtaBand({
  eyebrow = "Ready when you are",
  title = "Book a car, ask for a price, or talk to a person.",
  primary = "book",
  quoteHref = "/quote",
}: {
  eyebrow?: string;
  title?: string;
  primary?: "book" | "quote" | "none";
  quoteHref?: string;
}) {
  return (
    <section className="bg-midnight">
      <Container className="border-t border-white/15 py-16 md:py-20">
        <Reveal className="flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-center">
          <div data-reveal className="max-w-xl">
            <Eyebrow tone="dark">{eyebrow}</Eyebrow>
            <p className="font-display mt-4 text-[26px] leading-tight font-semibold text-white md:text-[32px]">
              {title}
            </p>
          </div>

          <div data-reveal className="flex flex-wrap items-center gap-4">
            {primary === "book" ? (
              <>
                <ButtonLink href="/book" variant="cta" size="lg">
                  Book a car
                </ButtonLink>
                <ButtonLinkOnDark href={quoteHref}>Get a quote</ButtonLinkOnDark>
              </>
            ) : primary === "none" ? (
              <>
                <ButtonLinkOnDark href="/book">Book a car</ButtonLinkOnDark>
                <ButtonLinkOnDark href={quoteHref}>Get a quote</ButtonLinkOnDark>
              </>
            ) : (
              <>
                <ButtonLink href={quoteHref} variant="cta" size="lg">
                  Get a quote
                </ButtonLink>
                <ButtonLinkOnDark href="/book">Book a car</ButtonLinkOnDark>
              </>
            )}
            <a
              href={contact.phoneHref}
              className="inline-flex items-center px-2 py-3 font-sans text-[15px] font-medium text-white underline underline-offset-4 tabular-nums hover:text-white/80"
            >
              Call {contact.phone}
            </a>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

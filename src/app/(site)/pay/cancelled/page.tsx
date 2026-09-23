import type { Metadata } from "next";

import { PageHeader } from "@/components/site/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { contact } from "@/lib/content";

export const metadata: Metadata = {
  title: "Payment not completed",
  description: "Your booking is saved; the card payment was not completed.",
  robots: { index: false, follow: false },
};

/**
 * Where Stripe sends a customer who backs out of the payment page. The booking
 * was saved before they left for Stripe, so nothing is lost — this page says
 * so and shows where to pay later.
 */
export default async function PaymentCancelledPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = (await searchParams).reference;
  // Echoed only if it has the shape of one of our references.
  const reference =
    typeof raw === "string" && /^[A-Z]{2}-[A-Z0-9]{7}$/.test(raw) ? raw : null;

  return (
    <>
      <PageHeader
        eyebrow="Payment"
        title="Your booking is saved. It is not paid yet."
        intro="You left the card payment before it finished, so nothing was charged. Pay whenever you are ready from the tracking page, or call us."
      />

      <Section tone="light">
        <div className="max-w-2xl">
          {reference ? (
            <div className="border-t border-b border-midnight/10 py-5">
              <p className="font-sans text-[13px] font-medium tracking-[0.12em] text-charcoal/70 uppercase">
                Reference
              </p>
              <p className="font-display mt-1 text-[26px] font-semibold text-midnight tabular-nums">
                {reference}
              </p>
            </div>
          ) : null}

          <p className="mt-8 text-[15px] leading-[1.7] text-charcoal">
            On the tracking page, enter your reference and the phone number on
            the booking, then choose Pay by card.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            {/* The page's one gold action: finishing the payment. */}
            <ButtonLink
              href={reference ? `/track?reference=${reference}` : "/track"}
              variant="cta"
            >
              Pay from the tracking page
            </ButtonLink>
            <ButtonLink href={contact.phoneHref} variant="secondary">
              Call {contact.phone}
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}

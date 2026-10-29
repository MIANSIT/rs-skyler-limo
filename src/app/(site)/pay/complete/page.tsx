import { formatReference } from "@/lib/public/reference";
import type { Metadata } from "next";

import { PageHeader } from "@/components/site/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { ApiRequestError, apiFetch } from "@/lib/api/client";
import { contact, formatFare } from "@/lib/content";

export const metadata: Metadata = {
  title: "Payment",
  description: "Your card payment for an RSSkyler Limo booking.",
  robots: { index: false, follow: false },
};

type Confirmation = {
  reference: string;
  paymentStatus: "paid" | "unpaid";
  amountCents: number | null;
};

/**
 * Where Stripe sends a customer after paying.
 *
 * The session id in the URL is only a claim. The API asks Stripe whether that
 * session was actually paid before recording anything, so reloading this page,
 * or typing someone else's id into it, cannot mark a booking paid.
 */
export default async function PaymentCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = (await searchParams).session_id;
  const sessionId = typeof raw === "string" ? raw : "";

  let result: Confirmation | null = null;
  if (sessionId) {
    try {
      result = await apiFetch<Confirmation>("/api/payments/confirm", {
        method: "POST",
        body: { sessionId },
      });
    } catch (error) {
      if (!(error instanceof ApiRequestError)) throw error;
    }
  }

  const paid = result?.paymentStatus === "paid";

  return (
    <>
      <PageHeader
        eyebrow="Payment"
        title={paid ? "Paid. Your booking stands." : "We could not confirm that payment"}
        intro={
          paid
            ? "Stripe has taken the payment. There is nothing more to do before the trip."
            : `If money has left your account, it is not lost — email ${contact.email} and we will match it to your booking.`
        }
      />

      <Section tone="light">
        <div className="max-w-2xl">
          {paid ? (
            <div role="status" className="mb-10 flex gap-4 border-l-4 border-gold bg-grey px-6 py-6">
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="mt-1 size-7 shrink-0 text-midnight"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m7.5 12.5 3 3 6-6.5" />
              </svg>
              <div>
                <p className="font-display text-[24px] leading-[1.2] font-semibold text-midnight">
                  Payment successful. Thank you.
                </p>
                <p className="mt-2 text-[16px] leading-[1.7] text-charcoal">
                  Your booking is paid in full and there is nothing more to do before your trip. Keep
                  your reference number below; you can use it to track or change your booking at any
                  time.
                </p>
              </div>
            </div>
          ) : null}

          {result?.reference ? (
            <dl className="flex flex-col">
              <div className="border-t border-midnight/10 py-5">
                <dt className="font-sans text-[13px] font-medium tracking-[0.12em] text-charcoal/70 uppercase">
                  Reference
                </dt>
                <dd className="font-display mt-1 text-[26px] font-semibold text-midnight tabular-nums">
                  {formatReference(result.reference)}
                </dd>
              </div>
              {paid && result.amountCents !== null ? (
                <div className="border-t border-b border-midnight/10 py-5">
                  <dt className="font-sans text-[13px] font-medium tracking-[0.12em] text-charcoal/70 uppercase">
                    Amount paid by card
                  </dt>
                  <dd className="mt-1 font-sans text-[20px] font-semibold text-midnight tabular-nums">
                    {formatFare(result.amountCents)}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          <div className="mt-10 flex flex-wrap gap-4">
            <ButtonLink
              href={
                result?.reference ? `/track?reference=${encodeURIComponent(result.reference)}` : "/track"
              }
              variant="primary"
            >
              Track your booking
            </ButtonLink>
            <ButtonLink href={`mailto:${contact.email}`} variant="secondary">
              Email {contact.email}
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}

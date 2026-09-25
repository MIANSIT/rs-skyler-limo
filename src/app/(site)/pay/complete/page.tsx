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
            : `If money has left your account, it is not lost — call ${contact.phone} and we will match it to your booking.`
        }
      />

      <Section tone="light">
        <div className="max-w-2xl">
          {result ? (
            <dl className="flex flex-col">
              <div className="border-t border-midnight/10 py-5">
                <dt className="font-sans text-[13px] font-medium tracking-[0.12em] text-charcoal/70 uppercase">
                  Reference
                </dt>
                <dd className="font-display mt-1 text-[26px] font-semibold text-midnight tabular-nums">
                  {result.reference}
                </dd>
              </div>
              {paid && result.amountCents !== null ? (
                <div className="border-t border-b border-midnight/10 py-5">
                  <dt className="font-sans text-[13px] font-medium tracking-[0.12em] text-charcoal/70 uppercase">
                    Paid by card
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
                result ? `/track?reference=${encodeURIComponent(result.reference)}` : "/track"
              }
              variant="primary"
            >
              Track your booking
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

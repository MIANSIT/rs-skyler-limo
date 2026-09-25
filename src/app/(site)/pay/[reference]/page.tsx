import type { Metadata } from "next";

import { PageHeader } from "@/components/site/page-header";
import { PayLinkForm } from "@/components/site/pay-link-form";
import { ButtonLink } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { ApiRequestError, apiFetch } from "@/lib/api/client";
import { contact, formatFare } from "@/lib/content";

export const metadata: Metadata = {
  title: "Pay for your booking",
  description: "Pay for your RSSkyler Limo booking securely by card.",
  // A link made for one customer: never in a search index.
  robots: { index: false, follow: false },
};

/** A booking (`RS-…`) or a quote request (`RQ-…`), as the API describes it. */
type LinkedBooking = {
  kind: "booking" | "quote";
  reference: string;
  status: string;
  amountCents: number | null;
  paymentStatus: "paid" | "unpaid";
  canPay: boolean;
  // Bookings:
  pickupAt?: string;
  pickup?: string;
  destination?: string;
  vehicleName?: string;
  // Quote requests:
  serviceLabel?: string;
  eventDate?: string | null;
};

const day = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/**
 * The page a payment link opens: `/pay/RS-4K2P9WD?token=…`.
 *
 * The booking is looked up with the signed token, not a phone number — the
 * link is the credential, and it is only valid for this booking, this amount,
 * and seven days (see `api/src/lib/payment-link.ts`). What the customer sees is
 * what they are paying for; the amount charged is read from the booking again
 * when Stripe opens, never from this page.
 */
export default async function PayLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { reference } = await params;
  const raw = (await searchParams).token;
  const token = typeof raw === "string" ? raw : "";

  let booking: LinkedBooking | null = null;
  let problem = "This payment link is not valid. Call us and we will send a new one.";

  if (token) {
    try {
      booking = await apiFetch<LinkedBooking>("/api/payments/link", {
        method: "POST",
        body: { reference: decodeURIComponent(reference), token },
      });
    } catch (error) {
      if (!(error instanceof ApiRequestError)) throw error;
      problem = error.failure.message;
    }
  }

  if (!booking) {
    return (
      <>
        <PageHeader eyebrow="Payment" title="This link cannot be used" intro={problem} />
        <Section tone="light">
          <div className="flex flex-wrap gap-4">
            <ButtonLink href={contact.phoneHref} variant="primary">
              Call {contact.phone}
            </ButtonLink>
            <ButtonLink href="/track" variant="secondary">
              Track a booking
            </ButtonLink>
          </div>
        </Section>
      </>
    );
  }

  const amount = booking.amountCents !== null ? formatFare(booking.amountCents) : null;
  const paid = booking.paymentStatus === "paid";

  return (
    <>
      <PageHeader
        eyebrow={`Payment · ${booking.reference}`}
        title={
          paid
            ? `This ${booking.kind === "quote" ? "request" : "booking"} is paid`
            : `Pay for your ${booking.kind === "quote" ? "request" : "booking"}`
        }
        intro={
          paid
            ? "Thank you — the payment is in. There is nothing more to do before the trip."
            : booking.canPay
              ? `Check the ${booking.kind === "quote" ? "details" : "trip"} below, then pay by card on Stripe's secure page. Your card details go to Stripe, never to us.`
              : `This booking cannot be paid online right now. Call ${contact.phone} and we will sort it out.`
        }
      />

      <Section tone="light">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-20">
          <dl className="flex flex-col lg:col-span-7">
            {(booking.kind === "quote"
              ? [
                  { label: "Service", value: booking.serviceLabel ?? "" },
                  { label: "Date", value: booking.eventDate ? day(booking.eventDate) : "To be confirmed" },
                  { label: "Reference", value: booking.reference },
                ]
              : [
                  { label: "Pick-up", value: `${when(booking.pickupAt ?? "")} (New York time)` },
                  { label: "From", value: booking.pickup ?? "" },
                  { label: "To", value: booking.destination ?? "" },
                  { label: "Vehicle", value: booking.vehicleName ?? "" },
                ]
            ).map((row) => (
              <div key={row.label} className="border-t border-midnight/10 py-5 last:border-b">
                <dt className="font-sans text-[13px] font-medium tracking-[0.12em] text-charcoal/70 uppercase">
                  {row.label}
                </dt>
                <dd className="mt-1 font-sans text-[17px] text-midnight">{row.value}</dd>
              </div>
            ))}
          </dl>

          <div className="lg:col-span-5">
            <div className="bg-grey p-6 md:p-8">
              <p className="font-sans text-[13px] font-medium tracking-[0.12em] text-charcoal/70 uppercase">
                {paid ? "Paid" : "Amount due"}
              </p>
              <p className="font-display mt-2 text-[40px] leading-none font-semibold text-midnight tabular-nums">
                {amount ?? "—"}
              </p>
              <div className="mt-8">
                {paid ? (
                  <ButtonLink
                    href={`/track?reference=${encodeURIComponent(booking.reference)}`}
                    variant="primary"
                  >
                    Track your booking
                  </ButtonLink>
                ) : booking.canPay && amount ? (
                  <PayLinkForm reference={booking.reference} token={token} amount={amount} />
                ) : (
                  <ButtonLink href={contact.phoneHref} variant="primary">
                    Call {contact.phone}
                  </ButtonLink>
                )}
              </div>
              {!paid ? (
                <p className="mt-6 text-[14px] leading-[1.7] text-charcoal">
                  Would rather pay another way?{" "}
                  <a
                    href={contact.phoneHref}
                    className="font-medium whitespace-nowrap text-midnight underline underline-offset-4 tabular-nums"
                  >
                    Call {contact.phone}
                  </a>
                  .
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}

import { formatReference } from "@/lib/public/reference";
import type { Metadata } from "next";

import { PageHeader } from "@/components/site/page-header";
import { PayLinkBar, PayLinkForm } from "@/components/site/pay-link-form";
import { ButtonLink } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/section";
import { ApiRequestError, apiFetch } from "@/lib/api/client";
import { contact, formatFare } from "@/lib/content";
import { formatRate } from "@/lib/public/tax";

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
  /** Sales tax included. */
  amountCents: number | null;
  taxRate: number;
  taxCents: number;
  paymentStatus: "paid" | "unpaid";
  canPay: boolean;
  /** Fare plus extra charges, when the booking has any. */
  lines?: { label: string; amountCents: number; taxCents: number; paid: boolean }[];
  // Bookings:
  pickupAt?: string;
  pickup?: string;
  destination?: string;
  vehicleName?: string;
  customerName?: string;
  tripType?: string;
  serviceType?: string;
  passengers?: number;
  bags?: number;
  childSeats?: number;
  airline?: string | null;
  flightNumber?: string | null;
  airportCode?: string | null;
  notes?: string | null;
  // Quote requests:
  serviceLabel?: string;
  eventDate?: string | null;
};

const TRIP: Record<string, string> = {
  airport: "Airport transfer",
  "point-to-point": "Point to point",
  hourly: "Hourly",
};

const SERVICE: Record<string, string> = {
  personal: "Personal",
  corporate: "Corporate",
  wedding: "Wedding",
  event: "Event",
  other: "Other",
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

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
  let problem = "This payment link is not valid. Email us and we will send a new one.";

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
            <ButtonLink href={`mailto:${contact.email}`} variant="primary">
              Email {contact.email}
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
  const quote = booking.kind === "quote";
  const noun = quote ? "request" : "booking";
  const payable = !paid && booking.canPay && amount !== null;

  // The few facts that say "yes, this is my trip", shown beside the amount.
  // Everything else waits below the fold.
  const glance = quote
    ? {
        when: booking.eventDate ? day(booking.eventDate) : "Date to be confirmed",
        what: booking.serviceLabel ?? "",
      }
    : {
        when: `${when(booking.pickupAt ?? "")} · New York time`,
        what: booking.vehicleName ?? "",
      };

  const details = quote
    ? [
        { label: "Service", value: booking.serviceLabel ?? "" },
        { label: "Date", value: booking.eventDate ? day(booking.eventDate) : "To be confirmed" },
        { label: "Reference", value: formatReference(booking.reference) },
      ]
    : [
        { label: "Booked for", value: booking.customerName ?? "" },
        {
          label: "Trip",
          value: [
            TRIP[booking.tripType ?? ""] ?? booking.tripType,
            SERVICE[booking.serviceType ?? ""],
            booking.airportCode,
          ]
            .filter(Boolean)
            .join(" · "),
        },
        {
          label: "Passengers & luggage",
          value: [
            plural(booking.passengers ?? 1, "passenger"),
            plural(booking.bags ?? 0, "bag"),
            (booking.childSeats ?? 0) > 0 ? plural(booking.childSeats ?? 0, "child seat") : null,
          ]
            .filter(Boolean)
            .join(" · "),
        },
        ...(booking.airline || booking.flightNumber
          ? [{ label: "Flight", value: [booking.airline, booking.flightNumber].filter(Boolean).join(" ") }]
          : []),
        ...(booking.notes ? [{ label: "Instructions", value: booking.notes }] : []),
        { label: "Reference", value: formatReference(booking.reference) },
      ];

  return (
    // One wrapper, so the phone's pinned Pay bar can stick within this page and
    // stop before the footer.
    <div>
      {/*
        Payment first. A customer arrives from "your price is ready" to pay, so
        the amount and the button are on the first screen of a phone: no tall
        page header, no scrolling past the trip to find them. A white card on
        midnight is the strongest thing the brand's colours can do.
      */}
      <section className="bg-midnight">
        <Container className="py-8 md:py-16">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-center lg:gap-16">
            <div>
              <p className="font-sans text-[13px] font-medium tracking-[0.16em] text-gold uppercase tabular-nums">
                Payment · {formatReference(booking.reference)}
              </p>
              <h1 className="font-display mt-3 text-[30px] leading-[1.15] font-semibold text-white md:text-[44px]">
                {paid ? `This ${noun} is paid` : `Pay for your ${noun}`}
              </h1>

              <p className="mt-4 text-[16px] font-semibold text-white tabular-nums md:text-[18px]">
                {glance.when}
              </p>
              {quote ? null : (
                <p className="mt-2 text-[15px] leading-[1.6] text-white/80">
                  {booking.pickup}
                  <span aria-hidden> → </span>
                  <span className="sr-only"> to </span>
                  {booking.destination}
                </p>
              )}
              <p className="mt-1 text-[15px] text-white/70">{glance.what}</p>
            </div>

            <div className="rounded-sm border-t-4 border-gold bg-white p-6 md:p-8">
              <p className="font-sans text-[13px] font-medium tracking-[0.12em] text-charcoal/70 uppercase">
                {paid ? "Paid" : "Amount due"}
              </p>
              <p className="font-display mt-2 text-[56px] leading-none font-semibold text-midnight tabular-nums">
                {amount ?? "—"}
              </p>
              {booking.amountCents !== null && booking.taxCents > 0 && !booking.lines?.length ? (
                <p className="mt-2 font-sans text-[14px] text-charcoal tabular-nums">
                  Includes {formatFare(booking.taxCents)} sales tax ({formatRate(booking.taxRate)})
                </p>
              ) : null}

              <div id="pay-now" className="mt-6">
                {paid ? (
                  <>
                    <p className="mb-4 text-[15px] leading-[1.7] text-charcoal">
                      Thank you. The payment is in, and there is nothing more to pay.
                    </p>
                    <ButtonLink
                      href={`/track?reference=${encodeURIComponent(booking.reference)}`}
                      variant="primary"
                      size="lg"
                      className="w-full"
                    >
                      Track your {noun}
                    </ButtonLink>
                  </>
                ) : payable ? (
                  <PayLinkForm reference={booking.reference} token={token} />
                ) : (
                  <>
                    <p className="mb-4 text-[15px] leading-[1.7] text-charcoal">
                      This {noun} cannot be paid online right now. Email us and we will sort it out.
                    </p>
                    <ButtonLink
                      href={`mailto:${contact.email}`}
                      variant="primary"
                      size="lg"
                      className="w-full"
                    >
                      Email us
                    </ButtonLink>
                  </>
                )}
              </div>

              {payable ? (
                <p className="mt-3 flex items-start justify-center gap-2 text-center text-[13px] leading-[1.6] text-charcoal">
                  <svg
                    viewBox="0 0 20 20"
                    className="mt-0.5 h-4 w-4 shrink-0 text-midnight"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <rect x="4" y="9" width="12" height="8" rx="1" />
                    <path d="M7 9V6.5a3 3 0 0 1 6 0V9" />
                  </svg>
                  Secure card payment by Stripe. Your card details never reach us.
                </p>
              ) : null}

              {/* Under the button: what makes up the figure, for whoever wants it. */}
              {booking.lines && booking.lines.length > 0 ? (
                <dl className="mt-6 flex flex-col gap-1.5 border-t border-midnight/10 pt-5 font-sans text-[14px] text-charcoal tabular-nums">
                  {booking.lines.map((line, index) => (
                    <div key={`${line.label}-${index}`} className="flex justify-between gap-4">
                      <dt>
                        {line.label}
                        {line.paid ? " · paid" : ""}
                      </dt>
                      <dd>{formatFare(line.amountCents - line.taxCents)}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between gap-4">
                    <dt>Sales tax ({formatRate(booking.taxRate)})</dt>
                    <dd>{formatFare(booking.lines.reduce((sum, line) => sum + line.taxCents, 0))}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-midnight/15 pt-1.5 font-semibold text-midnight">
                    <dt>Total</dt>
                    <dd>{formatFare(booking.lines.reduce((sum, line) => sum + line.amountCents, 0))}</dd>
                  </div>
                  {booking.lines.some((line) => line.paid) ? (
                    <div className="flex justify-between gap-4">
                      <dt>Already paid</dt>
                      <dd>
                        −
                        {formatFare(
                          booking.lines
                            .filter((line) => line.paid)
                            .reduce((sum, line) => sum + line.amountCents, 0),
                        )}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}

              {!paid ? (
                <p className="mt-5 text-center text-[14px] leading-[1.7] text-charcoal">
                  Would rather pay another way?{" "}
                  <a
                    href={`mailto:${contact.email}`}
                    className="font-medium whitespace-nowrap text-midnight underline underline-offset-4"
                  >
                    Email us
                  </a>
                </p>
              ) : null}
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-white">
        <Container className="py-10 md:py-16">
          <h2 className="font-display text-[24px] font-semibold text-midnight">
            {quote ? "Your request" : "Trip details"}
          </h2>
          <dl className="mt-5 grid gap-x-12 sm:grid-cols-2">
            {details.map((row) => (
              <div key={row.label} className="border-t border-midnight/10 py-4">
                <dt className="font-sans text-[13px] font-medium tracking-[0.12em] text-charcoal/70 uppercase">
                  {row.label}
                </dt>
                <dd className="mt-1 font-sans text-[16px] text-midnight">{row.value}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {payable ? (
        <PayLinkBar reference={booking.reference} token={token} amount={amount} watchId="pay-now" />
      ) : null}
    </div>
  );
}

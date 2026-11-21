"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { CancelRecord } from "@/components/site/cancel-record";
import { ChangeRecord } from "@/components/site/change-record";
import { Button } from "@/components/ui/button";
import { glassCard } from "@/components/ui/field";
import { clsx } from "@/lib/clsx";
import type { FleetVehicle, TrackedBooking, TrackedQuote } from "@/lib/api/types";
import { contact, formatFare } from "@/lib/content";
import { payBooking } from "@/lib/public/actions";
import { formatReference } from "@/lib/public/reference";
import { formatRate } from "@/lib/public/tax";

/**
 * What a customer sees after the lookup, in the order they need it: where the
 * trip stands, what (if anything) they have to pay, then the trip itself, then
 * the small print of changing or cancelling.
 *
 * It replaces the lookup form rather than sitting under it, so on a phone the
 * result is the first thing on screen. With the lookup's gold button gone, the
 * page's one gold action is free for **Pay**, and it is only ever drawn once at
 * a time: the card's own button, or on a phone a bar pinned above the site's
 * Email/Book bar while that card is scrolled out of view.
 *
 * Everything here restates what the lookup returned. It claims no live tracking
 * and no timing the office does not control.
 */

const NY = "America/New_York";

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    timeZone: NY,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { timeZone: NY, hour: "numeric", minute: "2-digit" });

const eyebrow = "font-sans text-[13px] font-medium tracking-[0.08em] text-white/60 uppercase";
const textLink = "font-medium text-white underline underline-offset-4";

/* -------------------------------------------------------------------------- */
/* Status                                                                     */
/* -------------------------------------------------------------------------- */

type StatusView = {
  label: string;
  /** Gold while something is in progress, green once it is good news, red when it stopped. */
  dot: "gold" | "green" | "red";
  message: ReactNode;
  /** Null when the record stopped (cancelled, closed): a progress line would mislead. */
  steps: string[] | null;
  current: number;
};

function stepIndex(steps: string[] | null, step: string | undefined): number {
  return steps ? Math.max(0, steps.indexOf(step ?? "")) : 0;
}

function bookingStatus(b: TrackedBooking): StatusView {
  const quoteMode = b.pricingMode === "quote";
  const steps =
    b.status === "cancelled"
      ? null
      : quoteMode
        ? ["Received", "Priced", "Confirmed", "Completed"]
        : ["Received", "Confirmed", "Completed"];
  const at = (step: string) => stepIndex(steps, step);

  switch (b.status) {
    case "new":
      return {
        label: "Received",
        dot: "gold",
        message: quoteMode
          ? "A reservations agent will price this trip and email you."
          : "A reservations agent is reviewing it.",
        steps,
        current: at("Received"),
      };
    case "quoted":
      return {
        label: "Priced",
        dot: "gold",
        message: (
          <>
            Your fare is below. Email{" "}
            <a href={`mailto:${contact.email}`} className={textLink}>
              {contact.email}
            </a>{" "}
            to confirm the booking.
          </>
        ),
        steps,
        current: at("Priced"),
      };
    case "pending":
      return {
        label: "On hold",
        dot: "gold",
        message: "We are confirming a detail with you.",
        steps,
        current: at("Received"),
      };
    case "confirmed":
      return {
        label: "Confirmed",
        dot: "green",
        message: `Your car is booked for ${dayLabel(b.pickupAt)} at ${timeLabel(b.pickupAt)}, New York time.`,
        steps,
        current: at("Confirmed"),
      };
    case "completed":
      return {
        label: "Completed",
        dot: "green",
        message: (
          <>
            Thank you for riding with us. How was the trip?{" "}
            <Link href={`/review?reference=${encodeURIComponent(b.reference)}`} className={textLink}>
              Leave a review
            </Link>
            .
          </>
        ),
        steps,
        current: at("Completed"),
      };
    default:
      return {
        label: "Cancelled",
        dot: "red",
        message: "Email us if that is not right.",
        steps: null,
        current: 0,
      };
  }
}

function quoteStatus(q: TrackedQuote): StatusView {
  const steps = q.status === "lost" ? null : ["Received", "Priced", "Going ahead"];
  const at = (step: string) => stepIndex(steps, step);

  switch (q.status) {
    case "new":
      return {
        label: "Received",
        dot: "gold",
        message: "A reservations agent will price it and come back to you.",
        steps,
        current: at("Received"),
      };
    case "quoted":
      return {
        label: "Priced",
        dot: "gold",
        message: "A reservations agent sends the price by email. Reply to go ahead.",
        steps,
        current: at("Priced"),
      };
    case "pending":
      return {
        label: "On hold",
        dot: "gold",
        message: "We are confirming a detail with you.",
        steps,
        current: at("Received"),
      };
    case "won":
      return {
        label: "Going ahead",
        dot: "green",
        message: "We will be in touch with the details.",
        steps,
        current: at("Going ahead"),
      };
    default:
      return {
        label: "Closed",
        dot: "red",
        message: "Email us if that is not right, or if your plans change.",
        steps: null,
        current: 0,
      };
  }
}

const dotClass = { gold: "bg-gold", green: "bg-green-400", red: "bg-red-400" } as const;

function Progress({ steps, current, label }: { steps: string[]; current: number; label: string }) {
  return (
    <ol
      aria-label={label}
      className="mt-7 grid"
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={step}
            aria-current={active ? "step" : undefined}
            className="relative flex flex-col items-center gap-2 text-center"
          >
            {/* The line back to the previous step, lit up to the current one. */}
            {index > 0 ? (
              <span
                aria-hidden
                className={clsx(
                  "absolute top-1.75 right-1/2 h-px w-full",
                  index <= current ? "bg-gold/70" : "bg-white/20",
                )}
              />
            ) : null}
            <span
              aria-hidden
              className={clsx(
                "relative z-10 h-[15px] w-[15px] rounded-full border",
                done && "border-gold bg-gold",
                active && "border-gold bg-midnight-deep ring-4 ring-gold/25",
                !done && !active && "border-white/30 bg-midnight-deep",
              )}
            />
            <span
              className={clsx(
                "px-0.5 font-sans text-[12px] leading-tight sm:text-[13px]",
                active ? "font-semibold text-white" : done ? "font-medium text-white/75" : "text-white/60",
              )}
            >
              {step}
              {active ? <span className="sr-only"> (current step)</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function StatusCard({ view, kindLabel }: { view: StatusView; kindLabel: string }) {
  return (
    <section aria-labelledby="track-status" className={clsx(glassCard, "p-6 md:p-7")}>
      <p className={eyebrow}>Status</p>
      <div className="mt-3 flex items-center gap-3">
        <span aria-hidden className={clsx("h-3 w-3 shrink-0 rounded-full", dotClass[view.dot])} />
        <h2
          id="track-status"
          className="font-display text-[34px] leading-none font-semibold text-white md:text-[40px]"
        >
          {view.label}
        </h2>
      </div>
      <p className="mt-3 max-w-md text-[16px] leading-[1.6] text-white/80">{view.message}</p>
      {view.steps ? (
        <Progress steps={view.steps} current={view.current} label={`${kindLabel} progress`} />
      ) : null}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Payment                                                                    */
/* -------------------------------------------------------------------------- */

type Price = { totalCents: number; taxCents: number; taxRate: number; note?: string | null };

/** One line of what is owed: the trip fare, or an extra charge added after booking. */
type Item = { label: string; cents: number; taxCents: number; paid: boolean };

/** The money on an order that has a price. */
type Money = {
  /** The fare, for its own tax lines and the note on what it covers. */
  price: Price;
  /** The fare and every extra charge, listed only when there is an extra charge. */
  items: Item[] | null;
  /** The fare plus every extra charge, sales tax included. */
  totalCents: number;
  paidCents: number;
  /** What is still unpaid: the total less what is paid. */
  owingCents: number;
  /** What the Pay button will take. Zero when nothing can be paid online. */
  payCents: number;
};

type PaymentView =
  /** Something is owing and the customer can pay it by card now. */
  | ({ kind: "due" } & Money)
  /** Everything priced is paid. */
  | ({ kind: "paid" } & Money)
  | ({ kind: "cash" } & Money)
  /** Card was chosen but there is no online payment to offer here. */
  | ({ kind: "card-link"; message: string } & Money)
  /** A price exists but no way to pay has been set. */
  | ({ kind: "price-only"; message: string } & Money)
  | { kind: "pricing"; message: string }
  | { kind: "refund"; paidCents: number; refundedCents: number }
  | { kind: "nothing-charged" };

function bookingPayment(b: TrackedBooking): PaymentView {
  if (b.status === "cancelled") {
    return b.paidCents > 0 || b.paymentStatus === "paid"
      ? { kind: "refund", paidCents: b.paidCents, refundedCents: b.refundedCents }
      : { kind: "nothing-charged" };
  }
  if (b.quotedTotalCents === null) {
    return {
      kind: "pricing",
      message:
        "We are still pricing this trip. A reservations agent will come back to you by email, and the fare will appear here as soon as it is set.",
    };
  }
  const price: Price = {
    totalCents: b.quotedTotalCents,
    taxCents: b.taxCents,
    taxRate: b.taxRate,
    note: b.quoteNote,
  };
  const farePaid = b.paymentStatus === "paid";
  // Extra charges (waiting time, a drop-off) are paid separately from the fare,
  // so a paid fare is not the same as nothing owing. List them when there are any.
  const items: Item[] | null =
    b.charges.length > 0
      ? [
          { label: "Trip fare", cents: b.quotedTotalCents, taxCents: b.taxCents, paid: farePaid },
          ...b.charges.map((charge) => ({
            label: charge.title,
            cents: charge.amountCents,
            taxCents: charge.taxCents,
            paid: charge.paid,
          })),
        ]
      : null;
  const totalCents = items ? items.reduce((sum, item) => sum + item.cents, 0) : b.quotedTotalCents;
  const paidCents = items
    ? items.reduce((sum, item) => sum + (item.paid ? item.cents : 0), 0)
    : farePaid
      ? b.quotedTotalCents
      : 0;
  const money: Money = {
    price,
    items,
    totalCents,
    paidCents,
    owingCents: totalCents - paidCents,
    payCents: b.payCents,
  };

  if (money.owingCents === 0) return { kind: "paid", ...money };
  if (b.canPayOnline && b.payCents > 0) return { kind: "due", ...money };
  if (b.paymentMethod === "cash") return { kind: "cash", ...money };
  return {
    kind: "card-link",
    ...money,
    message: `You chose to pay by card. Email ${contact.email} if you need a payment link.`,
  };
}

function quotePayment(q: TrackedQuote): PaymentView {
  if (q.status === "lost") {
    return q.paidCents > 0 || q.paymentStatus === "paid"
      ? { kind: "refund", paidCents: q.paidCents, refundedCents: q.refundedCents }
      : { kind: "nothing-charged" };
  }
  if (q.agreedPriceCents === null) {
    return {
      kind: "pricing",
      message: "No price yet. A reservations agent will send it by email once it is worked out.",
    };
  }
  const price: Price = { totalCents: q.agreedPriceCents, taxCents: q.taxCents, taxRate: q.taxRate };
  const paid = q.paymentStatus === "paid";
  // A quote request has one price and no extra charges, and is paid from the
  // link we email rather than from this page.
  const money: Money = {
    price,
    items: null,
    totalCents: q.agreedPriceCents,
    paidCents: paid ? q.agreedPriceCents : 0,
    owingCents: paid ? 0 : q.agreedPriceCents,
    payCents: 0,
  };
  if (paid) return { kind: "paid", ...money };
  if (q.paymentMethod === "cash") return { kind: "cash", ...money };
  if (q.paymentMethod === "card") {
    return { kind: "card-link", ...money, message: "Card. Use the payment link we emailed you." };
  }
  return { kind: "price-only", ...money, message: "Reply to our email to go ahead." };
}

function Badge({ tone, children }: { tone: "green" | "gold" | "neutral"; children: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-sm border px-3 py-1 font-sans text-[12px] font-semibold tracking-[0.08em] uppercase",
        tone === "green" && "border-green-300/40 bg-green-400/10 text-green-200",
        tone === "gold" && "border-gold/60 text-gold",
        tone === "neutral" && "border-white/25 text-white/80",
      )}
    >
      {children}
    </span>
  );
}

/** The price before tax and the sales tax, as the lookup always showed them. */
function TaxLines({ price }: { price: Price }) {
  if (price.taxCents === 0 && price.taxRate === 0) return null;
  return (
    <dl className="mt-3 grid max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-[14px] text-white/75 tabular-nums">
      <dt>Before tax</dt>
      <dd className="text-right">{formatFare(price.totalCents - price.taxCents)}</dd>
      <dt>Sales tax ({formatRate(price.taxRate)})</dt>
      <dd className="text-right">{formatFare(price.taxCents)}</dd>
    </dl>
  );
}

/**
 * What the order costs and how much of it is paid. With no extra charge it is
 * the one price, as before. With extra charges it lists each line with its own
 * Paid or Not paid, so a paid fare never hides an unpaid charge, and leads with
 * what is still to pay: the figure the customer has to act on.
 */
function MoneyBlock({ view }: { view: Extract<PaymentView, { price: Price }> }) {
  const { price, items, totalCents, paidCents, owingCents } = view;

  if (!items) {
    return (
      <>
        <p className="font-display mt-3 text-[40px] leading-none font-semibold text-white tabular-nums">
          {formatFare(totalCents)}
        </p>
        <TaxLines price={price} />
        {price.note ? (
          <p className="mt-3 max-w-md text-[15px] leading-[1.7] text-white/75">{price.note}</p>
        ) : null}
      </>
    );
  }

  const taxTotal = items.reduce((sum, item) => sum + item.taxCents, 0);

  return (
    <>
      <ul className="mt-4 border-t border-white/15">
        {items.map((item, index) => (
          <li
            key={`${index}:${item.label}`}
            className="flex items-baseline justify-between gap-4 border-b border-white/15 py-3 text-[15px]"
          >
            <span className="min-w-0 text-white">{item.label}</span>
            <span className="flex shrink-0 items-baseline gap-3 tabular-nums">
              <span className="text-white">{formatFare(item.cents)}</span>
              <span
                className={clsx(
                  "w-[4.5rem] text-right text-[12px] font-semibold tracking-[0.08em] uppercase",
                  item.paid ? "text-green-200" : "text-gold",
                )}
              >
                {item.paid ? "Paid" : "Not paid"}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-[15px] tabular-nums">
        <dt className="text-white/75">Total</dt>
        <dd className="text-right text-white">{formatFare(totalCents)}</dd>
        {paidCents > 0 && owingCents > 0 ? (
          <>
            <dt className="text-white/75">Paid</dt>
            <dd className="text-right text-white">{formatFare(paidCents)}</dd>
          </>
        ) : null}
      </dl>

      {owingCents > 0 ? (
        <div className="mt-4">
          <p className={eyebrow}>Still to pay</p>
          <p className="font-display mt-1 text-[40px] leading-none font-semibold text-white tabular-nums">
            {formatFare(owingCents)}
          </p>
        </div>
      ) : null}

      {taxTotal > 0 ? (
        <p className="mt-3 text-[14px] text-white/70 tabular-nums">
          Includes {formatFare(taxTotal)} sales tax.
        </p>
      ) : null}
      {price.note ? (
        <p className="mt-3 max-w-md text-[15px] leading-[1.7] text-white/75">{price.note}</p>
      ) : null}
    </>
  );
}

function PayButton({ label, size = "lg", className }: { label: string; size?: "md" | "lg"; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="cta" size={size} disabled={pending} className={className}>
      {pending ? "Opening Stripe…" : label}
    </Button>
  );
}

/**
 * Sends the customer to Stripe. The API re-checks the reference and phone, so
 * these hidden fields grant nothing the lookup did not.
 */
function PayForm({
  reference,
  phone,
  amountCents,
  variant,
}: {
  reference: string;
  phone: string;
  amountCents: number;
  variant: "card" | "bar";
}) {
  const [error, action] = useActionState<string | null, FormData>(payBooking, null);
  const amount = formatFare(amountCents);

  if (variant === "bar") {
    return (
      <form action={action} className="mx-auto flex max-w-md flex-wrap items-center gap-x-4 gap-y-1">
        <input type="hidden" name="reference" value={reference} />
        <input type="hidden" name="phone" value={phone} />
        <div className="min-w-0">
          <p className="font-sans text-[12px] tracking-[0.08em] text-white/60 uppercase">Total</p>
          <p className="font-display text-[24px] leading-none font-semibold text-white tabular-nums">
            {amount}
          </p>
        </div>
        <PayButton label="Pay by card" size="md" className="ml-auto" />
        {error ? (
          <p role="alert" className="w-full text-[13px] text-red-300">
            {error}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <form action={action} className="mt-6 flex flex-col gap-3">
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="phone" value={phone} />
      <PayButton label={`Pay ${amount} by card`} className="w-full sm:w-auto sm:self-start" />
      <p className="text-[14px] leading-[1.6] text-white/70">
        Payment is taken securely by Stripe. Your card details never reach us.
      </p>
      {error ? (
        <p role="alert" className="text-[14px] text-red-300">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function PaymentCard({ view, reference, phone }: { view: PaymentView; reference: string; phone: string }) {
  const card = useRef<HTMLElement>(null);
  const due = view.kind === "due";
  // Whether the card is on screen. The pinned bar below shows only while it is
  // not, so there is never a second gold button next to the first.
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const element = card.current;
    if (!due || !element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? true), {
      threshold: 0.25,
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [due]);

  // Part paid is not "Not paid": say it is a balance, so a paid fare with an
  // unpaid extra charge never reads as settled or as untouched.
  const partly = "paidCents" in view && view.paidCents > 0 && "owingCents" in view && view.owingCents > 0;

  const badge =
    view.kind === "paid" ? (
      <Badge tone="green">Paid</Badge>
    ) : view.kind === "due" ? (
      <Badge tone="gold">{partly ? "Balance due" : "Not paid"}</Badge>
    ) : view.kind === "cash" ? (
      <Badge tone="neutral">Cash on delivery</Badge>
    ) : view.kind === "card-link" ? (
      <Badge tone={partly ? "gold" : "neutral"}>{partly ? "Balance due" : "Card"}</Badge>
    ) : null;

  return (
    <>
      <section ref={card} aria-labelledby="track-payment" className={clsx(glassCard, "p-6 md:p-7")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="track-payment" className={eyebrow}>
            Payment
          </h2>
          {badge}
        </div>

        {"price" in view ? <MoneyBlock view={view} /> : null}

        {view.kind === "due" ? (
          <PayForm reference={reference} phone={phone} amountCents={view.payCents} variant="card" />
        ) : null}

        {view.kind === "paid" ? (
          <p className="mt-4 text-[16px] font-semibold text-white">
            {view.items ? "Paid in full. Thank you." : "Paid. Thank you."}
          </p>
        ) : null}
        {view.kind === "cash" ? (
          <p className="mt-4 max-w-md text-[16px] leading-[1.6] text-white/80">
            Pay your chauffeur {formatFare(view.owingCents)} in cash on the day.
          </p>
        ) : null}
        {view.kind === "card-link" || view.kind === "price-only" ? (
          <p className="mt-4 max-w-md text-[16px] leading-[1.6] text-white/80">{view.message}</p>
        ) : null}
        {view.kind === "pricing" ? (
          <p className="max-w-md text-[16px] leading-[1.6] text-white/80">{view.message}</p>
        ) : null}
        {view.kind === "nothing-charged" ? (
          <p className="mt-3 max-w-md text-[16px] leading-[1.6] text-white/80">Nothing was charged.</p>
        ) : null}
        {view.kind === "refund" ? <RefundLines view={view} /> : null}
      </section>

      {due && !visible ? (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-30 border-t border-white/15 bg-midnight-deep/95 px-4 py-3 backdrop-blur md:hidden">
          <PayForm reference={reference} phone={phone} amountCents={view.payCents} variant="bar" />
        </div>
      ) : null}
    </>
  );
}

/** Where the money is after a cancellation, said plainly. */
function RefundLines({ view }: { view: Extract<PaymentView, { kind: "refund" }> }) {
  const { paidCents, refundedCents } = view;
  const all = paidCents > 0 && refundedCents >= paidCents;

  return (
    <div className="mt-3">
      <p className="font-display text-[26px] leading-tight font-semibold text-white tabular-nums">
        {all
          ? `Refunded ${formatFare(refundedCents)}`
          : refundedCents > 0
            ? `${formatFare(refundedCents)} of ${formatFare(paidCents)} refunded`
            : "Refund being arranged"}
      </p>
      <p className="mt-2 max-w-md text-[16px] leading-[1.6] text-white/80">
        {all
          ? "Your payment has been sent back. How long it takes to show on your card depends on your bank."
          : refundedCents > 0
            ? "A reservations agent will be in touch about the rest."
            : "You paid for this booking, so a reservations agent will be in touch about your refund."}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The trip                                                                   */
/* -------------------------------------------------------------------------- */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className={eyebrow}>{label}</dt>
      <dd className="mt-1 text-[15px] text-white tabular-nums">{value}</dd>
    </div>
  );
}

function BookingExtras({ b }: { b: TrackedBooking }) {
  const flight = [b.airline, b.flightNumber].filter(Boolean).join(" ");
  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      <Row label="Bags" value={String(b.bags)} />
      <Row label="Child seats" value={b.childSeats > 0 ? String(b.childSeats) : "None"} />
      {flight ? <Row label="Flight" value={flight} /> : null}
      {b.notes ? (
        <div className="sm:col-span-2">
          <Row label="Instructions" value={b.notes} />
        </div>
      ) : null}
    </dl>
  );
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m7 4 6 6-6 6" />
    </svg>
  );
}

function BookingTrip({ b, vehicleName }: { b: TrackedBooking; vehicleName: string }) {
  const hasExtras = b.bags > 0 || b.childSeats > 0 || b.airline || b.flightNumber || b.notes;

  return (
    <section aria-labelledby="track-trip" className={clsx(glassCard, "p-6 md:p-7")}>
      <h2 id="track-trip" className={eyebrow}>
        Your trip
      </h2>

      <p className="font-display mt-3 text-[28px] leading-tight font-semibold text-white tabular-nums">
        {dayLabel(b.pickupAt)}
      </p>
      <p className="mt-1 text-[16px] text-white/80 tabular-nums">{timeLabel(b.pickupAt)} · New York time</p>

      {/* From and to, joined by a line so the direction reads at a glance. */}
      <ol className="mt-6 flex flex-col">
        <li className="relative pl-7">
          <span aria-hidden className="absolute top-1.75 left-0 h-3 w-3 rounded-full border-2 border-gold" />
          <span aria-hidden className="absolute top-5 -bottom-4.5 left-1.25 w-px bg-white/25" />
          <p className={eyebrow}>Pickup</p>
          <p className="mt-1 text-[16px] leading-normal text-white">{b.pickup}</p>
        </li>
        <li className="relative mt-5 pl-7">
          <span aria-hidden className="absolute top-1.75 left-0 h-3 w-3 rounded-full bg-gold" />
          <p className={eyebrow}>Drop-off</p>
          <p className="mt-1 text-[16px] leading-normal text-white">{b.destination}</p>
        </li>
      </ol>

      <p className="mt-6 border-t border-white/15 pt-5 text-[16px] text-white tabular-nums">
        {vehicleName}
        <span className="text-white/70">
          {" "}
          · {b.passengers} {b.passengers === 1 ? "passenger" : "passengers"}
        </span>
      </p>

      {hasExtras ? (
        <>
          {/* Folded on a phone, open on a wide screen where there is room. */}
          <details className="group mt-4 border-t border-white/15 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 font-sans text-[15px] font-semibold text-white [&::-webkit-details-marker]:hidden">
              More details
              <Chevron />
            </summary>
            <div className="pt-1 pb-2">
              <BookingExtras b={b} />
            </div>
          </details>
          <div className="mt-5 hidden border-t border-white/15 pt-5 lg:block">
            <BookingExtras b={b} />
          </div>
        </>
      ) : null}
    </section>
  );
}

const quoteServiceLabels: Record<string, string> = {
  corporate: "Corporate account",
  wedding: "Wedding",
  event: "Event",
  hourly: "Hourly charter",
  other: "Other",
};

function QuoteRequest({ q }: { q: TrackedQuote }) {
  return (
    <section aria-labelledby="track-trip" className={clsx(glassCard, "p-6 md:p-7")}>
      <h2 id="track-trip" className={eyebrow}>
        Your request
      </h2>
      <p className="font-display mt-3 text-[28px] leading-tight font-semibold text-white">
        {quoteServiceLabels[q.serviceType] ?? q.serviceType}
      </p>
      <dl className="mt-6 border-t border-white/15 pt-5">
        <Row
          label="Event date"
          value={
            q.eventDate
              ? new Date(`${q.eventDate}T12:00:00Z`).toLocaleDateString("en-US", {
                  timeZone: "America/New_York",
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Not given yet"
          }
        />
      </dl>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Changing and cancelling                                                    */
/* -------------------------------------------------------------------------- */

function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 font-sans text-[15px] font-semibold text-white [&::-webkit-details-marker]:hidden">
        {title}
        <Chevron />
      </summary>
      <div className="pb-5">{children}</div>
    </details>
  );
}

function Manage({
  kind,
  reference,
  phone,
  status,
  paid,
  change,
  cancel,
  fleet,
  placesEnabled,
}: {
  kind: "booking" | "quote";
  reference: string;
  phone: string;
  status: string;
  paid: boolean;
  change: TrackedBooking["change"];
  cancel: TrackedBooking["cancel"];
  fleet: FleetVehicle[];
  placesEnabled: boolean;
}) {
  const noun = kind === "booking" ? "booking" : "request";
  const finished = ["cancelled", "completed", "won", "lost"].includes(status);
  // A completed trip has nothing left to change; its status already says so.
  const changeNote = !change.allowed && status !== "completed" ? change.reason : null;

  if (!change.allowed && !changeNote && finished) return null;

  return (
    <section aria-label={`Change or cancel this ${noun}`} className={clsx(glassCard, "px-6 py-2 md:px-7")}>
      <div className="divide-y divide-white/15">
        {change.allowed ? (
          <Disclosure title={`Change this ${noun}`}>
            <ChangeRecord
              embedded
              kind={kind}
              reference={reference}
              phone={phone}
              change={change}
              fleet={fleet}
              placesEnabled={placesEnabled}
            />
          </Disclosure>
        ) : changeNote ? (
          <p className="py-4 text-[15px] leading-[1.7] text-white/75">{changeNote}</p>
        ) : null}

        {!finished ? (
          <Disclosure title={`Cancel this ${noun}`}>
            <CancelRecord
              embedded
              kind={kind}
              reference={reference}
              phone={phone}
              status={status}
              paid={paid}
              cancel={cancel}
            />
          </Disclosure>
        ) : null}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* The whole result                                                           */
/* -------------------------------------------------------------------------- */

function RefreshButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 font-sans text-[14px] font-medium text-white underline underline-offset-4 disabled:opacity-50"
    >
      {pending ? "Refreshing…" : "Refresh"}
    </button>
  );
}

export function TrackResult({
  found,
  vehicleNames,
  fleet,
  placesEnabled,
  refreshAction,
  onLookupAnother,
}: {
  found:
    | { kind: "booking"; booking: TrackedBooking; phone: string }
    | { kind: "quote"; quote: TrackedQuote; phone: string };
  vehicleNames: Record<string, string>;
  fleet: FleetVehicle[];
  placesEnabled: boolean;
  /** The lookup's own action, so Refresh repeats it with the same two details. */
  refreshAction: (formData: FormData) => void;
  onLookupAnother: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const record = found.kind === "booking" ? found.booking : found.quote;

  // The form is gone, so the page just got shorter: put the result at the top
  // and move focus to it, which also announces it to a screen reader.
  useEffect(() => {
    container.current?.focus({ preventScroll: true });
    container.current?.scrollIntoView({ block: "start" });
  }, [found]);

  const status = found.kind === "booking" ? bookingStatus(found.booking) : quoteStatus(found.quote);
  const payment = found.kind === "booking" ? bookingPayment(found.booking) : quotePayment(found.quote);
  const kindLabel = found.kind === "booking" ? "Booking" : "Quote request";

  return (
    <div
      ref={container}
      tabIndex={-1}
      role="region"
      aria-label={`${kindLabel} ${formatReference(record.reference)}: ${status.label}`}
      // Room under the last card for the pinned Pay bar on a phone.
      className={clsx("scroll-mt-24 outline-none", payment.kind === "due" && "pb-24 md:pb-0")}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
        <p className={clsx(eyebrow, "tabular-nums")}>
          {formatReference(record.reference)} · {kindLabel}
        </p>
        <div className="flex items-center gap-6">
          <form action={refreshAction}>
            <input type="hidden" name="reference" value={record.reference} />
            <input type="hidden" name="phone" value={found.phone} />
            <RefreshButton />
          </form>
          <button
            type="button"
            onClick={onLookupAnother}
            className="min-h-11 font-sans text-[14px] font-medium text-white underline underline-offset-4"
          >
            Look up another
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-6">
          <StatusCard view={status} kindLabel={kindLabel} />
          <PaymentCard view={payment} reference={record.reference} phone={found.phone} />
        </div>

        {found.kind === "booking" ? (
          <BookingTrip
            b={found.booking}
            vehicleName={vehicleNames[found.booking.vehicleClass] ?? found.booking.vehicleClass}
          />
        ) : (
          <QuoteRequest q={found.quote} />
        )}
      </div>

      <div className="mt-6">
        {found.kind === "booking" ? (
          <Manage
            kind="booking"
            reference={found.booking.reference}
            phone={found.phone}
            status={found.booking.status}
            paid={found.booking.paymentStatus === "paid"}
            change={found.booking.change}
            cancel={found.booking.cancel}
            fleet={fleet}
            placesEnabled={placesEnabled}
          />
        ) : (
          <Manage
            kind="quote"
            reference={found.quote.reference}
            phone={found.phone}
            status={found.quote.status}
            paid={found.quote.paymentStatus === "paid"}
            change={found.quote.change}
            cancel={found.quote.cancel}
            fleet={fleet}
            placesEnabled={placesEnabled}
          />
        )}
      </div>
    </div>
  );
}

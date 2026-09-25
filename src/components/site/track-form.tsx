"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { payBooking, trackBooking, type TrackState } from "@/lib/public/actions";

const statusCopy: Record<string, string> = {
  new: "Received. A reservations agent is looking at it now.",
  quoted: "Quoted. The fare below is yours — call us to confirm the booking.",
  confirmed: "Confirmed. Your car is booked.",
  completed: "Completed. Thank you for riding with us.",
  cancelled: "Cancelled. Call dispatch if that is not right.",
  pending: "On hold while we confirm a detail with you.",
};

/** A quote request's status, in the same voice as a booking's. */
const quoteStatusCopy: Record<string, string> = {
  new: "Received. A reservations agent will price it and come back to you.",
  quoted: "Priced. A reservations agent sends the price by phone or email — reply or call to go ahead.",
  won: "Going ahead. We will be in touch with the details.",
  lost: "Closed. Call us if that is not right, or if your plans change.",
  pending: "On hold while we confirm a detail with you.",
};

const quoteServiceLabels: Record<string, string> = {
  corporate: "Corporate account",
  wedding: "Wedding",
  event: "Event",
  hourly: "Hourly charter",
  other: "Something else",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="cta" disabled={pending} className="sm:self-start">
      {pending ? "Looking…" : "Show my booking"}
    </Button>
  );
}

function PayButton({ amount }: { amount: string }) {
  const { pending } = useFormStatus();

  // Midnight, not gold: the lookup button above already holds the view's one
  // gold action.
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? "Opening Stripe…" : `Pay ${amount} by card`}
    </Button>
  );
}

/**
 * Sends the customer to Stripe for a priced, unpaid card booking. The API
 * re-checks the reference and phone, so these hidden fields grant nothing the
 * lookup did not.
 */
function PayForm({ reference, phone, amountCents }: { reference: string; phone: string; amountCents: number }) {
  const [error, action] = useActionState<string | null, FormData>(payBooking, null);

  return (
    <form action={action} className="mt-6 flex flex-col gap-3 border-t border-midnight/10 pt-6">
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="phone" value={phone} />
      <p className="text-[15px] leading-[1.7] text-charcoal">
        You chose to pay by card. Payment is taken securely by Stripe; your
        card details never reach us.
      </p>
      <div>
        <PayButton amount={`$${Math.round(amountCents / 100)}`} />
      </div>
      {error ? (
        <p role="alert" className="text-[14px] text-red-800">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export function TrackForm({
  vehicleNames,
  initialReference = "",
}: {
  vehicleNames: Record<string, string>;
  /** From `?reference=` on a tracking link: pre-filled, phone focused. */
  initialReference?: string;
}) {
  const [state, formAction] = useActionState<TrackState, FormData>(trackBooking, {
    status: "idle",
  });

  const prior = (field: "reference" | "phone") =>
    state.status === "error"
      ? state[field]
      : field === "reference"
        ? initialReference
        : "";

  return (
    <>
      <form
        action={formAction}
        className="mt-8 flex flex-col gap-5 border border-midnight/10 p-6 md:p-8"
      >
        <Field
          label="Booking reference"
          id="reference"
          hint="From your confirmation: RS-… for a booking, RQ-… for a quote request."
        >
          <Input
            id="reference"
            name="reference"
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="RS-4K2P9WD"
            className="font-mono tracking-[0.08em] uppercase"
            defaultValue={prior("reference")}
            key={`reference:${prior("reference")}`}
          />
        </Field>

        <Field
          label="Phone number"
          id="phone"
          hint="The number on the booking. We ask for both so a reference on its own cannot open your trip."
          error={state.status === "error" ? state.message : undefined}
        >
          {/* The placeholder is a format hint for the customer's own number, so
              it stays in the 555-01xx range reserved for fiction rather than
              echoing the real support line back at them. */}
          <Input
            id="phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            // Arriving from a link, the reference is done; start on the phone.
            autoFocus={Boolean(initialReference)}
            placeholder="(212) 555-0123"
            defaultValue={prior("phone")}
            key={`phone:${prior("phone")}`}
          />
        </Field>

        <SubmitButton />
      </form>

      {state.status === "found-quote" ? (
        <div
          role="status"
          className="mt-8 border border-midnight/10 bg-grey p-6 md:p-8"
        >
          <p className="font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/70 uppercase">
            {state.quote.reference} · Quote request
          </p>
          <p className="font-display mt-2 text-[22px] leading-snug font-semibold text-midnight">
            {quoteStatusCopy[state.quote.status] ?? "We have your request."}
          </p>
          {state.quote.agreedPriceCents !== null ? (
            <div className="mt-6 border-t border-midnight/10 pt-6">
              <p className="font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/70 uppercase">
                Your price
              </p>
              <p className="font-display mt-1 text-[30px] leading-none font-semibold text-midnight tabular-nums">
                ${Math.round(state.quote.agreedPriceCents / 100)}
              </p>
              <p className="mt-3 font-sans text-[15px] text-charcoal">
                {state.quote.paymentStatus === "paid"
                  ? "Paid. Thank you."
                  : state.quote.paymentMethod === "cash"
                    ? "Cash on delivery, to your chauffeur on the day."
                    : state.quote.paymentMethod === "card"
                      ? "Card — use the payment link we emailed you."
                      : null}
              </p>
            </div>
          ) : null}
          <dl className="mt-6 grid gap-x-8 gap-y-4 border-t border-midnight/10 pt-6 sm:grid-cols-2">
            <Row
              label="Service"
              value={quoteServiceLabels[state.quote.serviceType] ?? state.quote.serviceType}
            />
            <Row
              label="Event date"
              value={
                state.quote.eventDate
                  ? new Date(`${state.quote.eventDate}T12:00:00Z`).toLocaleDateString("en-US", {
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
        </div>
      ) : null}

      {state.status === "found" ? (
        <div
          role="status"
          className="mt-8 border border-midnight/10 bg-grey p-6 md:p-8"
        >
          <p className="font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/70 uppercase">
            {state.booking.reference}
          </p>
          <p className="font-display mt-2 text-[22px] leading-snug font-semibold text-midnight">
            {statusCopy[state.booking.status] ?? "We have your booking."}
          </p>

          {state.booking.quotedTotalCents !== null ? (
            <div className="mt-6 border-t border-midnight/10 pt-6">
              <p className="font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/70 uppercase">
                {state.booking.pricingMode === "fixed"
                  ? "Fixed fare"
                  : "Your quote"}
              </p>
              <p className="font-display mt-1 text-[30px] leading-none font-semibold text-midnight tabular-nums">
                ${Math.round(state.booking.quotedTotalCents / 100)}
              </p>
              {state.booking.quoteNote ? (
                <p className="mt-3 max-w-md text-[15px] leading-[1.7] text-charcoal">
                  {state.booking.quoteNote}
                </p>
              ) : null}
              {state.booking.paymentStatus === "paid" ? (
                <p className="mt-3 font-sans text-[15px] font-semibold text-midnight">
                  Paid. Thank you.
                </p>
              ) : null}
            </div>
          ) : state.booking.pricingMode === "quote" ? (
            <p className="mt-6 max-w-md border-t border-midnight/10 pt-6 text-[15px] leading-[1.7] text-charcoal">
              We are still pricing this trip. A reservations agent will come back
              to you by phone or email — the fare will appear here as soon as it
              is set.
            </p>
          ) : null}

          {state.booking.canPayOnline && state.booking.quotedTotalCents !== null ? (
            <PayForm
              reference={state.booking.reference}
              phone={state.phone}
              amountCents={state.booking.quotedTotalCents}
            />
          ) : null}

          {state.booking.status === "completed" ? (
            <p className="mt-6 border-t border-midnight/10 pt-6 text-[15px] leading-[1.7] text-charcoal">
              How was the trip?{" "}
              <Link
                href={`/review?reference=${encodeURIComponent(state.booking.reference)}`}
                className="font-medium text-midnight underline underline-offset-4"
              >
                Leave a review
              </Link>
              .
            </p>
          ) : null}

          <dl className="mt-6 grid gap-x-8 gap-y-4 border-t border-midnight/10 pt-6 sm:grid-cols-2">
            <Row label="Pickup" value={state.booking.pickup} />
            <Row label="Destination" value={state.booking.destination} />
            <Row
              label="Vehicle"
              value={
                vehicleNames[state.booking.vehicleClass] ??
                state.booking.vehicleClass
              }
            />
            <Row
              label="Scheduled"
              value={new Date(state.booking.pickupAt).toLocaleString("en-US", {
                timeZone: "America/New_York",
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            />
            <Row
              label="Payment"
              value={
                state.booking.paymentMethod === "cash"
                  ? "Cash on delivery"
                  : "Card (Stripe)"
              }
            />
          </dl>
        </div>
      ) : null}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/70 uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-[15px] text-midnight tabular-nums">{value}</dd>
    </div>
  );
}

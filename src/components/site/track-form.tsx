"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { trackBooking, type TrackState } from "@/lib/public/actions";

const statusCopy: Record<string, string> = {
  new: "Received. A reservations agent is looking at it now.",
  quoted: "Quoted. The fare below is yours — call us to confirm the booking.",
  confirmed: "Confirmed. Your car is booked and assigned.",
  completed: "Completed. Thank you for riding with us.",
  cancelled: "Cancelled. Call dispatch if that is not right.",
  pending: "On hold while we confirm a detail with you.",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="cta" disabled={pending} className="sm:self-start">
      {pending ? "Looking…" : "Show my booking"}
    </Button>
  );
}

export function TrackForm({ vehicleNames }: { vehicleNames: Record<string, string> }) {
  const [state, formAction] = useActionState<TrackState, FormData>(trackBooking, {
    status: "idle",
  });

  const prior = (field: "reference" | "phone") =>
    state.status === "error" ? state[field] : "";

  return (
    <>
      <form
        action={formAction}
        className="mt-8 flex flex-col gap-5 border border-midnight/10 p-6 md:p-8"
      >
        <Field
          label="Booking reference"
          id="reference"
          hint="From your confirmation, in the form RS-4K2P9WD."
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
            placeholder="(212) 555-0123"
            defaultValue={prior("phone")}
            key={`phone:${prior("phone")}`}
          />
        </Field>

        <SubmitButton />
      </form>

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
            </div>
          ) : state.booking.pricingMode === "quote" ? (
            <p className="mt-6 max-w-md border-t border-midnight/10 pt-6 text-[15px] leading-[1.7] text-charcoal">
              We are still pricing this trip. A reservations agent will come back
              to you by phone or email — the fare will appear here as soon as it
              is set.
            </p>
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
          </dl>
        </div>
      ) : null}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/60 uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-[15px] text-midnight tabular-nums">{value}</dd>
    </div>
  );
}

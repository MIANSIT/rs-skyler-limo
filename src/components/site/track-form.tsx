"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { trackBooking, type TrackState } from "@/lib/public/actions";

const statusCopy: Record<string, string> = {
  new: "Received. A reservations agent is confirming it now.",
  confirmed: "Confirmed. Your car is booked and assigned.",
  completed: "Completed. Thank you for riding with us.",
  cancelled: "Cancelled. Call dispatch if that is not right.",
  pending: "On hold while we confirm a detail with you.",
};

const vehicleNames: Record<string, string> = {
  "luxury-sedan": "Luxury Sedan",
  "luxury-suv": "Luxury SUV",
  "premium-suv": "Premium SUV",
  "sprinter-van": "Sprinter Van",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="cta"
      disabled={pending}
      className="sm:self-start"
    >
      {pending ? "Looking…" : "Show my ride"}
    </Button>
  );
}

export function TrackForm() {
  const [state, formAction] = useActionState<TrackState, FormData>(
    trackBooking,
    { status: "idle" },
  );

  return (
    <>
      <form
        action={formAction}
        className="mt-8 flex flex-col gap-5 border border-midnight/10 p-6 md:p-8"
      >
        <Field
          label="Booking reference"
          id="reference"
          hint="Printed at the top of your confirmation, in the form RS-4K2P9WD."
          error={state.status === "error" ? state.message : undefined}
        >
          <Input
            id="reference"
            name="reference"
            placeholder="RS-4K2P9WD"
            className="tabular-nums uppercase"
            autoComplete="off"
            required
            defaultValue={state.status === "error" ? state.reference : ""}
            key={state.status === "error" ? state.reference : "blank"}
          />
        </Field>

        <SubmitButton />
      </form>

      {state.status === "found" ? (
        <div
          role="status"
          className="mt-6 border-l-2 border-gold bg-grey px-6 py-5"
        >
          <p className="font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/70 uppercase">
            {state.booking.reference}
          </p>
          <p className="font-display mt-1 text-[22px] leading-tight font-semibold text-midnight">
            {statusCopy[state.booking.status] ?? "We have your booking."}
          </p>

          <dl className="mt-5 grid gap-3 text-[15px] sm:grid-cols-2">
            <div>
              <dt className="text-charcoal/60">Pickup</dt>
              <dd className="text-midnight">{state.booking.pickup}</dd>
            </div>
            <div>
              <dt className="text-charcoal/60">Destination</dt>
              <dd className="text-midnight">{state.booking.destination}</dd>
            </div>
            <div>
              <dt className="text-charcoal/60">Vehicle</dt>
              <dd className="text-midnight">
                {vehicleNames[state.booking.vehicleClass] ??
                  state.booking.vehicleClass}
              </dd>
            </div>
            <div>
              <dt className="text-charcoal/60">Scheduled</dt>
              <dd className="text-midnight tabular-nums">
                {new Intl.DateTimeFormat("en-US", {
                  timeZone: "America/New_York",
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(state.booking.pickupAt))}{" "}
                ET
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </>
  );
}

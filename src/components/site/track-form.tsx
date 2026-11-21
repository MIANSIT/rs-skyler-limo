"use client";

import { useActionState, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { Reveal } from "@/components/motion/reveal";
import { TrackResult } from "@/components/site/track-result";
import { Button } from "@/components/ui/button";
import { Field, Input, glassCard } from "@/components/ui/field";
import { clsx } from "@/lib/clsx";
import type { FleetVehicle } from "@/lib/api/types";
import { trackBooking, type TrackState } from "@/lib/public/actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="cta" disabled={pending} className="sm:self-start">
      {pending ? "Looking…" : "Show my booking"}
    </Button>
  );
}

/**
 * The lookup, and what it finds.
 *
 * Until something is found this is the two-field form beside a sample of what
 * the answer looks like. Once a booking or request is found the form steps aside
 * and the result takes the whole width: on a phone the answer is the first thing
 * on screen instead of sitting below a form that is still there. "Look up
 * another" brings the form back, and "Refresh" repeats the lookup with the same
 * two details.
 *
 * The page's heading, note and sample arrive as props so the server page keeps
 * owning its copy; they are only shown with the form.
 */
export function TrackForm({
  vehicleNames,
  initialReference = "",
  fleet,
  placesEnabled,
  heading,
  note,
  preview,
}: {
  vehicleNames: Record<string, string>;
  /** From `?reference=` on a tracking link: pre-filled, phone focused. */
  initialReference?: string;
  /** For the change form's vehicle list and address lookup. */
  fleet: FleetVehicle[];
  placesEnabled: boolean;
  heading: ReactNode;
  note: ReactNode;
  preview: ReactNode;
}) {
  const [state, formAction] = useActionState<TrackState, FormData>(trackBooking, {
    status: "idle",
  });
  // The state the customer chose to put away with "Look up another". A fresh
  // lookup, or a refresh, produces a new state object, so it shows again.
  const [putAway, setPutAway] = useState<TrackState | null>(null);

  const prior = (field: "reference" | "phone") =>
    state.status === "error"
      ? state[field]
      : field === "reference"
        ? initialReference
        : "";

  if ((state.status === "found" || state.status === "found-quote") && state !== putAway) {
    return (
      <div className="relative">
        <TrackResult
          found={
            state.status === "found"
              ? { kind: "booking", booking: state.booking, phone: state.phone }
              : { kind: "quote", quote: state.quote, phone: state.phone }
          }
          vehicleNames={vehicleNames}
          fleet={fleet}
          placesEnabled={placesEnabled}
          refreshAction={formAction}
          onLookupAnother={() => setPutAway(state)}
        />
      </div>
    );
  }

  return (
    <div className="relative grid gap-14 lg:grid-cols-2 lg:gap-20">
      <Reveal>
        {heading}
        <div data-reveal>
          <form
            action={formAction}
            className={clsx(glassCard, "mt-8 flex flex-col gap-5 p-6 md:p-8")}
          >
            <Field
              tone="dark"
              label="Booking reference"
              id="reference"
              hint="From your confirmation: the number from your confirmation, like #66465."
            >
              <Input
                tone="dark"
                id="reference"
                name="reference"
                required
                autoComplete="off"
                spellCheck={false}
                placeholder="#66465"
                className="font-mono tracking-[0.08em] uppercase"
                defaultValue={prior("reference")}
                key={`reference:${prior("reference")}`}
              />
            </Field>

            <Field
              tone="dark"
              label="Phone number"
              id="phone"
              hint="The number on the booking. We ask for both so a reference on its own cannot open your trip."
              error={state.status === "error" ? state.message : undefined}
            >
              {/* The placeholder is a format hint for the customer's own number, so
                  it stays in the 555-01xx range reserved for fiction rather than
                  echoing the real support line back at them. */}
              <Input
                tone="dark"
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
        </div>
        {note}
      </Reveal>

      <Reveal y={30}>{preview}</Reveal>
    </div>
  );
}

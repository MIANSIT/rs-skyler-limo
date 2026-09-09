"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { clsx } from "@/lib/clsx";
import { airports, fleet } from "@/lib/content";
import { submitBooking, type BookingFormState } from "@/lib/public/actions";

type TripType = "airport" | "point-to-point" | "hourly";

const tripTypes: { value: TripType; label: string }[] = [
  { value: "airport", label: "Airport" },
  { value: "point-to-point", label: "Point to point" },
  { value: "hourly", label: "Hourly" },
];

/** Base fares in whole dollars, matching the "from" prices shown on /fleet. */
const baseFare: Record<string, number> = {
  "luxury-sedan": 95,
  "luxury-suv": 135,
  "premium-suv": 185,
  "sprinter-van": 240,
};

const tripMultiplier: Record<TripType, number> = {
  airport: 1,
  "point-to-point": 0.85,
  hourly: 1.6,
};

/**
 * An indicative fare so the number is visible before booking rather than after —
 * the "upfront, fixed pricing" move from Chapter 7. It is sent with the request
 * as `quotedTotalCents` so the operator sees what the customer was shown.
 * Replace the arithmetic with a real pricing call; keep the presentation.
 */
function quote(vehicle: string, trip: TripType) {
  const base = baseFare[vehicle] ?? 0;
  return { total: Math.round(base * tripMultiplier[trip]) };
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="cta"
      size="lg"
      disabled={pending}
      className="sm:w-auto"
    >
      {pending ? "Sending…" : "Confirm pickup"}
    </Button>
  );
}

export function BookingForm() {
  const [trip, setTrip] = useState<TripType>("airport");
  const [vehicle, setVehicle] = useState(fleet[0].slug);

  const [state, formAction] = useActionState<BookingFormState, FormData>(
    submitBooking,
    { status: "idle" },
  );

  const fare = useMemo(() => quote(vehicle, trip), [vehicle, trip]);
  const vehicleName =
    fleet.find((item) => item.slug === vehicle)?.name ?? fleet[0].name;

  const fieldError = (name: string) =>
    state.status === "error" ? state.fields?.[name] : undefined;

  /**
   * React blanks a form's uncontrolled fields once its action resolves, so a
   * rejected submission would empty the whole booking. These put the
   * customer's own words back. `key` forces the remount that makes a changed
   * `defaultValue` take effect.
   */
  const prior = (name: string) =>
    state.status === "error" ? (state.values[name] ?? "") : "";

  const restore = (name: string) => ({
    defaultValue: prior(name),
    key: `${name}:${prior(name)}`,
  });

  if (state.status === "success") {
    return (
      <div className="bg-white p-6 shadow-[0_24px_60px_-24px_rgba(11,33,66,0.45)] md:p-8">
        <p className="font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/70 uppercase">
          Request received
        </p>
        <p className="font-display mt-2 text-[30px] leading-none font-semibold text-midnight tabular-nums">
          {state.reference}
        </p>
        <p className="mt-4 text-[15px] leading-[1.7] text-charcoal">
          Keep this reference. A reservations agent confirms every booking by
          reply, and you can follow it at any time on the tracking page.
        </p>
        <p className="mt-4 text-[15px] leading-[1.7] text-charcoal">
          Something to change? Call{" "}
          <a
            href="tel:+12125550147"
            className="text-midnight underline-offset-4 tabular-nums hover:underline"
          >
            +1 (212) 555-0147
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 shadow-[0_24px_60px_-24px_rgba(11,33,66,0.45)] md:p-8">
      <div
        role="tablist"
        aria-label="Trip type"
        className="flex border-b border-midnight/10"
      >
        {tripTypes.map((option) => {
          const active = trip === option.value;
          return (
            <button
              key={option.value}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setTrip(option.value)}
              className={clsx(
                "-mb-px border-b-2 px-4 py-3 font-sans text-[13px] font-medium tracking-[0.08em] uppercase transition-colors",
                active
                  ? "border-gold text-midnight"
                  : "border-transparent text-charcoal/60 hover:text-midnight",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <form action={formAction} className="mt-6 flex flex-col gap-5">
        {/* The tab is a button, not an input, so its value travels here. */}
        <input type="hidden" name="tripType" value={trip} />
        <input
          type="hidden"
          name="quotedTotalCents"
          value={fare.total * 100}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label={trip === "airport" ? "Airport" : "Pickup"}
            id="pickup"
            error={fieldError("pickup")}
          >
            {trip === "airport" ? (
              <Select
                id="pickup"
                name="pickup"
                defaultValue={prior("pickup") || airports[0]}
                key={`pickup:${prior("pickup")}`}
              >
                {airports.map((airport) => (
                  <option key={airport}>{airport}</option>
                ))}
              </Select>
            ) : (
              <Input
                id="pickup"
                name="pickup"
                placeholder="Address or landmark"
                required
                {...restore("pickup")}
              />
            )}
          </Field>

          <Field
            label={trip === "hourly" ? "Starting from" : "Destination"}
            id="destination"
            error={fieldError("destination")}
          >
            <Input
              id="destination"
              name="destination"
              placeholder="Address or landmark"
              required
              {...restore("destination")}
            />
          </Field>

          <Field label="Date" id="date" error={fieldError("pickupAt")}>
            <Input id="date" name="date" type="date" required {...restore("date")} />
          </Field>

          <Field label="Time" id="time">
            <Input id="time" name="time" type="time" required {...restore("time")} />
          </Field>

          <Field label="Vehicle class" id="vehicle">
            <Select
              id="vehicle"
              name="vehicle"
              value={vehicle}
              onChange={(event) => setVehicle(event.target.value)}
            >
              {fleet.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name} · up to {item.passengers.replace("Up to ", "")}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Flight number"
            id="flight"
            hint={
              trip === "airport"
                ? "We track it. If the flight moves, your pickup moves with it."
                : undefined
            }
          >
            <Input
              id="flight"
              name="flight"
              placeholder="Optional"
              disabled={trip !== "airport"}
              className={trip !== "airport" ? "opacity-50" : undefined}
              {...restore("flight")}
            />
          </Field>

          <Field label="Passengers" id="passengers">
            <Input
              id="passengers"
              name="passengers"
              type="number"
              min={1}
              max={14}
              className="tabular-nums"
              defaultValue={prior("passengers") || 1}
              key={`passengers:${prior("passengers")}`}
            />
          </Field>

          <Field label="Bags" id="bags">
            <Input
              id="bags"
              name="bags"
              type="number"
              min={0}
              max={20}
              className="tabular-nums"
              defaultValue={prior("bags") || 0}
              key={`bags:${prior("bags")}`}
            />
          </Field>
        </div>

        <div className="grid gap-5 border-t border-midnight/10 pt-5 sm:grid-cols-2">
          <Field label="Name" id="name" error={fieldError("customerName")}>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              required
              maxLength={160}
              {...restore("name")}
            />
          </Field>

          <Field label="Phone" id="phone" error={fieldError("customerPhone")}>
            <Input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              className="tabular-nums"
              {...restore("phone")}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Email" id="email" error={fieldError("customerEmail")}>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                {...restore("email")}
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field
              label="Anything we should know"
              id="notes"
              hint="Child seat, extra stop, a door to use. Optional."
            >
              <Textarea
                id="notes"
                name="notes"
                maxLength={5000}
                {...restore("notes")}
              />
            </Field>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-midnight/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/70 uppercase">
              Fixed fare · {vehicleName}
            </p>
            <p className="font-display mt-1 text-[30px] leading-none font-semibold text-midnight tabular-nums">
              ${fare.total}
            </p>
            <p className="mt-2 text-[13px] text-charcoal/70">
              Tolls and gratuity included. Not an estimate.
            </p>
          </div>

          <SubmitButton />
        </div>

        {state.status === "error" ? (
          <p
            role="alert"
            className="border-l-2 border-red-700 bg-red-700/5 px-4 py-3 text-[15px] text-red-800"
          >
            {state.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}

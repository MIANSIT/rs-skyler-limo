"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { clsx } from "@/lib/clsx";
import { airports, fleet } from "@/lib/content";

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
 * A placeholder quote so the fare is visible before booking rather than after —
 * the "upfront, fixed pricing" move from Chapter 7. Swap the calculation for a
 * real pricing call; keep the presentation, including the tabular figures.
 */
function quote(vehicle: string, trip: TripType) {
  const total = Math.round(baseFare[vehicle] * tripMultiplier[trip]);
  return { total, tolls: 0, gratuity: 0 };
}

export function BookingForm() {
  const [trip, setTrip] = useState<TripType>("airport");
  const [vehicle, setVehicle] = useState(fleet[0].slug);
  const [submitted, setSubmitted] = useState(false);

  const fare = useMemo(() => quote(vehicle, trip), [vehicle, trip]);
  const vehicleName =
    fleet.find((item) => item.slug === vehicle)?.name ?? fleet[0].name;

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

      <form
        className="mt-6 flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label={trip === "airport" ? "Airport" : "Pickup"}
            id="pickup"
          >
            {trip === "airport" ? (
              <Select id="pickup" name="pickup" defaultValue={airports[0]}>
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
              />
            )}
          </Field>

          <Field
            label={trip === "hourly" ? "Starting from" : "Destination"}
            id="destination"
          >
            <Input
              id="destination"
              name="destination"
              placeholder="Address or landmark"
              required
            />
          </Field>

          <Field label="Date" id="date">
            <Input id="date" name="date" type="date" required />
          </Field>

          <Field label="Time" id="time">
            <Input id="time" name="time" type="time" required />
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
            />
          </Field>
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

          <Button type="submit" variant="cta" size="lg" className="sm:w-auto">
            Confirm pickup
          </Button>
        </div>

        {submitted ? (
          <p
            role="status"
            className="border-l-2 border-green-700 bg-green-700/5 px-4 py-3 text-[15px] text-green-800"
          >
            Request received. A reservations agent confirms every booking by
            reply within five minutes.
          </p>
        ) : null}
      </form>
    </div>
  );
}

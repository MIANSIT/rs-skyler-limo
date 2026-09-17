"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  saveAirportRates,
  type PricingFormState,
} from "@/lib/admin/pricing-actions";
import type { RateGrid } from "@/lib/api/types";

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-gold px-6 py-3 font-sans text-[15px] font-semibold text-midnight transition-colors hover:bg-gold/90 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save rates"}
    </button>
  );
}

/**
 * The whole rate card as one grid, saved in a single submission.
 *
 * A cell per airport and vehicle, because that is how an operator thinks about
 * it — "what do we charge for a sedan from JFK" — and because pricing one row
 * at a time invites the half-finished card where JFK is updated and LaGuardia
 * is not.
 */
export function RateGridForm({ grid }: { grid: RateGrid }) {
  const [state, formAction] = useActionState<PricingFormState, FormData>(
    saveAirportRates,
    { status: "idle" },
  );

  const priceFor = (airportCode: string, vehicleId: number) => {
    const rate = grid.rates.find(
      (entry) => entry.airportCode === airportCode && entry.vehicleId === vehicleId,
    );
    return rate && rate.isActive ? (rate.priceCents / 100).toFixed(0) : "";
  };

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {/*
        `relative` is load-bearing, not decoration.

        The cells carry `sr-only` labels, and `sr-only` is `position: absolute`.
        With a `static` wrapper their containing block is the page, so they
        escaped the scroll box and stretched the document to the full 724px
        table width — every phone could scroll the whole dashboard sideways into
        empty space. Positioning the wrapper contains them.
      */}
      <div className="relative overflow-x-auto rounded-sm border border-midnight/10 bg-white">
        <table className="w-full min-w-[42rem] border-collapse text-left">
          <caption className="sr-only">
            Fixed airport fares in US dollars, by airport and vehicle class
          </caption>
          <thead>
            <tr className="border-b border-midnight/15">
              <th
                scope="col"
                className="px-5 py-4 font-sans text-[12px] font-medium tracking-[0.08em] text-charcoal/60 uppercase"
              >
                Airport
              </th>
              {grid.vehicles.map((vehicle) => (
                <th
                  key={vehicle.id}
                  scope="col"
                  className="px-5 py-4 font-sans text-[12px] font-medium tracking-[0.08em] text-charcoal/60 uppercase"
                >
                  {vehicle.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.airports.map((airport) => (
              <tr
                key={airport.code}
                className="border-b border-midnight/10 last:border-0"
              >
                <th
                  scope="row"
                  className="px-5 py-4 align-middle font-sans text-[15px] font-semibold text-midnight"
                >
                  {airport.code}
                  <span className="block font-normal text-[13px] text-charcoal/60">
                    {airport.name}
                  </span>
                </th>

                {grid.vehicles.map((vehicle) => {
                  const id = `rate-${airport.code}-${vehicle.id}`;
                  return (
                    <td key={vehicle.id} className="px-5 py-4 align-middle">
                      <div className="flex items-center gap-1.5">
                        <span
                          aria-hidden
                          className="font-sans text-[15px] text-charcoal/50"
                        >
                          $
                        </span>
                        <label htmlFor={id} className="sr-only">
                          {vehicle.name} from {airport.name}, US dollars
                        </label>
                        <input
                          id={id}
                          name={`rate:${airport.code}:${vehicle.id}`}
                          type="number"
                          min={0}
                          step={1}
                          inputMode="numeric"
                          placeholder="Quote"
                          defaultValue={priceFor(airport.code, vehicle.id)}
                          className="w-24 rounded-sm border border-midnight/20 bg-white px-3 py-2 font-sans text-[15px] text-midnight tabular-nums placeholder:text-charcoal/35 focus:border-midnight focus:outline-none"
                        />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="max-w-2xl font-sans text-[13px] leading-[1.6] text-charcoal/60">
        Fares are what the customer pays for the trip, tolls and gratuity
        included. Child seats are added on top at $35 each. An empty box means
        no published fare — that trip becomes a quote request instead, which is
        the safe way to be unsure.
      </p>

      <div className="flex flex-wrap items-center gap-5">
        <SaveButton />

        {state.status === "saved" ? (
          <p role="status" className="font-sans text-[14px] text-green-800">
            {state.message}
          </p>
        ) : null}

        {state.status === "error" ? (
          <p
            role="alert"
            className="border-l-2 border-red-700 bg-red-700/5 px-4 py-2.5 font-sans text-[14px] text-red-800"
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  saveZoneRates,
  type PricingFormState,
} from "@/lib/admin/pricing-actions";
import type { ZoneRateGrid } from "@/lib/api/types";

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-gold px-6 py-3 font-sans text-[15px] font-semibold text-midnight transition-colors hover:bg-gold/90 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save reference rates"}
    </button>
  );
}

/**
 * The client's own rate sheet, reproduced as an editable reference card — one
 * panel per airport, a row per region, a column per vehicle class.
 *
 * Deliberately not the same shape as `RateGridForm`: that grid has one cell
 * per airport and vehicle because it prices a single "anywhere in the five
 * boroughs" fare. This one has a cell per airport, region *and* vehicle,
 * because the sheet prices Nassau differently from Brooklyn differently from
 * Fairfield County. None of it reaches `decideFare` — see the note on
 * `saveZoneRates`.
 */
export function ZoneRateGridForm({ grid }: { grid: ZoneRateGrid }) {
  const [state, formAction] = useActionState<PricingFormState, FormData>(
    saveZoneRates,
    { status: "idle" },
  );

  const priceFor = (airportCode: string, zoneKey: string, vehicleId: number) => {
    const rate = grid.rates.find(
      (entry) =>
        entry.airportCode === airportCode &&
        entry.zoneKey === zoneKey &&
        entry.vehicleId === vehicleId,
    );
    return rate ? (rate.priceCents / 100).toFixed(0) : "";
  };

  const pricedCount = (airportCode: string) =>
    grid.rates.filter((entry) => entry.airportCode === airportCode).length;

  const cellsPerAirport = grid.zones.length * grid.vehicles.length;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        {grid.airports.map((airport) => (
          <details
            key={airport.code}
            className="group rounded-sm border border-midnight/10 bg-white"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-sans text-[15px] font-semibold text-midnight [&::-webkit-details-marker]:hidden">
              <span>
                {airport.code}
                <span className="ml-2 font-normal text-[13px] text-charcoal/60">
                  {airport.name}
                </span>
              </span>
              <span className="flex items-center gap-3 text-[13px] font-normal text-charcoal/60 tabular-nums">
                {pricedCount(airport.code)} of {cellsPerAirport} priced
                <span aria-hidden className="transition-transform group-open:rotate-180">
                  ▾
                </span>
              </span>
            </summary>

            <div className="relative overflow-x-auto border-t border-midnight/10">
              <table className="w-full min-w-[42rem] border-collapse text-left">
                <caption className="sr-only">
                  Reference fares from {airport.name}, US dollars, by region and vehicle class
                </caption>
                <thead>
                  <tr className="border-b border-midnight/15">
                    <th
                      scope="col"
                      className="px-5 py-3 font-sans text-[12px] font-medium tracking-[0.08em] text-charcoal/60 uppercase"
                    >
                      Region
                    </th>
                    {grid.vehicles.map((vehicle) => (
                      <th
                        key={vehicle.id}
                        scope="col"
                        className="px-5 py-3 font-sans text-[12px] font-medium tracking-[0.08em] text-charcoal/60 uppercase"
                      >
                        {vehicle.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.zones.map((zone) => (
                    <tr
                      key={zone.key}
                      className="border-b border-midnight/10 last:border-0"
                    >
                      <th
                        scope="row"
                        className="px-5 py-3 align-middle font-sans text-[14px] font-medium text-midnight"
                      >
                        {zone.label}
                      </th>

                      {grid.vehicles.map((vehicle) => {
                        const id = `zone-rate-${airport.code}-${zone.key}-${vehicle.id}`;
                        return (
                          <td key={vehicle.id} className="px-5 py-3 align-middle">
                            <div className="flex items-center gap-1.5">
                              <span
                                aria-hidden
                                className="font-sans text-[15px] text-charcoal/50"
                              >
                                $
                              </span>
                              <label htmlFor={id} className="sr-only">
                                {vehicle.name} from {airport.name} to {zone.label}, US dollars
                              </label>
                              <input
                                id={id}
                                name={`zone-rate:${airport.code}:${zone.key}:${vehicle.id}`}
                                type="number"
                                min={0}
                                step={1}
                                inputMode="numeric"
                                placeholder="—"
                                defaultValue={priceFor(airport.code, zone.key, vehicle.id)}
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
          </details>
        ))}
      </div>

      <p className="max-w-2xl font-sans text-[13px] leading-[1.6] text-charcoal/60">
        Reference only. Nothing on this card is shown to a customer or booked
        automatically — every trip here still comes in as a quote request. Fill
        it in as your own price list, for whoever is pricing the request by
        phone or email.
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

import type { Metadata } from "next";
import Link from "next/link";

import { RateGridForm } from "@/components/admin/rate-grid-form";
import { getRateGrid } from "@/lib/admin/dal";

export const metadata: Metadata = { title: "Airport rates" };

export default async function RatesPage() {
  const grid = await getRateGrid();
  const published = grid.rates.filter((rate) => rate.isActive).length;
  const cells = grid.airports.length * grid.vehicles.length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-[34px] leading-tight font-semibold text-midnight">
          Airport rates
        </h1>
        <p className="mt-2 max-w-2xl font-sans text-[15px] leading-[1.7] text-charcoal/70">
          Fixed fares for airport transfers inside the five boroughs. A customer
          whose trip matches a price here books it instantly at that fare.
          Everything else — point to point, hourly, anywhere outside New York
          City — comes in as a request for you to price.
        </p>
        <p className="mt-3 font-sans text-[14px] text-charcoal/60">
          <span className="font-semibold text-midnight tabular-nums">
            {published}
          </span>{" "}
          of {cells} combinations have a published fare. Leave a box empty and
          that trip is quoted instead.
        </p>
      </div>

      {grid.vehicles.length === 0 ? (
        <p className="rounded-sm border border-midnight/10 bg-white px-6 py-10 text-center font-sans text-[15px] text-charcoal/60">
          No vehicles are showing on the website yet. Add one in{" "}
          <Link href="/fleet" className="text-midnight underline underline-offset-4">
            Fleet
          </Link>{" "}
          and it appears here as a column.
        </p>
      ) : (
        <RateGridForm grid={grid} />
      )}
    </div>
  );
}

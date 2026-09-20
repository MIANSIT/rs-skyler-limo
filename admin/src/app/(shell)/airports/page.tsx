import type { Metadata } from "next";
import Link from "next/link";

import { AirportManager } from "@/components/admin/airport-manager";
import { getAirports } from "@/lib/admin/dal";

export const metadata: Metadata = { title: "Airports" };

export default async function AirportsPage() {
  const airports = await getAirports();
  const live = airports.filter((airport) => airport.isActive).length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-[34px] leading-tight font-semibold text-midnight">
          Airports
        </h1>
        <p className="mt-2 max-w-2xl font-sans text-[15px] leading-[1.7] text-charcoal/70">
          The airports customers can book a transfer to or from.{" "}
          {airports.length === 0
            ? "None yet."
            : `${live} of ${airports.length} are on the booking form.`}{" "}
          Set what each one costs on the{" "}
          <Link href="/rates" className="text-midnight underline underline-offset-4">
            Rates
          </Link>{" "}
          page — an airport with no fare simply quotes.
        </p>
      </div>

      <AirportManager airports={airports} />
    </div>
  );
}

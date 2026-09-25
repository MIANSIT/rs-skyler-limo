import type { Metadata } from "next";

import { AirportPage } from "@/components/site/airport-sections";
import { airportPage } from "@/lib/airport-pages";
import { getBookingOptionsSafely, getFleetSafely } from "@/lib/public/fleet";

/** Copy lives in `airport-pages.ts`, beside the other four airports. */
const page = airportPage("HPN");

export const metadata: Metadata = {
  title: page.metaTitle,
  description: page.metaDescription,
};

export default async function WestchesterAirportPage() {
  const [fleet, options] = await Promise.all([
    getFleetSafely(),
    getBookingOptionsSafely(),
  ]);

  return <AirportPage page={page} fleet={fleet} options={options} />;
}

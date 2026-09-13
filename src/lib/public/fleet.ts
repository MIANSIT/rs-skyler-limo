import "server-only";

import { unstable_cache } from "next/cache";

import { apiFetch } from "@/lib/api/client";
import type { BookingOptions, FleetVehicle } from "@/lib/api/types";

/**
 * The fleet, cached under the `fleet` tag.
 *
 * Every visitor would otherwise cost a database round trip for content that
 * changes a few times a year. The admin app clears this tag through
 * `/api/revalidate` the moment an operator saves, so the page stays as fast as
 * the static version it replaced without ever showing a stale fleet.
 *
 * `cacheLife` is a long backstop, not the mechanism — if the webhook is
 * misconfigured the page still self-heals within the hour rather than pinning
 * a wrong fleet forever.
 */
export const getFleet = unstable_cache(
  async (): Promise<FleetVehicle[]> => {
    const { vehicles } = await apiFetch<{ vehicles: FleetVehicle[] }>(
      "/api/fleet",
    );
    return vehicles;
  },
  ["fleet"],
  { tags: ["fleet"], revalidate: 3600 },
);

/**
 * The fleet, or an empty list if the API is unreachable.
 *
 * A booking form with no vehicles is bad; a 500 on the homepage because the
 * API is restarting is worse. Callers render a plain "call us" fallback.
 */
export async function getFleetSafely(): Promise<FleetVehicle[]> {
  try {
    return await getFleet();
  } catch (error) {
    console.error("Could not load the fleet:", error);
    return [];
  }
}

/**
 * The booking form's pricing inputs, cached under the same `fleet` tag.
 *
 * Shares the tag deliberately: saving a vehicle or a rate in the dashboard
 * invalidates both, and a rate that referenced a vehicle the page had not yet
 * heard about would render a fare against a class nobody can select.
 */
export const getBookingOptions = unstable_cache(
  async (): Promise<BookingOptions> =>
    apiFetch<BookingOptions>("/api/booking-options"),
  ["booking-options"],
  { tags: ["fleet"], revalidate: 3600 },
);

/** The form must still render if the API is briefly unreachable. */
export async function getBookingOptionsSafely(): Promise<BookingOptions> {
  try {
    return await getBookingOptions();
  } catch (error) {
    console.error("Could not load booking options:", error);
    return {
      airports: [],
      rates: [],
      placesEnabled: false,
      childSeatFeeCents: 3500,
    };
  }
}

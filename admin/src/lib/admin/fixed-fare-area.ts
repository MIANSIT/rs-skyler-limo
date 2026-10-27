import type { Booking } from "@/lib/api/types";

/**
 * Where a published airport fare applies: **Manhattan only**.
 *
 * Mirrors `FIXED_FARE_AREA` in `api/src/services/pricing.ts`, which is the
 * authority — the API decides every fare; nothing here prices anything. This
 * copy exists so the dashboard can *describe* the rule and spot the bookings
 * that predate it, the same way `admin/src/lib/admin/tax.ts` mirrors the tax
 * arithmetic for display. Change one, change the other.
 */
export const FIXED_FARE_AREA = "Manhattan";

/** How Google labels the borough, as stored in `pickup/destination_locality`. */
const MANHATTAN_LOCALITY = "manhattan";

/**
 * The end of an airport transfer that is not the airport.
 *
 * Which column that is depends on the direction of travel, and getting it
 * backwards is how a Brooklyn trip would look like a Manhattan one.
 */
function cityEndLocality(booking: Booking): string | null {
  if (booking.airportDirection === "to-airport") return booking.pickupLocality;
  if (booking.airportDirection === "from-airport") return booking.destinationLocality;
  return null;
}

/**
 * True for a booking holding a fixed fare that today's rule would have quoted.
 *
 * The Manhattan-only rule arrived in Oct 2026; before it, any address inside
 * the five boroughs could take a published fare. Those bookings keep their
 * agreed price — it was quoted in good faith and is owed — so this is a
 * marker for an operator to look at an upcoming trip, not a correction.
 *
 * Derived rather than stored. A column would need a migration and a backfill
 * and could then disagree with the addresses beside it; this cannot go stale.
 * An unknown locality (the Places lookup was unavailable when the booking came
 * in) is not flagged: it is not evidence of anything, and a tag that cries
 * wolf gets ignored.
 */
export function isPreManhattanFixedFare(booking: Booking): boolean {
  if (booking.pricingMode !== "fixed") return false;
  const locality = cityEndLocality(booking);
  if (!locality) return false;
  return locality.trim().toLowerCase() !== MANHATTAN_LOCALITY;
}

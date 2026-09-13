import { execute, query, queryOne, transaction, type RowDataPacket } from "../db.js";
import { ApiError } from "../lib/http.js";
import { resolvePlace, type ResolvedPlace } from "./places.js";

/**
 * The airports with published fixed fares. Teterboro and Westchester are on the
 * list because the requirement doc names them; a code with no rate row simply
 * quotes, so listing one costs nothing.
 */
export const AIRPORTS = [
  { code: "JFK", name: "JFK International" },
  { code: "LGA", name: "LaGuardia (LGA)" },
  { code: "EWR", name: "Newark Liberty (EWR)" },
  { code: "TEB", name: "Teterboro (TEB)" },
  { code: "HPN", name: "Westchester County (HPN)" },
] as const;

export const AIRPORT_CODES = AIRPORTS.map((a) => a.code) as [string, ...string[]];

export function isAirportCode(value: unknown): boolean {
  return typeof value === "string" && AIRPORT_CODES.includes(value);
}

export type AirportRate = {
  airportCode: string;
  vehicleId: number;
  vehicleSlug: string;
  vehicleName: string;
  priceCents: number;
  isActive: boolean;
  updatedAt: string | null;
};

type RateRow = RowDataPacket & {
  airport_code: string;
  vehicle_id: number;
  vehicle_slug: string;
  vehicle_name: string;
  price_cents: number;
  is_active: number;
  updated_at: Date | null;
};

/**
 * The full grid the admin edits and the public form reads: every active vehicle
 * against every airport, with a rate where one has been set.
 */
export async function getRateGrid(): Promise<{
  airports: typeof AIRPORTS;
  vehicles: { id: number; slug: string; name: string }[];
  rates: AirportRate[];
}> {
  const vehicles = await query<
    RowDataPacket & { id: number; slug: string; name: string }
  >(
    `SELECT id, slug, name FROM vehicles WHERE is_active = 1
      ORDER BY display_order ASC, id ASC`,
  );

  const rows = await query<RateRow>(
    `SELECT r.airport_code, r.vehicle_id, v.slug AS vehicle_slug,
            v.name AS vehicle_name, r.price_cents, r.is_active, r.updated_at
       FROM airport_rates r
       JOIN vehicles v ON v.id = r.vehicle_id
      WHERE v.is_active = 1`,
  );

  return {
    airports: AIRPORTS,
    vehicles: vehicles.map((v) => ({ id: v.id, slug: v.slug, name: v.name })),
    rates: rows.map((row) => ({
      airportCode: row.airport_code,
      vehicleId: row.vehicle_id,
      vehicleSlug: row.vehicle_slug,
      vehicleName: row.vehicle_name,
      priceCents: row.price_cents,
      isActive: row.is_active === 1,
      updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
    })),
  };
}

/** What the public booking form needs: active rates only, keyed for lookup. */
export async function getPublicRates(): Promise<
  { airportCode: string; vehicleSlug: string; priceCents: number }[]
> {
  const rows = await query<RateRow>(
    `SELECT r.airport_code, r.vehicle_id, v.slug AS vehicle_slug,
            v.name AS vehicle_name, r.price_cents, r.is_active, r.updated_at
       FROM airport_rates r
       JOIN vehicles v ON v.id = r.vehicle_id
      WHERE r.is_active = 1 AND v.is_active = 1`,
  );

  return rows.map((row) => ({
    airportCode: row.airport_code,
    vehicleSlug: row.vehicle_slug,
    priceCents: row.price_cents,
  }));
}

export async function saveRates(
  entries: { airportCode: string; vehicleId: number; priceCents: number | null }[],
  adminUserId: number,
): Promise<void> {
  await transaction(async (connection) => {
    for (const entry of entries) {
      if (entry.priceCents === null) {
        // Clearing a cell removes the published fare; that combination falls
        // back to a quote rather than to a stale price.
        await connection.execute(
          `DELETE FROM airport_rates
            WHERE airport_code = :airportCode AND vehicle_id = :vehicleId`,
          { airportCode: entry.airportCode, vehicleId: entry.vehicleId },
        );
        continue;
      }

      await connection.execute(
        `INSERT INTO airport_rates
           (airport_code, vehicle_id, price_cents, is_active, updated_by)
         VALUES (:airportCode, :vehicleId, :priceCents, 1, :adminUserId)
         ON DUPLICATE KEY UPDATE
           price_cents = VALUES(price_cents),
           is_active = 1,
           updated_by = VALUES(updated_by)`,
        {
          airportCode: entry.airportCode,
          vehicleId: entry.vehicleId,
          priceCents: entry.priceCents,
          adminUserId,
        },
      );
    }
  });
}

export type FareDecision = {
  pricingMode: "fixed" | "quote";
  /** Set only when `fixed`. */
  totalCents: number | null;
  /** Why, in a sentence the customer can be shown. */
  reason: string;
  pickupPlace: ResolvedPlace | null;
  destinationPlace: ResolvedPlace | null;
};

/**
 * Decides whether a submitted trip has a published fare or needs a person.
 *
 * Server-side and authoritative. The form shows a price beforehand, but that
 * number is a preview — this runs again on submission against the live rate
 * card, so a stale page or a tampered request cannot book a Sprinter at a sedan
 * fare. Every path that is not unambiguously a priced NYC airport transfer
 * returns `quote`, which is the direction that fails safe.
 */
export async function decideFare(input: {
  tripType: string;
  vehicleClass: string;
  airportCode?: string | null;
  airportDirection?: string | null;
  childSeats: number;
  childSeatFeeCents: number;
  pickupPlaceId?: string | null;
  destinationPlaceId?: string | null;
  /** Used when Places is unavailable and the customer chose a borough. */
  statedBorough?: string | null;
  sessionToken: string;
}): Promise<FareDecision> {
  const resolve = async (placeId?: string | null) =>
    placeId ? await resolvePlace(placeId, input.sessionToken).catch(() => null) : null;

  const [pickupPlace, destinationPlace] = await Promise.all([
    resolve(input.pickupPlaceId),
    resolve(input.destinationPlaceId),
  ]);

  const quote = (reason: string): FareDecision => ({
    pricingMode: "quote",
    totalCents: null,
    reason,
    pickupPlace,
    destinationPlace,
  });

  if (input.tripType !== "airport") {
    return quote("Point-to-point and hourly trips are priced by a person.");
  }

  if (!input.airportCode || !isAirportCode(input.airportCode)) {
    return quote("We could not match that airport to a published fare.");
  }

  // The non-airport end of the trip is the one that has to be in the city.
  const cityEnd =
    input.airportDirection === "to-airport" ? pickupPlace : destinationPlace;

  const insideCity = cityEnd
    ? cityEnd.isNewYorkCity
    : // No resolved place: fall back to what the customer selected. This is the
      // path taken when no Places key is configured.
      Boolean(input.statedBorough);

  if (!insideCity) {
    return quote(
      "Fixed airport fares cover the five boroughs. We will price this one for you.",
    );
  }

  const rate = await queryOne<RowDataPacket & { price_cents: number }>(
    `SELECT r.price_cents
       FROM airport_rates r
       JOIN vehicles v ON v.id = r.vehicle_id
      WHERE r.airport_code = :airportCode
        AND v.slug = :vehicleClass
        AND r.is_active = 1
        AND v.is_active = 1
      LIMIT 1`,
    { airportCode: input.airportCode, vehicleClass: input.vehicleClass },
  );

  if (!rate) {
    return quote("That airport and vehicle combination is priced on request.");
  }

  const seats = input.childSeats * input.childSeatFeeCents;

  return {
    pricingMode: "fixed",
    totalCents: rate.price_cents + seats,
    reason: "Fixed fare. Tolls and gratuity included.",
    pickupPlace,
    destinationPlace,
  };
}

/** Sets a price on a quote request and moves it to `quoted`. */
export async function sendQuote(
  bookingId: number,
  totalCents: number,
  note: string | null,
  adminUserId: number,
): Promise<void> {
  const booking = await queryOne<RowDataPacket & { pricing_mode: string }>(
    `SELECT pricing_mode FROM bookings WHERE id = :id LIMIT 1`,
    { id: bookingId },
  );

  if (!booking) throw ApiError.notFound("That booking no longer exists.");

  if (booking.pricing_mode !== "quote") {
    throw ApiError.conflict(
      "That booking already has a fixed fare. Edit the fare instead of quoting it.",
    );
  }

  await execute(
    `UPDATE bookings
        SET quoted_total_cents = :totalCents,
            quote_note = :note,
            quoted_at = NOW(),
            quoted_by = :adminUserId,
            status = CASE WHEN status = 'new' THEN 'quoted' ELSE status END
      WHERE id = :id`,
    { totalCents, note, adminUserId, id: bookingId },
  );

  await execute(
    `INSERT INTO activity_log
       (subject_type, subject_id, admin_user_id, action, to_status, note)
     VALUES ('booking', :id, :adminUserId, 'quoted', 'quoted', :note)`,
    {
      id: bookingId,
      adminUserId,
      note: note
        ? `$${(totalCents / 100).toFixed(2)} — ${note}`
        : `$${(totalCents / 100).toFixed(2)}`,
    },
  );
}

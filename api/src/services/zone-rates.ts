import { query, transaction, type RowDataPacket } from "../db.js";
import { ApiError } from "../lib/http.js";

import { listActiveAirports, type Airport } from "./pricing.js";

/**
 * The regions the client's own rate card prices, transcribed from the sheet
 * they hand-corrected — Nassau/Suffolk/Westchester in New York, and the NJ and
 * CT counties reachable from Teterboro, Westchester County (HPN) and the other
 * airports on the card. `key` is what is stored; `label` is what an operator
 * sees, and matches the sheet's own wording so the two can be checked against
 * each other at a glance.
 *
 * This list is not "the five boroughs" — those are covered by `airport_rates`
 * and `decideFare`, and are unaffected by anything in this file.
 */
export const ZONES: { key: string; label: string }[] = [
  { key: "nyc", label: "New York City" },
  { key: "brooklyn", label: "Brooklyn, NY" },
  { key: "bronx", label: "Bronx, NY" },
  { key: "nassau_ny", label: "Nassau County, NY" },
  { key: "suffolk_ny", label: "Suffolk County, NY" },
  { key: "westchester_south_ny", label: "Westchester County, NY (South of 287)" },
  { key: "westchester_north_ny", label: "Westchester County, NY (North of 287)" },
  { key: "somerset_nj", label: "Somerset County, NJ" },
  { key: "morris_nj", label: "Morris County, NJ" },
  { key: "middlesex_nj", label: "Middlesex County, NJ" },
  { key: "bergen_nj", label: "Bergen County, NJ" },
  { key: "hudson_nj", label: "Hudson County, NJ" },
  { key: "fairfield_north_ct", label: "Fairfield County, CT (North of Rte 7 on I-95)" },
  { key: "fairfield_south_ct", label: "Fairfield County, CT (South of Rte 7 on I-95)" },
];

const ZONE_KEYS = new Set(ZONES.map((zone) => zone.key));

export type ZoneRate = {
  airportCode: string;
  zoneKey: string;
  vehicleId: number;
  vehicleSlug: string;
  vehicleName: string;
  priceCents: number;
  updatedAt: string | null;
};

type ZoneRateRow = RowDataPacket & {
  airport_code: string;
  zone_key: string;
  vehicle_id: number;
  vehicle_slug: string;
  vehicle_name: string;
  price_cents: number;
  updated_at: Date | null;
};

/**
 * Every airport, every zone, every active vehicle — the full reference card an
 * operator sees on the Rates page, below the live fixed-fare grid. Nothing
 * here is read by `decideFare`; a row existing or not existing never changes
 * whether a trip books instantly.
 */
export async function getZoneRateGrid(): Promise<{
  airports: Airport[];
  vehicles: { id: number; slug: string; name: string }[];
  zones: { key: string; label: string }[];
  rates: ZoneRate[];
}> {
  const airports = await listActiveAirports();
  const vehicles = await query<
    RowDataPacket & { id: number; slug: string; name: string }
  >(
    `SELECT id, slug, name FROM vehicles WHERE is_active = 1
      ORDER BY display_order ASC, id ASC`,
  );

  const rows = await query<ZoneRateRow>(
    `SELECT r.airport_code, r.zone_key, r.vehicle_id, v.slug AS vehicle_slug,
            v.name AS vehicle_name, r.price_cents, r.updated_at
       FROM zone_rates r
       JOIN vehicles v ON v.id = r.vehicle_id
      WHERE r.is_active = 1 AND v.is_active = 1`,
  );

  return {
    airports,
    vehicles: vehicles.map((v) => ({ id: v.id, slug: v.slug, name: v.name })),
    zones: ZONES,
    rates: rows.map((row) => ({
      airportCode: row.airport_code,
      zoneKey: row.zone_key,
      vehicleId: row.vehicle_id,
      vehicleSlug: row.vehicle_slug,
      vehicleName: row.vehicle_name,
      priceCents: row.price_cents,
      updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
    })),
  };
}

export async function saveZoneRates(
  entries: {
    airportCode: string;
    zoneKey: string;
    vehicleId: number;
    priceCents: number | null;
  }[],
  adminUserId: number,
): Promise<void> {
  const unknownZone = entries.find((entry) => !ZONE_KEYS.has(entry.zoneKey));
  if (unknownZone) {
    throw ApiError.badRequest(`${unknownZone.zoneKey} is not a region on the rate card.`);
  }

  await transaction(async (connection) => {
    for (const entry of entries) {
      if (entry.priceCents === null) {
        await connection.execute(
          `DELETE FROM zone_rates
            WHERE airport_code = :airportCode AND zone_key = :zoneKey AND vehicle_id = :vehicleId`,
          { airportCode: entry.airportCode, zoneKey: entry.zoneKey, vehicleId: entry.vehicleId },
        );
        continue;
      }

      const label = ZONES.find((zone) => zone.key === entry.zoneKey)?.label ?? entry.zoneKey;

      await connection.execute(
        `INSERT INTO zone_rates
           (airport_code, zone_key, zone_label, vehicle_id, price_cents, is_active, updated_by)
         VALUES (:airportCode, :zoneKey, :zoneLabel, :vehicleId, :priceCents, 1, :adminUserId)
         ON DUPLICATE KEY UPDATE
           zone_label = VALUES(zone_label),
           price_cents = VALUES(price_cents),
           is_active = 1,
           updated_by = VALUES(updated_by)`,
        {
          airportCode: entry.airportCode,
          zoneKey: entry.zoneKey,
          zoneLabel: label,
          vehicleId: entry.vehicleId,
          priceCents: entry.priceCents,
          adminUserId,
        },
      );
    }
  });
}


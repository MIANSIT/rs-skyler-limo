import { executeOn, pool, query, transaction, type RowDataPacket } from "../db.js";
import { env } from "../env.js";
import { ZONES } from "../services/zone-rates.js";

const ZONE_LABEL = Object.fromEntries(ZONES.map((zone) => [zone.key, zone.label]));

/**
 * Transcribed from the client's handwritten/annotated rate sheet (five pages,
 * airports HPN, ISP, TEB, EWR and MMU). Where a number was crossed out and
 * corrected by hand, the corrected figure is the one used here. A cell that
 * was not legible or not present on any page is left out rather than guessed
 * — it stays blank on the Rates page until the client supplies it.
 *
 * Dollars, not cents — converted below. Run once via `npm run seed-zone-rates`
 * (or `npm run api:seed-zone-rates` from the repo root) *after* `npm run
 * migrate`, which is what adds ISP and MMU to the `airports` table.
 */
const SHEET: Record<
  string,
  Record<string, { sedan?: number; suv?: number }>
> = {
  HPN: {
    brooklyn: { sedan: 290, suv: 350 },
    bronx: { sedan: 140, suv: 170 },
    nassau_ny: { sedan: 240, suv: 290 },
    suffolk_ny: { sedan: 510, suv: 610 },
    westchester_south_ny: { sedan: 110, suv: 130 },
    westchester_north_ny: { sedan: 120, suv: 140 },
    somerset_nj: { sedan: 440, suv: 530 },
    morris_nj: { sedan: 330, suv: 400 },
    middlesex_nj: { sedan: 440, suv: 530 },
    bergen_nj: { sedan: 200, suv: 230 },
    hudson_nj: { sedan: 220, suv: 260 },
    fairfield_north_ct: { sedan: 190, suv: 240 },
    fairfield_south_ct: { sedan: 190, suv: 240 },
    // HPN → NYC: only the SUV figure appeared on the sheet.
    nyc: { suv: 220 },
  },
  ISP: {
    nyc: { sedan: 275, suv: 330 },
    brooklyn: { sedan: 275, suv: 330 },
    bronx: { sedan: 260, suv: 310 },
    nassau_ny: { sedan: 190, suv: 250 },
    suffolk_ny: { sedan: 190, suv: 250 },
    westchester_south_ny: { sedan: 380, suv: 450 },
    westchester_north_ny: { sedan: 380, suv: 450 },
    // Only the sedan figures were on the sheet for these six — the SUV rows
    // ran off the photographed page.
    somerset_nj: { sedan: 550 },
    morris_nj: { sedan: 480 },
    middlesex_nj: { sedan: 500 },
    bergen_nj: { sedan: 350 },
    hudson_nj: { sedan: 320 },
    fairfield_north_ct: { sedan: 460 },
    fairfield_south_ct: { sedan: 460 },
  },
  TEB: {
    nyc: { sedan: 160, suv: 180 },
    brooklyn: { sedan: 210, suv: 240 },
    bronx: { sedan: 180, suv: 200 },
    nassau_ny: { sedan: 270, suv: 300 },
    suffolk_ny: { sedan: 480, suv: 550 },
    westchester_south_ny: { sedan: 200, suv: 240 },
    westchester_north_ny: { sedan: 230, suv: 240 },
    somerset_nj: { sedan: 270, suv: 320 },
    morris_nj: { sedan: 170, suv: 200 },
    middlesex_nj: { sedan: 210, suv: 240 },
    bergen_nj: { sedan: 120, suv: 140 },
    hudson_nj: { sedan: 120, suv: 140 },
    fairfield_north_ct: { sedan: 300, suv: 350 },
    fairfield_south_ct: { sedan: 300, suv: 350 },
  },
  EWR: {
    // Only the SUV rows were on the photographed pages — no EWR sedan figures
    // and no "EWR to NYC" figure at all.
    brooklyn: { suv: 250 },
    bronx: { suv: 220 },
    nassau_ny: { suv: 320 },
    suffolk_ny: { suv: 620 },
    westchester_south_ny: { suv: 290 },
    westchester_north_ny: { suv: 290 },
    somerset_nj: { suv: 250 },
    morris_nj: { suv: 190 },
    middlesex_nj: { suv: 190 },
    bergen_nj: { suv: 180 },
    hudson_nj: { suv: 150 },
    fairfield_north_ct: { suv: 390 },
    fairfield_south_ct: { suv: 390 },
  },
  MMU: {
    // The sheet's MMU page was cut off after six rows — no SUV figures and
    // nothing past Westchester (south of 287) for sedan.
    nyc: { sedan: 190 },
    brooklyn: { sedan: 250 },
    bronx: { sedan: 210 },
    nassau_ny: { sedan: 340 },
    suffolk_ny: { sedan: 595 },
    westchester_south_ny: { sedan: 300 },
  },
};

async function main() {
  const vehicles = await query<RowDataPacket & { id: number; slug: string }>(
    `SELECT id, slug FROM vehicles WHERE slug IN ('luxury-sedan', 'luxury-suv')`,
  );
  const byslug = new Map(vehicles.map((v) => [v.slug, v.id]));
  const sedanId = byslug.get("luxury-sedan");
  const suvId = byslug.get("luxury-suv");

  if (!sedanId || !suvId) {
    throw new Error(
      "Luxury Sedan and/or Luxury SUV are missing from `vehicles` — run `npm run seed-fleet` first.",
    );
  }
  // Narrowed above; re-declared so the loop below sees plain `number`s.
  const vehicleId: Record<"sedan" | "suv", number> = { sedan: sedanId, suv: suvId };

  const airportCodes = Object.keys(SHEET);
  const existingAirports = await query<RowDataPacket & { code: string }>(
    `SELECT code FROM airports
      WHERE code IN (${airportCodes.map((_, i) => `:code${i}`).join(",")})`,
    Object.fromEntries(airportCodes.map((code, i) => [`code${i}`, code])),
  );
  const missing = airportCodes.filter(
    (code) => !existingAirports.some((row) => row.code === code),
  );
  if (missing.length > 0) {
    throw new Error(
      `${missing.join(", ")} not found in \`airports\` — run \`npm run migrate\` first, ` +
        "which adds ISP and MMU.",
    );
  }

  let written = 0;

  await transaction(async (connection) => {
    for (const [airportCode, zones] of Object.entries(SHEET)) {
      for (const [zoneKey, prices] of Object.entries(zones)) {
        for (const [type, dollars] of Object.entries(prices) as [
          "sedan" | "suv",
          number,
        ][]) {
          await executeOn(
            connection,
            `INSERT INTO zone_rates
               (airport_code, zone_key, zone_label, vehicle_id, price_cents, is_active)
             VALUES (:airportCode, :zoneKey, :zoneLabel, :vehicleId, :priceCents, 1)
             ON DUPLICATE KEY UPDATE
               zone_label = VALUES(zone_label),
               price_cents = VALUES(price_cents),
               is_active = 1`,
            {
              airportCode,
              zoneKey,
              zoneLabel: ZONE_LABEL[zoneKey] ?? zoneKey,
              vehicleId: vehicleId[type],
              priceCents: Math.round(dollars * 100),
            },
          );
          written += 1;
        }
      }
    }
  });

  console.log(`Seeded ${written} regional reference rate${written === 1 ? "" : "s"} into \`${env.DB_NAME}\`.`);
  await pool.end();
}

main().catch(async (error) => {
  console.error("Zone rate seed failed:", error);
  await pool.end().catch(() => {});
  process.exit(1);
});

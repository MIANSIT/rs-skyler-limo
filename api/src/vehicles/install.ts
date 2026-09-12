import { queryOne, type RowDataPacket } from "../db.js";
import { createVehicle } from "../services/vehicles.js";

import { FLEET_SEED } from "./seed-data.js";

/**
 * Installs the four vehicle classes the site ships with.
 *
 * Unlike `seed.ts` this is safe to run in production: the fleet is real
 * content, not invented customers. It only ever inserts into an empty table, so
 * a re-run will not overwrite edits an operator has made in the dashboard.
 */
export async function installFleet(): Promise<number> {
  const existing = await queryOne<RowDataPacket & { total: number }>(
    "SELECT COUNT(*) AS total FROM vehicles",
  );

  if ((existing?.total ?? 0) > 0) return 0;

  let created = 0;
  for (const vehicle of FLEET_SEED) {
    // `null` rather than a placeholder id: nobody did this, and the activity
    // log's foreign key would reject an operator who does not exist.
    await createVehicle(vehicle, null);
    created += 1;
  }

  return created;
}

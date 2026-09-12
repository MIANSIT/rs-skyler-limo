import { pool } from "../db.js";
import { env } from "../env.js";
import { installFleet } from "../vehicles/install.js";

async function main() {
  const created = await installFleet();

  console.log(
    created === 0
      ? "Vehicles already present; leaving the fleet alone."
      : `Installed ${created} vehicle classes into \`${env.DB_NAME}\`.`,
  );

  await pool.end();
}

main().catch(async (error) => {
  console.error("Fleet seed failed:", error);
  await pool.end().catch(() => {});
  process.exit(1);
});

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import mysql from "mysql2/promise";

import { env } from "../env.js";

/**
 * Creates the database if it is missing, then applies schema.sql. Every
 * statement in that file is `IF NOT EXISTS`, so this is safe to re-run and is
 * the only thing the deploy needs to call.
 */
async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const schema = await readFile(join(here, "..", "schema.sql"), "utf8");

  const root = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    multipleStatements: true,
  });

  await root.query(
    `CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\`
       CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await root.query(`USE \`${env.DB_NAME}\``);
  await root.query(schema);

  await applyPatches(root);
  await root.end();

  console.log(`Schema applied to \`${env.DB_NAME}\`.`);
}

/**
 * Changes to tables that already exist.
 *
 * `CREATE TABLE IF NOT EXISTS` skips a table entirely once it is present, so a
 * column added after the first deploy never lands. MySQL has no
 * `ADD COLUMN IF NOT EXISTS` (that is MariaDB), so each patch is guarded by
 * checking `information_schema` first — which keeps `npm run migrate`
 * idempotent and safe to run on every release.
 */
async function applyPatches(connection: mysql.Connection): Promise<void> {
  const patches: { description: string; check: () => Promise<boolean>; sql: string }[] = [
    {
      description: "bookings.child_seats",
      check: () => columnMissing(connection, "bookings", "child_seats"),
      sql: `ALTER TABLE bookings
              ADD COLUMN child_seats TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER bags`,
    },
    {
      // Widening an ENUM is safe to repeat, but only run it when needed so the
      // table is not rebuilt on every deploy.
      description: "activity_log.subject_type += 'vehicle'",
      check: async () => {
        const [rows] = await connection.query<mysql.RowDataPacket[]>(
          `SELECT COLUMN_TYPE AS type
             FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'activity_log'
              AND COLUMN_NAME = 'subject_type'`,
          [env.DB_NAME],
        );
        return !String(rows[0]?.type ?? "").includes("vehicle");
      },
      sql: `ALTER TABLE activity_log
              MODIFY subject_type ENUM('booking','quote','vehicle') NOT NULL`,
    },
  ];

  for (const patch of patches) {
    if (await patch.check()) {
      await connection.query(patch.sql);
      console.log(`  patched ${patch.description}`);
    }
  }
}

async function columnMissing(
  connection: mysql.Connection,
  table: string,
  column: string,
): Promise<boolean> {
  const [rows] = await connection.query<mysql.RowDataPacket[]>(
    `SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [env.DB_NAME, table, column],
  );
  return rows.length === 0;
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});

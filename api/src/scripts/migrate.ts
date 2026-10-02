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
      description: "bookings.service_type",
      check: () => columnMissing(connection, "bookings", "service_type"),
      sql: `ALTER TABLE bookings
              ADD COLUMN service_type
                ENUM('personal','corporate','wedding','event','other')
                NOT NULL DEFAULT 'personal' AFTER vehicle_class`,
    },
    {
      description: "bookings.pricing_mode and quote fields",
      check: () => columnMissing(connection, "bookings", "pricing_mode"),
      sql: `ALTER TABLE bookings
              ADD COLUMN pricing_mode ENUM('fixed','quote') NOT NULL DEFAULT 'quote' AFTER trip_type,
              ADD COLUMN quoted_at DATETIME NULL AFTER quoted_total_cents,
              ADD COLUMN quoted_by BIGINT UNSIGNED NULL AFTER quoted_at,
              ADD COLUMN quote_note TEXT NULL AFTER quoted_by,
              ADD COLUMN pickup_place_id VARCHAR(255) NULL AFTER quote_note,
              ADD COLUMN pickup_locality VARCHAR(120) NULL AFTER pickup_place_id,
              ADD COLUMN pickup_region VARCHAR(60) NULL AFTER pickup_locality,
              ADD COLUMN destination_place_id VARCHAR(255) NULL AFTER pickup_region,
              ADD COLUMN destination_locality VARCHAR(120) NULL AFTER destination_place_id,
              ADD COLUMN destination_region VARCHAR(60) NULL AFTER destination_locality,
              ADD COLUMN airport_code VARCHAR(8) NULL AFTER destination_region,
              ADD COLUMN airport_direction ENUM('from-airport','to-airport') NULL AFTER airport_code`,
    },
    {
      description: "bookings.status += 'quoted'",
      check: async () => {
        const [rows] = await connection.query<mysql.RowDataPacket[]>(
          `SELECT COLUMN_TYPE AS type
             FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bookings'
              AND COLUMN_NAME = 'status'`,
          [env.DB_NAME],
        );
        return !String(rows[0]?.type ?? "").includes("quoted");
      },
      sql: `ALTER TABLE bookings
              MODIFY status ENUM('new','quoted','confirmed','completed','cancelled','pending')
              NOT NULL DEFAULT 'new'`,
    },
    {
      description: "bookings.payment_method, payment_status, paid_at",
      check: () => columnMissing(connection, "bookings", "payment_method"),
      sql: `ALTER TABLE bookings
              ADD COLUMN payment_method ENUM('card','cash') NOT NULL DEFAULT 'card' AFTER quote_note,
              ADD COLUMN payment_status ENUM('unpaid','paid') NOT NULL DEFAULT 'unpaid' AFTER payment_method,
              ADD COLUMN paid_at DATETIME NULL AFTER payment_status`,
    },
    {
      description: "bookings.stripe_checkout_session_id, stripe_payment_intent_id",
      check: () => columnMissing(connection, "bookings", "stripe_checkout_session_id"),
      sql: `ALTER TABLE bookings
              ADD COLUMN stripe_checkout_session_id VARCHAR(255) NULL AFTER paid_at,
              ADD COLUMN stripe_payment_intent_id VARCHAR(255) NULL AFTER stripe_checkout_session_id`,
    },
    {
      description: "quotes.agreed_price_cents, priced_at",
      check: () => columnMissing(connection, "quotes", "agreed_price_cents"),
      sql: `ALTER TABLE quotes
              ADD COLUMN agreed_price_cents INT UNSIGNED NULL AFTER details,
              ADD COLUMN priced_at DATETIME NULL AFTER agreed_price_cents`,
    },
    {
      description: "quotes.payment_method, payment_status, paid_at, Stripe ids",
      check: () => columnMissing(connection, "quotes", "payment_method"),
      sql: `ALTER TABLE quotes
              ADD COLUMN payment_method ENUM('card','cash') NULL AFTER priced_at,
              ADD COLUMN payment_status ENUM('unpaid','paid') NOT NULL DEFAULT 'unpaid' AFTER payment_method,
              ADD COLUMN paid_at DATETIME NULL AFTER payment_status,
              ADD COLUMN stripe_checkout_session_id VARCHAR(255) NULL AFTER paid_at,
              ADD COLUMN stripe_payment_intent_id VARCHAR(255) NULL AFTER stripe_checkout_session_id`,
    },
    {
      // The client's rate sheet prices transfers from Islip/MacArthur, which
      // the airports table has never had a row for. `INSERT IGNORE` keeps this
      // idempotent even if an operator adds ISP by hand first.
      description: "airports += ISP (Long Island MacArthur)",
      check: async () => !(await airportExists(connection, "ISP")),
      sql: `INSERT IGNORE INTO airports (code, name, display_order)
              SELECT 'ISP', 'Long Island MacArthur (ISP)', COALESCE(MAX(display_order), 0) + 1
                FROM airports`,
    },
    {
      description: "airports += MMU (Morristown)",
      check: async () => !(await airportExists(connection, "MMU")),
      sql: `INSERT IGNORE INTO airports (code, name, display_order)
              SELECT 'MMU', 'Morristown (MMU)', COALESCE(MAX(display_order), 0) + 1
                FROM airports`,
    },
    {
      description: "bookings.customer_change_pending, customer_changed_at",
      check: () => columnMissing(connection, "bookings", "customer_change_pending"),
      sql: `ALTER TABLE bookings
              ADD COLUMN customer_change_pending TINYINT(1) NOT NULL DEFAULT 0 AFTER source,
              ADD COLUMN customer_changed_at DATETIME NULL AFTER customer_change_pending`,
    },
    {
      description: "quotes.customer_change_pending, customer_changed_at",
      check: () => columnMissing(connection, "quotes", "customer_change_pending"),
      sql: `ALTER TABLE quotes
              ADD COLUMN customer_change_pending TINYINT(1) NOT NULL DEFAULT 0 AFTER source,
              ADD COLUMN customer_changed_at DATETIME NULL AFTER customer_change_pending`,
    },
    {
      // Existing rows get a 0% rate and no tax: their totals were agreed as
      // totals, so nothing already priced changes. `settings` itself is a new
      // table and arrives through schema.sql.
      description: "bookings.tax_rate, tax_cents",
      check: () => columnMissing(connection, "bookings", "tax_rate"),
      sql: `ALTER TABLE bookings
              ADD COLUMN tax_rate DECIMAL(6,3) NOT NULL DEFAULT 0 AFTER quoted_total_cents,
              ADD COLUMN tax_cents INT UNSIGNED NOT NULL DEFAULT 0 AFTER tax_rate`,
    },
    {
      description: "quotes.tax_rate, tax_cents",
      check: () => columnMissing(connection, "quotes", "tax_rate"),
      sql: `ALTER TABLE quotes
              ADD COLUMN tax_rate DECIMAL(6,3) NOT NULL DEFAULT 0 AFTER agreed_price_cents,
              ADD COLUMN tax_cents INT UNSIGNED NOT NULL DEFAULT 0 AFTER tax_rate`,
    },
    {
      // Orders from before tax existed came in at 0%. An unpriced one has told
      // the customer no figure yet, so it takes the default and its price box
      // opens on the right rate. Priced orders are left alone: their totals
      // were given as totals. Runs once, recorded in `settings`, so an
      // operator's deliberate 0% on an unpriced order is never overwritten.
      description: "unpriced orders at 0% take the default tax rate (once)",
      check: async () => {
        const [rows] = await connection.query<mysql.RowDataPacket[]>(
          `SELECT 1 FROM settings WHERE name = 'backfill_unpriced_tax_rate'`,
        );
        return rows.length === 0;
      },
      sql: `UPDATE bookings
               SET tax_rate = COALESCE((SELECT CAST(value AS DECIMAL(6,3)) FROM settings WHERE name = 'tax_rate'), 8.875)
             WHERE tax_rate = 0 AND tax_cents = 0 AND quoted_total_cents IS NULL;
            UPDATE quotes
               SET tax_rate = COALESCE((SELECT CAST(value AS DECIMAL(6,3)) FROM settings WHERE name = 'tax_rate'), 8.875)
             WHERE tax_rate = 0 AND tax_cents = 0 AND agreed_price_cents IS NULL;
            INSERT INTO settings (name, value) VALUES ('backfill_unpriced_tax_rate', 'done')`,
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

async function airportExists(connection: mysql.Connection, code: string): Promise<boolean> {
  const [rows] = await connection.query<mysql.RowDataPacket[]>(
    `SELECT 1 FROM airports WHERE code = ?`,
    [code],
  );
  return rows.length > 0;
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});

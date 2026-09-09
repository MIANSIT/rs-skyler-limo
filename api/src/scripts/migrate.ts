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
  await root.end();

  console.log(`Schema applied to \`${env.DB_NAME}\`.`);
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});

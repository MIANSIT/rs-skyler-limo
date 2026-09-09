import mysql from "mysql2/promise";
import type {
  Pool,
  PoolConnection,
  PoolOptions,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";

import { env } from "./env.js";

const options: PoolOptions = {
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  connectionLimit: env.DB_CONNECTION_LIMIT,
  waitForConnections: true,
  // Read DATETIME columns as UTC. This only holds if the server also *writes*
  // them as UTC — see the `SET time_zone` below, which is not optional.
  timezone: "Z",
  // Without this, DECIMAL and BIGINT arrive as strings and quietly break maths.
  decimalNumbers: true,
  namedPlaceholders: true,
};

export const pool: Pool = mysql.createPool(options);

/**
 * Pin every connection to UTC.
 *
 * MySQL defaults `time_zone` to SYSTEM, so `NOW()` and `CURRENT_TIMESTAMP`
 * write the server's local wall clock. The driver above is told to *read*
 * DATETIME as UTC, and the mismatch silently shifts every stored timestamp by
 * the host's offset — sessions outliving their expiry, "created 3 hours from
 * now" in the dashboard. Storing UTC makes the two agree regardless of where
 * the server happens to be provisioned.
 *
 * Anything that needs to be true in New York time converts at the edge; see
 * `nyDayBounds` in `services/stats.ts`.
 */
pool.on("connection", (connection) => {
  connection.query("SET time_zone = '+00:00'");
});

/**
 * Every statement here uses `:named` placeholders, which the driver expands
 * because `namedPlaceholders` is on. Its published types only describe the
 * positional `?` form, so the parameter object has to be cast at the call.
 * Confined to this file: nothing above it needs to know.
 */
export type Params = Record<string, unknown>;

// `query` and `execute` declare different value types, neither of which admits
// a plain object, so the cast has to erase to `never` to satisfy both.
const asValues = (params?: Params) => params as unknown as never;

/** A SELECT returning rows. */
export async function query<T extends RowDataPacket>(
  sql: string,
  params?: Params,
): Promise<T[]> {
  const [rows] = await pool.query<T[]>(sql, asValues(params));
  return rows;
}

/** A SELECT expected to return at most one row. */
export async function queryOne<T extends RowDataPacket>(
  sql: string,
  params?: Params,
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/** An INSERT, UPDATE or DELETE. */
export async function execute(
  sql: string,
  params?: Params,
): Promise<ResultSetHeader> {
  const [result] = await pool.execute<ResultSetHeader>(sql, asValues(params));
  return result;
}

/**
 * The same escape hatch for statements run on a connection inside a
 * transaction, where the driver's types have the identical gap.
 */
export async function runOn<T extends RowDataPacket>(
  connection: PoolConnection,
  sql: string,
  params?: Params,
): Promise<T[]> {
  const [rows] = await connection.query<T[]>(sql, asValues(params));
  return rows;
}

export async function executeOn(
  connection: PoolConnection,
  sql: string,
  params?: Params,
): Promise<ResultSetHeader> {
  const [result] = await connection.execute<ResultSetHeader>(
    sql,
    asValues(params),
  );
  return result;
}

/**
 * Runs `fn` inside a transaction on a single connection, rolling back on any
 * throw. Used where a write and its audit row must land together.
 */
export async function transaction<T>(
  fn: (connection: PoolConnection) => Promise<T>,
): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export type { RowDataPacket, ResultSetHeader };

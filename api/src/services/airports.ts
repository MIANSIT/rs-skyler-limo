import { execute, query, queryOne, transaction, type RowDataPacket } from "../db.js";
import { ApiError } from "../lib/http.js";

export type AdminAirport = {
  code: string;
  name: string;
  isActive: boolean;
  displayOrder: number;
  /** Vehicle classes that currently have a published fare here. */
  rateCount: number;
  /** Bookings that name this airport. */
  bookingCount: number;
};

type AirportRow = RowDataPacket & {
  code: string;
  name: string;
  is_active: number;
  display_order: number;
  rate_count: number;
  booking_count: number;
};

const SELECT = `
  SELECT a.code, a.name, a.is_active, a.display_order,
         (SELECT COUNT(*) FROM airport_rates r WHERE r.airport_code = a.code) AS rate_count,
         (SELECT COUNT(*) FROM bookings b WHERE b.airport_code = a.code) AS booking_count
    FROM airports a`;

function toAirport(row: AirportRow): AdminAirport {
  return {
    code: row.code,
    name: row.name,
    isActive: row.is_active === 1,
    displayOrder: row.display_order,
    rateCount: Number(row.rate_count),
    bookingCount: Number(row.booking_count),
  };
}

/** Every airport, hidden ones included — this is the operator's view. */
export async function listAirports(): Promise<AdminAirport[]> {
  const rows = await query<AirportRow>(
    `${SELECT} ORDER BY a.display_order ASC, a.name ASC`,
  );
  return rows.map(toAirport);
}

async function getAirport(code: string): Promise<AdminAirport | null> {
  const row = await queryOne<AirportRow>(`${SELECT} WHERE a.code = :code`, { code });
  return row ? toAirport(row) : null;
}

export async function createAirport(input: {
  code: string;
  name: string;
  isActive: boolean;
}): Promise<AdminAirport> {
  const existing = await queryOne<RowDataPacket>(
    `SELECT 1 FROM airports WHERE code = :code LIMIT 1`,
    { code: input.code },
  );
  if (existing) {
    throw ApiError.conflict(`An airport with the code ${input.code} already exists.`);
  }

  // New airports go to the end of the list.
  await execute(
    `INSERT INTO airports (code, name, is_active, display_order)
     SELECT :code, :name, :isActive, COALESCE(MAX(display_order), 0) + 1
       FROM airports`,
    { code: input.code, name: input.name, isActive: input.isActive ? 1 : 0 },
  );

  return (await getAirport(input.code))!;
}

/** The code is the key rates and bookings refer to, so only name and visibility change. */
export async function updateAirport(
  code: string,
  patch: { name?: string; isActive?: boolean },
): Promise<AdminAirport> {
  if (!(await getAirport(code))) throw ApiError.notFound("That airport no longer exists.");

  await execute(
    `UPDATE airports
        SET name = COALESCE(:name, name),
            is_active = COALESCE(:isActive, is_active)
      WHERE code = :code`,
    {
      code,
      name: patch.name ?? null,
      isActive: patch.isActive === undefined ? null : patch.isActive ? 1 : 0,
    },
  );

  return (await getAirport(code))!;
}

/**
 * Removes an airport and its rate row(s). Refused once a booking names it: that
 * booking's history should keep meaning something, and hiding the airport has
 * the same effect on the website without losing it.
 */
export async function deleteAirport(code: string): Promise<void> {
  const airport = await getAirport(code);
  if (!airport) throw ApiError.notFound("That airport no longer exists.");

  if (airport.bookingCount > 0) {
    throw ApiError.conflict(
      `${airport.code} is on ${airport.bookingCount} booking${
        airport.bookingCount === 1 ? "" : "s"
      } and cannot be deleted. Hide it instead — it leaves the booking form immediately and those bookings keep their history.`,
    );
  }

  await transaction(async (connection) => {
    await connection.execute(`DELETE FROM airport_rates WHERE airport_code = ?`, [code]);
    // Reference-only rates (see `services/zone-rates.ts`) have no FK to this
    // table, matching `airport_rates`, so they are cleaned up by hand too.
    await connection.execute(`DELETE FROM zone_rates WHERE airport_code = ?`, [code]);
    await connection.execute(`DELETE FROM airports WHERE code = ?`, [code]);
  });
}

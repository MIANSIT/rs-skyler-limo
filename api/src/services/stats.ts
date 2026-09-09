import { query, queryOne, type RowDataPacket } from "../db.js";

export type DashboardStats = {
  bookings: {
    new: number;
    confirmed: number;
    today: number;
    next7Days: number;
    total: number;
  };
  quotes: {
    new: number;
    total: number;
  };
  /** Bookings created per day for the last 14 days, oldest first. */
  recentVolume: { date: string; count: number }[];
};

const TIME_ZONE = "America/New_York";

const nyParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function offsetAt(instant: number): number {
  const parts = nyParts.formatToParts(new Date(instant));
  const field = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return (
    Date.UTC(
      field("year"),
      field("month") - 1,
      field("day"),
      field("hour"),
      field("minute"),
      field("second"),
    ) - instant
  );
}

/**
 * "Today" means today in New York — the business runs on that clock, and a
 * dispatcher at 9 p.m. must not see tomorrow's pickups because UTC has already
 * rolled over.
 *
 * Computed here and passed as parameters rather than done in SQL: `CONVERT_TZ`
 * with a named zone needs the MySQL timezone tables loaded, which a stock
 * install does not have, and a fixed offset would be wrong for half the year.
 */
function nyDayBounds(now = new Date()): { start: Date; end: Date } {
  const midnightUtcOfNyDate = (() => {
    const [date] = nyParts.format(now).split(",");
    const [year, month, day] = (date ?? "").trim().split("-").map(Number);
    return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  })();

  // Solve for the instant that is midnight *in New York* on that date.
  let start = midnightUtcOfNyDate - offsetAt(midnightUtcOfNyDate);
  start = midnightUtcOfNyDate - offsetAt(start);

  return { start: new Date(start), end: new Date(start + 24 * 3600 * 1000) };
}

/**
 * One round trip per group rather than one per number — the dashboard is the
 * first thing an operator opens each morning and should not take a second.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const { start, end } = nyDayBounds();

  const bookingRow = await queryOne<
    RowDataPacket & {
      new_count: number;
      confirmed_count: number;
      today_count: number;
      week_count: number;
      total: number;
    }
  >(
    `SELECT
       SUM(status = 'new')                                        AS new_count,
       SUM(status = 'confirmed')                                  AS confirmed_count,
       SUM(pickup_at >= :dayStart AND pickup_at < :dayEnd
           AND status IN ('new','confirmed'))                     AS today_count,
       SUM(pickup_at BETWEEN UTC_TIMESTAMP()
                         AND UTC_TIMESTAMP() + INTERVAL 7 DAY
           AND status IN ('new','confirmed'))                     AS week_count,
       COUNT(*)                                                   AS total
     FROM bookings`,
    { dayStart: start, dayEnd: end },
  );

  const quoteRow = await queryOne<
    RowDataPacket & { new_count: number; total: number }
  >(
    `SELECT SUM(status = 'new') AS new_count, COUNT(*) AS total FROM quotes`,
  );

  const volumeRows = await query<RowDataPacket & { day: Date; count: number }>(
    `SELECT DATE(created_at) AS day, COUNT(*) AS count
       FROM bookings
      WHERE created_at >= :since
      GROUP BY DATE(created_at)
      ORDER BY day ASC`,
    { since: new Date(start.getTime() - 13 * 24 * 3600 * 1000) },
  );

  return {
    bookings: {
      new: Number(bookingRow?.new_count ?? 0),
      confirmed: Number(bookingRow?.confirmed_count ?? 0),
      today: Number(bookingRow?.today_count ?? 0),
      next7Days: Number(bookingRow?.week_count ?? 0),
      total: Number(bookingRow?.total ?? 0),
    },
    quotes: {
      new: Number(quoteRow?.new_count ?? 0),
      total: Number(quoteRow?.total ?? 0),
    },
    recentVolume: volumeRows.map((row) => ({
      date: row.day.toISOString().slice(0, 10),
      count: Number(row.count),
    })),
  };
}

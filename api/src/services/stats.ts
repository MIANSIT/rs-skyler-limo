import { queryOne, type RowDataPacket } from "../db.js";
import { addDays, newYorkMidnight, todayInNewYork } from "../lib/new-york.js";

/**
 * The counts behind "Today" — what needs doing now. Totals and money over a
 * period are `services/reports.ts`.
 */
export type DashboardStats = {
  bookings: {
    new: number;
    confirmed: number;
    today: number;
    next7Days: number;
    total: number;
    /** Changed by the customer and not yet reviewed. */
    changed: number;
  };
  quotes: {
    new: number;
    total: number;
    changed: number;
  };
};

/**
 * One round trip per table rather than one per number — this is the first
 * thing an operator opens each morning and should not take a second.
 *
 * "Today" means today in New York: a dispatcher at 9 p.m. must not see
 * tomorrow's pickups because UTC has already rolled over.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const today = todayInNewYork();
  const dayStart = newYorkMidnight(today);
  const dayEnd = newYorkMidnight(addDays(today, 1));

  const [bookingRow, quoteRow] = await Promise.all([
    queryOne<
      RowDataPacket & {
        new_count: number;
        confirmed_count: number;
        today_count: number;
        week_count: number;
        changed_count: number;
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
         SUM(customer_change_pending = 1)                           AS changed_count,
         COUNT(*)                                                   AS total
       FROM bookings`,
      { dayStart, dayEnd },
    ),
    queryOne<
      RowDataPacket & { new_count: number; changed_count: number; total: number }
    >(
      `SELECT SUM(status = 'new') AS new_count,
              SUM(customer_change_pending = 1) AS changed_count,
              COUNT(*) AS total
         FROM quotes`,
    ),
  ]);

  return {
    bookings: {
      new: Number(bookingRow?.new_count ?? 0),
      confirmed: Number(bookingRow?.confirmed_count ?? 0),
      today: Number(bookingRow?.today_count ?? 0),
      next7Days: Number(bookingRow?.week_count ?? 0),
      total: Number(bookingRow?.total ?? 0),
      changed: Number(bookingRow?.changed_count ?? 0),
    },
    quotes: {
      new: Number(quoteRow?.new_count ?? 0),
      total: Number(quoteRow?.total ?? 0),
      changed: Number(quoteRow?.changed_count ?? 0),
    },
  };
}

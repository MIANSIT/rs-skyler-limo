import { query, queryOne, type RowDataPacket } from "../db.js";
import {
  addDays,
  newYorkDate,
  newYorkMidnight,
  todayInNewYork,
} from "../lib/new-york.js";

const bookingStatuses = [
  "new",
  "pending",
  "quoted",
  "confirmed",
  "completed",
  "cancelled",
] as const;

const quoteStatuses = ["new", "pending", "quoted", "won", "lost"] as const;

type BookingStatus = (typeof bookingStatuses)[number];
type QuoteStatus = (typeof quoteStatuses)[number];

/** Periods longer than this are charted by month rather than by day. */
const MAX_DAILY_BUCKETS = 62;

/**
 * Everything here is scoped to **orders placed** in the period — a booking or
 * quote request's `created_at`, on New York's calendar. One date for every
 * figure, so the page never contradicts itself: it is the only date every
 * order has (a quote request's event date is optional), and it answers "how
 * much business came in this week". Money is integer cents.
 */
export type Report = {
  /** Inclusive New York dates the figures cover. */
  range: { from: string; to: string; bucket: "day" | "month" };
  bookings: { total: number; byStatus: Record<BookingStatus, number> };
  quotes: { total: number; byStatus: Record<QuoteStatus, number> };
  value: {
    /** Confirmed and completed bookings plus won quote requests. */
    committedCents: number;
    committedCount: number;
    /** Marked paid — by Stripe or by an operator — whatever the status. */
    collectedCents: number;
    /** Committed but not yet paid. */
    outstandingCents: number;
    /** Priced and waiting on the customer or an operator, not yet committed. */
    pipelineCents: number;
    /** Live work with no price on it yet, so no value can be counted. */
    unpricedCount: number;
    /** Mean committed booking fare. Null until there is one to average. */
    averageBookingCents: number | null;
  };
  /**
   * Sales tax to pay the state for the period. Unlike everything above, this is
   * counted by **payment date** (`paid_at`), not by the date the order was
   * placed: tax is owed on money received, so a tax return for September needs
   * September's payments, whenever those trips were booked.
   */
  salesTax: {
    /** Tax inside every payment received in the period — the figure to pay. */
    dueCents: number;
    /** Those payments before tax: the taxable sales line on the return. */
    taxableSalesCents: number;
    /** Payments received in the period, bookings and quote requests. */
    paidOrders: number;
    /**
     * Tax on committed orders placed in the period and not yet paid. Owed once
     * the customer pays; not part of `dueCents` until then.
     */
    notYetCollectedCents: number;
  };
  /** Committed bookings, split by the shape of the trip and by vehicle class. */
  byTrip: { key: string; count: number; valueCents: number }[];
  byVehicle: { key: string; count: number; valueCents: number }[];
  /**
   * Orders placed per bucket, oldest first, every bucket present — a quiet day
   * is a zero, not a gap. `key` is `YYYY-MM-DD`, or `YYYY-MM` by month.
   */
  series: { key: string; count: number; valueCents: number }[];
};

type StatusRow = RowDataPacket & {
  status: string;
  count: number;
  value_cents: number;
  unpriced: number;
  paid_cents: number;
  unpaid_tax_cents: number;
};

type PaidRow = RowDataPacket & { orders: number; total_cents: number; tax_cents: number };

type SplitRow = RowDataPacket & { split: string; count: number; value_cents: number };

const committedBooking: readonly string[] = ["confirmed", "completed"];
const committedQuote: readonly string[] = ["won"];
const pipeline: readonly string[] = ["new", "pending", "quoted"];

function zeroed<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** The first New York date anything was placed, for "All time". */
async function firstOrderDate(): Promise<string | null> {
  const row = await queryOne<
    RowDataPacket & { first_booking: Date | null; first_quote: Date | null }
  >(
    `SELECT (SELECT MIN(created_at) FROM bookings) AS first_booking,
            (SELECT MIN(created_at) FROM quotes)   AS first_quote`,
  );
  const firsts = [row?.first_booking, row?.first_quote]
    .filter((value): value is Date => value instanceof Date)
    .map((value) => value.getTime());
  return firsts.length > 0 ? newYorkDate(new Date(Math.min(...firsts))) : null;
}

/**
 * `from` omitted means from the first order; `to` omitted means today. Both
 * are inclusive New York dates.
 */
export async function getReport(input: { from?: string; to?: string }): Promise<Report> {
  const to = input.to ?? todayInNewYork();
  const from = input.from ?? (await firstOrderDate()) ?? to;

  const start = newYorkMidnight(from);
  const end = newYorkMidnight(addDays(to, 1));
  const window = { start, end };
  const inWindow = "created_at >= :start AND created_at < :end";

  // Payments received in the window, for the sales tax owed on them.
  const paidInWindow = `payment_status = 'paid' AND paid_at >= :start AND paid_at < :end`;

  const [bookingRows, quoteRows, tripRows, vehicleRows, bookingPlaced, quotePlaced, bookingPaid, quotePaid] =
    await Promise.all([
      query<StatusRow>(
        `SELECT status,
                COUNT(*)                                            AS count,
                COALESCE(SUM(quoted_total_cents), 0)                AS value_cents,
                SUM(quoted_total_cents IS NULL)                     AS unpriced,
                COALESCE(SUM(CASE WHEN payment_status = 'paid'
                                  THEN quoted_total_cents END), 0)  AS paid_cents,
                COALESCE(SUM(CASE WHEN payment_status = 'unpaid'
                                  THEN tax_cents END), 0)           AS unpaid_tax_cents
           FROM bookings
          WHERE ${inWindow}
          GROUP BY status`,
        window,
      ),
      query<StatusRow>(
        `SELECT status,
                COUNT(*)                                            AS count,
                COALESCE(SUM(agreed_price_cents), 0)                AS value_cents,
                SUM(agreed_price_cents IS NULL)                     AS unpriced,
                COALESCE(SUM(CASE WHEN payment_status = 'paid'
                                  THEN agreed_price_cents END), 0)  AS paid_cents,
                COALESCE(SUM(CASE WHEN payment_status = 'unpaid'
                                  THEN tax_cents END), 0)           AS unpaid_tax_cents
           FROM quotes
          WHERE ${inWindow}
          GROUP BY status`,
        window,
      ),
      query<SplitRow>(
        `SELECT trip_type AS split, COUNT(*) AS count,
                COALESCE(SUM(quoted_total_cents), 0) AS value_cents
           FROM bookings
          WHERE ${inWindow} AND status IN ('confirmed','completed')
          GROUP BY trip_type
          ORDER BY count DESC`,
        window,
      ),
      query<SplitRow>(
        `SELECT vehicle_class AS split, COUNT(*) AS count,
                COALESCE(SUM(quoted_total_cents), 0) AS value_cents
           FROM bookings
          WHERE ${inWindow} AND status IN ('confirmed','completed')
          GROUP BY vehicle_class
          ORDER BY count DESC`,
        window,
      ),
      // Bucketed below on New York's calendar; `DATE(created_at)` would be UTC's.
      query<RowDataPacket & { created_at: Date; cents: number | null }>(
        `SELECT created_at, quoted_total_cents AS cents FROM bookings WHERE ${inWindow}`,
        window,
      ),
      query<RowDataPacket & { created_at: Date; cents: number | null }>(
        `SELECT created_at, agreed_price_cents AS cents FROM quotes WHERE ${inWindow}`,
        window,
      ),
      queryOne<PaidRow>(
        `SELECT COUNT(*) AS orders,
                COALESCE(SUM(quoted_total_cents), 0) AS total_cents,
                COALESCE(SUM(tax_cents), 0)          AS tax_cents
           FROM bookings WHERE ${paidInWindow} AND quoted_total_cents IS NOT NULL`,
        window,
      ),
      queryOne<PaidRow>(
        `SELECT COUNT(*) AS orders,
                COALESCE(SUM(agreed_price_cents), 0) AS total_cents,
                COALESCE(SUM(tax_cents), 0)          AS tax_cents
           FROM quotes WHERE ${paidInWindow} AND agreed_price_cents IS NOT NULL`,
        window,
      ),
    ]);

  const paidTotal = Number(bookingPaid?.total_cents ?? 0) + Number(quotePaid?.total_cents ?? 0);
  const paidTax = Number(bookingPaid?.tax_cents ?? 0) + Number(quotePaid?.tax_cents ?? 0);

  const bookingsByStatus = zeroed(bookingStatuses);
  const quotesByStatus = zeroed(quoteStatuses);

  const value = {
    committedCents: 0,
    committedCount: 0,
    collectedCents: 0,
    outstandingCents: 0,
    pipelineCents: 0,
    unpricedCount: 0,
  };
  let notYetCollectedCents = 0;
  let committedBookingCents = 0;
  let committedBookingPriced = 0;

  const tally = (
    rows: StatusRow[],
    counts: Record<string, number>,
    committed: readonly string[],
    isBooking: boolean,
  ) => {
    for (const row of rows) {
      const count = Number(row.count);
      const cents = Number(row.value_cents);
      const paid = Number(row.paid_cents);
      const unpriced = Number(row.unpriced);

      if (row.status in counts) counts[row.status] = count;
      value.collectedCents += paid;

      if (committed.includes(row.status)) {
        value.committedCents += cents;
        notYetCollectedCents += Number(row.unpaid_tax_cents);
        value.committedCount += count;
        value.outstandingCents += cents - paid;
        if (isBooking) {
          committedBookingCents += cents;
          committedBookingPriced += count - unpriced;
        }
      } else if (pipeline.includes(row.status)) {
        value.pipelineCents += cents;
        value.unpricedCount += unpriced;
      }
    }
  };

  tally(bookingRows, bookingsByStatus, committedBooking, true);
  tally(quoteRows, quotesByStatus, committedQuote, false);

  const bucket = daysBetween(from, to) + 1 > MAX_DAILY_BUCKETS ? "month" : "day";
  const keyOf = (date: string) => (bucket === "day" ? date : date.slice(0, 7));

  const series = new Map<string, { count: number; valueCents: number }>();
  for (let date = from; date <= to; date = addDays(date, 1)) {
    if (!series.has(keyOf(date))) series.set(keyOf(date), { count: 0, valueCents: 0 });
  }
  for (const row of [...bookingPlaced, ...quotePlaced]) {
    const point = series.get(keyOf(newYorkDate(new Date(row.created_at))));
    if (!point) continue;
    point.count += 1;
    point.valueCents += Number(row.cents ?? 0);
  }

  const split = (rows: SplitRow[]) =>
    rows.map((row) => ({
      key: row.split,
      count: Number(row.count),
      valueCents: Number(row.value_cents),
    }));

  const sum = (counts: Record<string, number>) =>
    Object.values(counts).reduce((total, count) => total + count, 0);

  return {
    range: { from, to, bucket },
    bookings: { total: sum(bookingsByStatus), byStatus: bookingsByStatus },
    quotes: { total: sum(quotesByStatus), byStatus: quotesByStatus },
    value: {
      ...value,
      averageBookingCents:
        committedBookingPriced > 0
          ? Math.round(committedBookingCents / committedBookingPriced)
          : null,
    },
    salesTax: {
      dueCents: paidTax,
      taxableSalesCents: paidTotal - paidTax,
      paidOrders: Number(bookingPaid?.orders ?? 0) + Number(quotePaid?.orders ?? 0),
      notYetCollectedCents,
    },
    byTrip: split(tripRows),
    byVehicle: split(vehicleRows),
    series: [...series].map(([key, point]) => ({ key, ...point })),
  };
}

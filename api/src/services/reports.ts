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
    /**
     * Marked paid — by Stripe or by an operator — whatever the status, **less
     * refunds** on those orders. Refunds are recorded per order, not per fare or
     * per extra charge, so they come off this one figure.
     */
    collectedCents: number;
    /** Refunded to customers on orders placed in the period. */
    refundedCents: number;
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
    /**
     * Tax inside every payment received in the period, **less the tax part of
     * every refund made in the period** — the figure to pay. Refunds are dated
     * by when they were recorded, as payments are by when they were paid, so a
     * refund of last month's payment lowers this month's return. It can be
     * negative when a period refunds more tax than it collected: a credit.
     */
    dueCents: number;
    /** Tax inside the period's payments, before refunds. */
    collectedTaxCents: number;
    /** The tax part of refunds recorded in the period. */
    refundedTaxCents: number;
    /** Everything refunded in the period, tax included. */
    refundedCents: number;
    /** Those payments before tax, less refunds before tax: the taxable sales line. */
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
  /** Bookings only: a quote trip still being quoted is counted as a quote. */
  pricing_mode?: string;
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

  const [
    bookingRows,
    quoteRows,
    tripRows,
    vehicleRows,
    bookingPlaced,
    quotePlaced,
    bookingPaid,
    quotePaid,
    chargesPaid,
    bookingRefundsPlaced,
    quoteRefundsPlaced,
    refundsMade,
  ] =
    await Promise.all([
      query<StatusRow>(
        `SELECT status, pricing_mode,
                COUNT(*)                                            AS count,
                COALESCE(SUM(quoted_total_cents), 0)                AS value_cents,
                SUM(quoted_total_cents IS NULL)                     AS unpriced,
                COALESCE(SUM(CASE WHEN payment_status = 'paid'
                                  THEN quoted_total_cents END), 0)  AS paid_cents,
                COALESCE(SUM(CASE WHEN payment_status = 'unpaid'
                                  THEN tax_cents END), 0)           AS unpaid_tax_cents
           FROM bookings
          WHERE ${inWindow}
          GROUP BY status, pricing_mode`,
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
      // Extra charges on bookings are taxed too, and likewise owed when paid.
      queryOne<PaidRow>(
        `SELECT COUNT(*) AS orders,
                COALESCE(SUM(amount_cents), 0) AS total_cents,
                COALESCE(SUM(tax_cents), 0)    AS tax_cents
           FROM booking_charges WHERE paid_at >= :start AND paid_at < :end`,
        window,
      ),
      // Refunds against orders PLACED in the window, to net the "collected" card
      // on the same date as the rest of that group.
      queryOne<PaidRow>(
        `SELECT COUNT(*) AS orders,
                COALESCE(SUM(r.amount_cents), 0) AS total_cents,
                COALESCE(SUM(r.tax_cents), 0)    AS tax_cents
           FROM refunds r JOIN bookings b ON r.subject_type = 'booking' AND b.id = r.subject_id
          WHERE b.created_at >= :start AND b.created_at < :end`,
        window,
      ),
      queryOne<PaidRow>(
        `SELECT COUNT(*) AS orders,
                COALESCE(SUM(r.amount_cents), 0) AS total_cents,
                COALESCE(SUM(r.tax_cents), 0)    AS tax_cents
           FROM refunds r JOIN quotes q ON r.subject_type = 'quote' AND q.id = r.subject_id
          WHERE q.created_at >= :start AND q.created_at < :end`,
        window,
      ),
      // Refunds RECORDED in the window, for the tax owed: dated like payments are.
      queryOne<PaidRow>(
        `SELECT COUNT(*) AS orders,
                COALESCE(SUM(amount_cents), 0) AS total_cents,
                COALESCE(SUM(tax_cents), 0)    AS tax_cents
           FROM refunds WHERE created_at >= :start AND created_at < :end`,
        window,
      ),
    ]);

  const paidTotal =
    Number(bookingPaid?.total_cents ?? 0) +
    Number(quotePaid?.total_cents ?? 0) +
    Number(chargesPaid?.total_cents ?? 0);
  const paidTax =
    Number(bookingPaid?.tax_cents ?? 0) +
    Number(quotePaid?.tax_cents ?? 0) +
    Number(chargesPaid?.tax_cents ?? 0);

  const refundedPlacedCents =
    Number(bookingRefundsPlaced?.total_cents ?? 0) + Number(quoteRefundsPlaced?.total_cents ?? 0);
  const refundedMadeCents = Number(refundsMade?.total_cents ?? 0);
  const refundedMadeTax = Number(refundsMade?.tax_cents ?? 0);

  const bookingsByStatus = zeroed(bookingStatuses);
  const quotesByStatus = zeroed(quoteStatuses);

  const value = {
    committedCents: 0,
    committedCount: 0,
    collectedCents: 0,
    refundedCents: refundedPlacedCents,
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

      // Counts follow the same rule as the Bookings and Quotes pages: a quote
      // trip is a quote until confirmed (a cancelled one reads as lost). The
      // money below is by status alone, so it is unaffected.
      const asQuote =
        isBooking && row.pricing_mode === "quote" && !committedBooking.includes(row.status);
      const target: Record<string, number> = asQuote ? quotesByStatus : counts;
      const key = asQuote && row.status === "cancelled" ? "lost" : row.status;
      if (key in target) target[key] = (target[key] ?? 0) + count;
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

  // The tally above counts what was marked paid; what went back is not collected.
  value.collectedCents -= refundedPlacedCents;

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
      dueCents: paidTax - refundedMadeTax,
      collectedTaxCents: paidTax,
      refundedTaxCents: refundedMadeTax,
      refundedCents: refundedMadeCents,
      taxableSalesCents: paidTotal - paidTax - (refundedMadeCents - refundedMadeTax),
      paidOrders: Number(bookingPaid?.orders ?? 0) + Number(quotePaid?.orders ?? 0),
      notYetCollectedCents,
    },
    byTrip: split(tripRows),
    byVehicle: split(vehicleRows),
    series: [...series].map(([key, point]) => ({ key, ...point })),
  };
}

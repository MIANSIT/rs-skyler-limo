import {
  executeOn,
  query,
  runOn,
  transaction,
  type Params,
  type RowDataPacket,
} from "../db.js";
import { ApiError } from "../lib/http.js";

/**
 * Refunds are **recorded here, never made here.** An operator sends the money
 * back from the Stripe Dashboard (or hands back cash) and then records what they
 * did, so the dashboard and the sales-tax report agree with the bank. Nothing in
 * this file talks to Stripe.
 *
 * Two rules the whole feature leans on:
 *
 *  - What can be refunded is what was actually paid, less what has already been
 *    refunded. For a booking that is the fare (once marked paid) plus every
 *    extra charge that has been paid; for a quote request, its agreed price.
 *  - The sales-tax share of a refund is the operator's choice, from nothing up to
 *    the tax that was paid and not yet returned. The report subtracts exactly
 *    what they entered, so keeping the tax on a partial refund stays possible.
 */

export type RefundSubject = "booking" | "quote";

export type Refund = {
  id: number;
  /** What the customer got back, sales tax included. */
  amountCents: number;
  /** The share of `amountCents` treated as sales tax returned. */
  taxCents: number;
  note: string | null;
  /** The operator who recorded it. */
  recordedBy: string | null;
  createdAt: string;
};

export type RefundSummary = {
  paidCents: number;
  paidTaxCents: number;
  refundedCents: number;
  refundedTaxCents: number;
  /** Still refundable: paid less refunded, never below zero. */
  remainingCents: number;
  remainingTaxCents: number;
};

type Run = <T extends RowDataPacket>(sql: string, params: Params) => Promise<T[]>;

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/** Pure, so the arithmetic can be checked without a database. */
export function summarise(paid: { cents: number; taxCents: number }, refunded: { cents: number; taxCents: number }): RefundSummary {
  return {
    paidCents: paid.cents,
    paidTaxCents: paid.taxCents,
    refundedCents: refunded.cents,
    refundedTaxCents: refunded.taxCents,
    remainingCents: Math.max(0, paid.cents - refunded.cents),
    remainingTaxCents: Math.max(0, paid.taxCents - refunded.taxCents),
  };
}

/**
 * What the customer has paid and what has gone back, read through `run` so the
 * same code serves a plain read and the locked read inside the recording
 * transaction. `lock` takes a row lock on the order, which is what stops two
 * operators refunding the same last dollar at once.
 */
async function readSummary(
  run: Run,
  type: RefundSubject,
  id: number,
  lock: boolean,
): Promise<RefundSummary> {
  const forUpdate = lock ? " FOR UPDATE" : "";
  let paidCents = 0;
  let paidTaxCents = 0;

  if (type === "booking") {
    const rows = await run<
      RowDataPacket & { payment_status: string; quoted_total_cents: number | null; tax_cents: number }
    >(
      `SELECT payment_status, quoted_total_cents, tax_cents FROM bookings WHERE id = :id${forUpdate}`,
      { id },
    );
    const booking = rows[0];
    if (!booking) throw ApiError.notFound("That booking no longer exists.");

    if (booking.payment_status === "paid") {
      paidCents += Number(booking.quoted_total_cents ?? 0);
      paidTaxCents += Number(booking.tax_cents);
    }

    // Extra charges are paid on their own, so they count the moment they are.
    const charges = await run<RowDataPacket & { total: number; tax: number }>(
      `SELECT COALESCE(SUM(amount_cents), 0) AS total, COALESCE(SUM(tax_cents), 0) AS tax
         FROM booking_charges WHERE booking_id = :id AND paid_at IS NOT NULL`,
      { id },
    );
    paidCents += Number(charges[0]?.total ?? 0);
    paidTaxCents += Number(charges[0]?.tax ?? 0);
  } else {
    const rows = await run<
      RowDataPacket & { payment_status: string; agreed_price_cents: number | null; tax_cents: number }
    >(
      `SELECT payment_status, agreed_price_cents, tax_cents FROM quotes WHERE id = :id${forUpdate}`,
      { id },
    );
    const quote = rows[0];
    if (!quote) throw ApiError.notFound("That quote request no longer exists.");

    if (quote.payment_status === "paid") {
      paidCents += Number(quote.agreed_price_cents ?? 0);
      paidTaxCents += Number(quote.tax_cents);
    }
  }

  const refunded = await run<RowDataPacket & { total: number; tax: number }>(
    `SELECT COALESCE(SUM(amount_cents), 0) AS total, COALESCE(SUM(tax_cents), 0) AS tax
       FROM refunds WHERE subject_type = :type AND subject_id = :id`,
    { type, id },
  );

  return summarise(
    { cents: paidCents, taxCents: paidTaxCents },
    { cents: Number(refunded[0]?.total ?? 0), taxCents: Number(refunded[0]?.tax ?? 0) },
  );
}

const pooled: Run = (sql, params) => query(sql, params);

export async function getRefunds(
  type: RefundSubject,
  id: number,
): Promise<{ refunds: Refund[]; summary: RefundSummary }> {
  const summary = await readSummary(pooled, type, id, false);

  const rows = await query<
    RowDataPacket & {
      id: number;
      amount_cents: number;
      tax_cents: number;
      note: string | null;
      recorded_by: string | null;
      created_at: Date;
    }
  >(
    `SELECT r.id, r.amount_cents, r.tax_cents, r.note, u.name AS recorded_by, r.created_at
       FROM refunds r
       LEFT JOIN admin_users u ON u.id = r.admin_user_id
      WHERE r.subject_type = :type AND r.subject_id = :id
      ORDER BY r.created_at DESC, r.id DESC`,
    { type, id },
  );

  return {
    summary,
    refunds: rows.map((row) => ({
      id: row.id,
      amountCents: row.amount_cents,
      taxCents: row.tax_cents,
      note: row.note,
      recordedBy: row.recorded_by,
      createdAt: row.created_at.toISOString(),
    })),
  };
}

export async function recordRefund(
  type: RefundSubject,
  id: number,
  input: { amountCents: number; taxCents: number; note?: string | null },
  adminUserId: number,
): Promise<{ refunds: Refund[]; summary: RefundSummary }> {
  if (!Number.isInteger(input.amountCents) || input.amountCents < 1) {
    throw ApiError.badRequest("Enter an amount above zero.");
  }

  await transaction(async (connection) => {
    const run: Run = (sql, params) => runOn(connection, sql, params);
    const before = await readSummary(run, type, id, true);

    if (before.paidCents === 0) {
      throw ApiError.conflict(
        `Nothing has been paid on this ${type === "booking" ? "booking" : "request"}, so there is nothing to refund.`,
      );
    }
    if (input.amountCents > before.remainingCents) {
      throw ApiError.conflict(
        before.remainingCents === 0
          ? `All ${money(before.paidCents)} has already been refunded.`
          : `You can refund at most ${money(before.remainingCents)} more. The customer paid ${money(before.paidCents)} and ${money(before.refundedCents)} is already refunded.`,
      );
    }
    if (input.taxCents > input.amountCents) {
      throw ApiError.badRequest("The sales tax part can't be more than the amount refunded.");
    }
    if (input.taxCents > before.remainingTaxCents) {
      throw ApiError.conflict(
        `At most ${money(before.remainingTaxCents)} of sales tax is left to refund on this order.`,
      );
    }

    await executeOn(
      connection,
      `INSERT INTO refunds (subject_type, subject_id, amount_cents, tax_cents, note, admin_user_id)
       VALUES (:type, :id, :amountCents, :taxCents, :note, :adminUserId)`,
      {
        type,
        id,
        amountCents: input.amountCents,
        taxCents: input.taxCents,
        note: input.note?.trim() || null,
        adminUserId,
      },
    );

    const left = before.remainingCents - input.amountCents;
    await executeOn(
      connection,
      `INSERT INTO activity_log
         (subject_type, subject_id, admin_user_id, action, from_status, to_status, note)
       VALUES (:type, :id, :adminUserId, 'refund_recorded', NULL, NULL, :note)`,
      {
        type,
        id,
        adminUserId,
        note: [
          `Refunded ${money(input.amountCents)}${
            input.taxCents > 0
              ? ` (${money(input.taxCents)} of it sales tax).`
              : ", with no sales tax returned."
          }`,
          left > 0 ? `${money(left)} still refundable.` : "Fully refunded.",
          input.note?.trim() ?? "",
        ]
          .filter(Boolean)
          .join(" "),
      },
    );
  });

  return getRefunds(type, id);
}

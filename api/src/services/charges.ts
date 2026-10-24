import { execute, query, type RowDataPacket } from "../db.js";
import { ApiError } from "../lib/http.js";
import { withTax } from "../lib/tax.js";
import type { Booking } from "./bookings.js";

/**
 * Extra charges on a booking — waiting time, an extra drop-off — added by an
 * operator after the trip was booked. See `booking_charges` in schema.sql.
 *
 * The operator types the amount before tax; the booking's own rate is added and
 * `amountCents` is what the customer pays, tax included. Each charge is paid separately, so the
 * original fare can be settled while a charge is still owing.
 */

type ChargeRow = RowDataPacket & {
  id: number;
  booking_id: number;
  title: string;
  amount_cents: number;
  tax_cents: number;
  paid_at: Date | null;
  created_at: Date;
};

export type Charge = ReturnType<typeof toCharge>;

function toCharge(row: ChargeRow) {
  return {
    id: row.id,
    title: row.title,
    /** What the customer pays, sales tax included. */
    amountCents: row.amount_cents,
    taxCents: row.tax_cents,
    paidAt: row.paid_at ? row.paid_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listCharges(bookingId: number): Promise<Charge[]> {
  const rows = await query<ChargeRow>(
    `SELECT id, booking_id, title, amount_cents, tax_cents, paid_at, created_at
       FROM booking_charges WHERE booking_id = :bookingId ORDER BY id`,
    { bookingId },
  );
  return rows.map(toCharge);
}

export async function addCharge(
  booking: Booking,
  title: string,
  /** Before tax. */
  fareCents: number,
  adminUserId: number,
): Promise<void> {
  if (booking.status === "cancelled") {
    throw ApiError.conflict("This booking is cancelled. Reopen it before adding a charge.");
  }
  const taxed = withTax(fareCents, booking.taxRate);
  await execute(
    `INSERT INTO booking_charges (booking_id, title, amount_cents, tax_cents, created_by)
     VALUES (:bookingId, :title, :amountCents, :taxCents, :adminUserId)`,
    { bookingId: booking.id, title, amountCents: taxed.totalCents, taxCents: taxed.taxCents, adminUserId },
  );
  await logCharge(
    booking.id,
    adminUserId,
    "charge_added",
    `${title}: ${money(taxed.totalCents)} (${money(fareCents)} + ${money(taxed.taxCents)} tax).`,
  );
}

async function findCharge(bookingId: number, chargeId: number): Promise<Charge> {
  const rows = await query<ChargeRow>(
    `SELECT id, booking_id, title, amount_cents, tax_cents, paid_at, created_at
       FROM booking_charges WHERE id = :chargeId AND booking_id = :bookingId`,
    { chargeId, bookingId },
  );
  if (!rows[0]) throw ApiError.notFound("That charge no longer exists.");
  return toCharge(rows[0]);
}

export async function deleteCharge(
  bookingId: number,
  chargeId: number,
  adminUserId: number,
): Promise<void> {
  const charge = await findCharge(bookingId, chargeId);
  if (charge.paidAt) {
    throw ApiError.conflict("This charge is already paid, so it cannot be removed.");
  }
  await execute(`DELETE FROM booking_charges WHERE id = :chargeId`, { chargeId });
  await logCharge(
    bookingId,
    adminUserId,
    "charge_removed",
    `${charge.title}: ${money(charge.amountCents)} removed.`,
  );
}

/** Operator marks a charge paid (cash, or a card over the phone) or unpaid again. */
export async function setChargePaid(
  bookingId: number,
  chargeId: number,
  paid: boolean,
  adminUserId: number,
): Promise<void> {
  const charge = await findCharge(bookingId, chargeId);
  await execute(
    `UPDATE booking_charges
        SET paid_at = ${paid ? "COALESCE(paid_at, UTC_TIMESTAMP())" : "NULL"},
            stripe_payment_intent_id = ${paid ? "stripe_payment_intent_id" : "NULL"}
      WHERE id = :chargeId`,
    { chargeId },
  );
  await logCharge(
    bookingId,
    adminUserId,
    paid ? "charge_paid" : "charge_unpaid",
    `${charge.title}: ${money(charge.amountCents)} marked ${paid ? "paid" : "unpaid"}.`,
  );
}

/** Marks these charges paid from a Stripe payment. Already-paid ones are left alone. */
export async function recordChargesPaid(
  bookingId: number,
  chargeIds: number[],
  paymentIntentId: string | null,
): Promise<number> {
  if (chargeIds.length === 0) return 0;
  const result = await execute(
    `UPDATE booking_charges
        SET paid_at = UTC_TIMESTAMP(), stripe_payment_intent_id = :paymentIntentId
      WHERE booking_id = :bookingId AND paid_at IS NULL AND id IN (${chargeIds
        .map((id) => Number(id))
        .filter(Number.isInteger)
        .join(",") || "0"})`,
    { bookingId, paymentIntentId },
  );
  return result.affectedRows;
}

export const unpaidCharges = (charges: Charge[]) => charges.filter((c) => !c.paidAt);

export const sumCents = (charges: Charge[]) =>
  charges.reduce((total, c) => total + c.amountCents, 0);

/**
 * What a Stripe Checkout Session for this booking covers right now: the fare if
 * it can still be paid online, plus every unpaid charge. Empty when nothing is
 * owing online.
 */
export function payableLines(
  booking: Booking,
  charges: Charge[],
  fareOnline: boolean,
): { label: string; amountCents: number; chargeId?: number }[] {
  const lines: { label: string; amountCents: number; chargeId?: number }[] = [];
  if (fareOnline && booking.quotedTotalCents) {
    lines.push({ label: "Trip fare", amountCents: booking.quotedTotalCents });
  }
  for (const charge of unpaidCharges(charges)) {
    lines.push({ label: charge.title, amountCents: charge.amountCents, chargeId: charge.id });
  }
  return lines;
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function logCharge(bookingId: number, adminUserId: number, action: string, note: string) {
  return execute(
    `INSERT INTO activity_log
       (subject_type, subject_id, admin_user_id, action, from_status, to_status, note)
     VALUES ('booking', :bookingId, :adminUserId, :action, NULL, NULL, :note)`,
    { bookingId, adminUserId, action, note },
  );
}

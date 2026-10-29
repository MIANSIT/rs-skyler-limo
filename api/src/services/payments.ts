import { randomUUID } from "node:crypto";

import Stripe from "stripe";
import type { z } from "zod";

import { execute, queryOne, type RowDataPacket } from "../db.js";
import { env } from "../env.js";
import { ApiError } from "../lib/http.js";
import { withTax } from "../lib/tax.js";
import type { createBookingSchema } from "../schemas.js";
import { createBooking, getBookingById, type Booking } from "./bookings.js";
import { listCharges, payableLines, recordChargesPaid } from "./charges.js";
import { getQuoteById, type Quote } from "./quotes.js";
import { sendBookingEmails, sendPaymentReceivedEmails } from "./mail.js";
import type { FareDecision } from "./pricing.js";
import { getDefaultTaxRate } from "./settings.js";
import { getVehicleBySlug } from "./vehicles.js";

/**
 * Card payment through Stripe Checkout.
 *
 * The customer is sent to Stripe's hosted page, so card details never touch
 * this server or the public site, and no Stripe key of any kind is exposed to
 * a browser. What happens here is: open a Checkout Session for the amount the
 * booking already carries, and later record that it was paid.
 *
 * The amount is always `quoted_total_cents` as stored — the fare `decideFare`
 * set at submission, or the one an operator set — never a figure from the
 * request. Nothing here refunds; that is done in the Stripe Dashboard.
 */

let client: Stripe | null = null;

export function stripeAvailable(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY);
}

function stripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new ApiError(503, "payments_unavailable", "Card payment is not available right now.");
  }
  client ??= new Stripe(env.STRIPE_SECRET_KEY);
  return client;
}

/**
 * Whether a customer can be offered "pay by card" for this booking now: they
 * chose card, it has a price, the money is not in yet, and the trip still
 * stands. A quote with no price yet is paid once an operator prices it.
 */
export function canPayOnline(booking: Booking): boolean {
  return (
    stripeAvailable() &&
    booking.paymentMethod === "card" &&
    booking.paymentStatus === "unpaid" &&
    booking.quotedTotalCents !== null &&
    booking.quotedTotalCents > 0 &&
    booking.status !== "cancelled"
  );
}

/**
 * Extra charges follow the booking's payment method: a card booking collects
 * them through Stripe, a cash booking collects them in cash and an operator
 * marks them paid. Only an operator can change the method.
 */
async function chargesForCard(booking: Booking) {
  return booking.paymentMethod === "card" ? listCharges(booking.id) : [];
}

/**
 * Everything a booking's payment link covers right now: the fare while it is
 * unpaid by card, plus every unpaid extra charge. `signedCents` is what the
 * link is signed over, so adding or paying a charge retires old links.
 */
export async function bookingDue(booking: Booking) {
  const charges = await listCharges(booking.id);
  const lines =
    stripeAvailable() && booking.status !== "cancelled"
      ? payableLines(booking, await chargesForCard(booking), canPayOnline(booking))
      : [];
  const dueCents = lines.reduce((total, line) => total + line.amountCents, 0);
  return {
    charges,
    lines,
    dueCents,
    canPay: lines.length > 0,
    signedCents: dueCents > 0 ? dueCents : booking.quotedTotalCents,
  };
}

function siteUrl(path: string): string {
  return `${env.SITE_BASE_URL.replace(/\/+$/, "")}${path}`;
}

/** A quote request (`RQ-…`) payable online: card chosen, priced, unpaid, not lost. */
export function canPayQuoteOnline(quote: Quote): boolean {
  return (
    stripeAvailable() &&
    quote.paymentMethod === "card" &&
    quote.paymentStatus === "unpaid" &&
    quote.agreedPriceCents !== null &&
    quote.agreedPriceCents > 0 &&
    quote.status !== "lost"
  );
}

/** What a Checkout Session is opened for. Bookings and quote requests alike. */
type Payable = {
  /** `draft` is a booking that does not exist yet: it is created when this is paid. */
  kind: "booking" | "quote" | "draft";
  id: number | string;
  reference: string | null;
  /** One Stripe line item each. A booking may owe its fare plus extra charges. */
  lines: { name: string; amountCents: number }[];
  /** Booking only: whether the trip fare is among the lines, and which charges. */
  includesFare?: boolean;
  chargeIds?: number[];
  email: string;
  cancelUrl?: string;
};

/**
 * The one place a Stripe Checkout Session is opened. The amount is the stored
 * one the caller read from the row — never anything a browser sent.
 */
async function openCheckout(item: Payable): Promise<string> {
  // `bookingId` keeps its original key so sessions opened before quote
  // requests could be paid still resolve; quotes carry `quoteId`.
  const metadata: Record<string, string> =
    item.kind === "draft"
      ? { draftId: String(item.id) }
      : item.kind === "booking"
        ? {
            bookingId: String(item.id),
            reference: item.reference ?? "",
            fare: item.includesFare === false ? "0" : "1",
            ...(item.chargeIds?.length ? { chargeIds: item.chargeIds.join(",") } : {}),
          }
        : { quoteId: String(item.id), reference: item.reference ?? "" };

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: item.lines.map((line) => ({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: line.amountCents,
        product_data: {
          // What was bought and its reference. Addresses stay with us.
          name: `RSSkyler Limo — ${line.name}`,
          description: item.reference
            ? `${item.kind === "booking" ? "Booking" : "Request"} ${item.reference}`
            : "Chauffeured transfer",
        },
      },
    })),
    customer_email: item.email,
    // A draft is swept after DRAFT_TTL_HOURS, so its payment page must die well
    // before that — otherwise a late payment would find no trip to book.
    // Booking and quote sessions keep Stripe's 24-hour default.
    ...(item.kind === "draft"
      ? { expires_at: Math.floor(Date.now() / 1000) + DRAFT_SESSION_MINUTES * 60 }
      : {}),
    ...(item.reference ? { client_reference_id: item.reference } : {}),
    metadata,
    payment_intent_data: { metadata },
    success_url: siteUrl("/pay/complete?session_id={CHECKOUT_SESSION_ID}"),
    cancel_url:
      item.cancelUrl ??
      siteUrl(
        item.reference
          ? `/pay/cancelled?reference=${encodeURIComponent(item.reference)}`
          : "/pay/cancelled",
      ),
  });

  if (!session.url) {
    throw new ApiError(502, "payments_failed", "Stripe did not return a payment page.");
  }

  await execute(
    `UPDATE ${item.kind === "draft" ? "booking_drafts" : item.kind === "booking" ? "bookings" : "quotes"}
        SET stripe_checkout_session_id = :sessionId WHERE id = :id`,
    { sessionId: session.id, id: item.id },
  );

  return session.url;
}

/**
 * Opens a Checkout Session for the booking's stored fare and returns its URL.
 * `cancelUrl` sends a customer who backs out somewhere other than the default
 * "not paid yet" page — the payment-link page they came from, say.
 */
export async function createCheckout(
  booking: Booking,
  options: { cancelUrl?: string } = {},
): Promise<string> {
  // The fare, if still owing, plus every unpaid extra charge.
  const fareOnline = canPayOnline(booking);
  const lines = payableLines(booking, await chargesForCard(booking), fareOnline);
  if (!stripeAvailable() || booking.status === "cancelled" || lines.length === 0) {
    throw ApiError.conflict("This booking cannot be paid online.");
  }

  let vehicleName = booking.vehicleClass;
  try {
    vehicleName = (await getVehicleBySlug(booking.vehicleClass))?.name ?? vehicleName;
  } catch {
    // The slug is a fine fallback for a line-item name.
  }

  return openCheckout({
    kind: "booking",
    id: booking.id,
    reference: booking.reference,
    lines: lines.map((line) => ({
      name: line.chargeId ? line.label : vehicleName,
      amountCents: line.amountCents,
    })),
    includesFare: fareOnline,
    chargeIds: lines.flatMap((line) => (line.chargeId ? [line.chargeId] : [])),
    email: booking.customerEmail,
    cancelUrl: options.cancelUrl,
  });
}

/** How long a staged booking's Stripe page stays payable (Stripe's minimum is 30). */
const DRAFT_SESSION_MINUTES = 60;
/** How long an unpaid draft is kept. Must stay well above the session's life. */
const DRAFT_TTL_HOURS = 3;

type BookingInput = z.infer<typeof createBookingSchema>;
type DraftPayload = { input: BookingInput; fare: FareDecision };

/** A fixed-fare website booking is staged, not saved, until it is paid. */
export function needsPaymentFirst(fare: FareDecision): boolean {
  return stripeAvailable() && fare.pricingMode === "fixed" && (fare.fareCents ?? 0) > 0;
}

/**
 * Stages a fixed-fare booking and opens Stripe for it. Nothing is written to
 * `bookings` and no email is sent: the booking is created by `recordDraftSession`
 * once Stripe says the money is in, so an abandoned checkout leaves no order.
 * The amount is the fare `decideFare` just set, with the day's tax rate added.
 */
export async function createDraftCheckout(
  input: BookingInput,
  fare: FareDecision,
): Promise<string> {
  const taxRate = await getDefaultTaxRate();
  const totalCents = withTax(fare.fareCents ?? 0, taxRate).totalCents;

  // Housekeeping: a draft older than its Stripe session can never be paid.
  await execute(
    `DELETE FROM booking_drafts
      WHERE claimed_at IS NULL AND created_at < (UTC_TIMESTAMP() - INTERVAL ${DRAFT_TTL_HOURS} HOUR)`,
  ).catch(() => undefined);

  const id = randomUUID();
  const payload: DraftPayload = { input, fare };
  await execute(
    `INSERT INTO booking_drafts (id, payload, tax_rate, created_at)
     VALUES (:id, :payload, :taxRate, UTC_TIMESTAMP())`,
    { id, payload: JSON.stringify(payload), taxRate },
  );

  let vehicleName = input.vehicleClass;
  try {
    vehicleName = (await getVehicleBySlug(input.vehicleClass))?.name ?? vehicleName;
  } catch {
    // The slug is a fine fallback for a line-item name.
  }

  return openCheckout({
    kind: "draft",
    id,
    reference: null,
    lines: [{ name: vehicleName, amountCents: totalCents }],
    email: input.customerEmail.toLowerCase(),
  });
}

type DraftRow = RowDataPacket & {
  payload: DraftPayload | string;
  tax_rate: string;
  booking_id: number | null;
};

/**
 * Turns a paid draft into the booking. The success page and the webhook can
 * arrive together, so the draft is claimed with a single conditional UPDATE:
 * exactly one caller creates the booking, the other waits for it.
 */
async function recordDraftSession(session: Stripe.Checkout.Session): Promise<PaymentRecord> {
  const draftId = String(session.metadata?.draftId);
  const draft = await queryOne<DraftRow>(
    `SELECT payload, tax_rate, booking_id FROM booking_drafts WHERE id = :draftId`,
    { draftId },
  );
  if (!draft) throw ApiError.notFound("No booking matches that payment.");

  if (session.payment_status !== "paid") {
    return { reference: "", paymentStatus: "unpaid", amountCents: null };
  }

  let bookingId = draft.booking_id;

  if (bookingId === null) {
    const claim = await execute(
      `UPDATE booking_drafts SET claimed_at = UTC_TIMESTAMP()
        WHERE id = :draftId AND claimed_at IS NULL`,
      { draftId },
    );

    if (claim.affectedRows > 0) {
      try {
        const { input, fare } = (
          typeof draft.payload === "string" ? JSON.parse(draft.payload) : draft.payload
        ) as DraftPayload;
        const created = await createBooking(
          { ...input, paymentMethod: "card" },
          "website",
          fare,
          Number(draft.tax_rate),
        );
        bookingId = created.id;
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null);

        await execute(
          `UPDATE bookings
              SET payment_status = 'paid', paid_at = UTC_TIMESTAMP(), payment_method = 'card',
                  -- Paid, so it is not "New" (that is for what needs pricing); it
                  -- waits as Pending until an operator confirms it.
                  status = 'pending',
                  stripe_checkout_session_id = :sessionId,
                  stripe_payment_intent_id = :paymentIntentId
            WHERE id = :id`,
          { id: created.id, sessionId: session.id, paymentIntentId },
        );
        await execute(`UPDATE booking_drafts SET booking_id = :id WHERE id = :draftId`, {
          id: created.id,
          draftId,
        });
        await execute(
          `INSERT INTO activity_log
             (subject_type, subject_id, admin_user_id, action, from_status, to_status, note)
           VALUES ('booking', :id, NULL, 'payment_paid', NULL, NULL, :note)`,
          {
            id: created.id,
            note: `Booked and paid $${((session.amount_total ?? 0) / 100).toFixed(2)} by card through Stripe.`,
          },
        );

        const paid = (await getBookingById(created.id)) ?? created;
        if (session.amount_total !== paid.quotedTotalCents) {
          console.error(
            `[stripe] ${paid.reference}: Stripe took ${session.amount_total}, booking total is ${paid.quotedTotalCents}`,
          );
        }

        // The booking exists only now, so this is the first the customer and
        // the office hear of it — confirmation, then the receipt.
        void sendBookingEmails(paid)
          .then(() => notifyPaid(session, paid, [], true))
          .catch((error) =>
            console.error(`[mail] emails for ${paid.reference} failed: ${String(error)}`),
          );
      } catch (error) {
        // Let the next attempt (the webhook retries) try again.
        await execute(`UPDATE booking_drafts SET claimed_at = NULL WHERE id = :draftId`, {
          draftId,
        }).catch(() => undefined);
        throw error;
      }
    } else {
      // The other caller is creating it. Wait briefly for the result.
      for (let attempt = 0; attempt < 40 && bookingId === null; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        bookingId =
          (
            await queryOne<DraftRow>(`SELECT booking_id FROM booking_drafts WHERE id = :draftId`, {
              draftId,
            })
          )?.booking_id ?? null;
      }
    }
  }

  const booking = bookingId === null ? null : await getBookingById(bookingId);
  if (!booking) throw new ApiError(503, "booking_pending", "Your booking is still being set up.");
  return {
    reference: booking.reference,
    paymentStatus: booking.paymentStatus === "paid" ? "paid" : "unpaid",
    amountCents: session.amount_total ?? booking.quotedTotalCents,
  };
}

const QUOTE_SERVICE: Record<string, string> = {
  corporate: "Corporate account",
  wedding: "Wedding",
  event: "Event",
  hourly: "Hourly charter",
  other: "Chauffeured transport",
};

/** The same for a quote request's agreed price. */
export async function createQuoteCheckout(
  quote: Quote,
  options: { cancelUrl?: string } = {},
): Promise<string> {
  if (!canPayQuoteOnline(quote)) {
    throw ApiError.conflict("This request cannot be paid online.");
  }

  return openCheckout({
    kind: "quote",
    id: quote.id,
    reference: quote.reference,
    lines: [
      {
        name: QUOTE_SERVICE[quote.serviceType] ?? "Chauffeured transport",
        amountCents: quote.agreedPriceCents!,
      },
    ],
    email: quote.customerEmail,
    cancelUrl: options.cancelUrl,
  });
}

/** What the success page shows: whose payment, and whether it is in. */
export type PaymentRecord = {
  reference: string;
  paymentStatus: "paid" | "unpaid";
  amountCents: number | null;
};

/**
 * Records a completed Checkout Session against its booking or quote request.
 *
 * Asks Stripe for the session rather than trusting whoever sent the id, so the
 * only thing a caller can do with this is have a genuinely paid session
 * recorded. Idempotent: the success page and the webhook may both arrive, and
 * the second is a no-op.
 */
export async function recordCheckout(sessionId: string): Promise<PaymentRecord> {
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe().checkout.sessions.retrieve(sessionId);
  } catch (error) {
    // An id Stripe does not know is a bad request, not our failure.
    if (error instanceof Stripe.errors.StripeInvalidRequestError) {
      throw ApiError.notFound("No payment matches that link.");
    }
    throw error;
  }
  return recordSession(session);
}

async function recordSession(session: Stripe.Checkout.Session): Promise<PaymentRecord> {
  if (session.metadata?.draftId) return recordDraftSession(session);

  const isQuote = Boolean(session.metadata?.quoteId);
  const id = Number(isQuote ? session.metadata?.quoteId : session.metadata?.bookingId);
  if (!Number.isInteger(id)) throw ApiError.notFound("No booking matches that payment.");

  const current = isQuote ? await getQuoteById(id) : await getBookingById(id);
  if (!current || current.reference !== session.metadata?.reference) {
    throw ApiError.notFound("No booking matches that payment.");
  }

  const amountOf = (row: Booking | Quote) =>
    "agreedPriceCents" in row ? row.agreedPriceCents : row.quotedTotalCents;

  let newlyRecorded = false;
  let paidChargeIds: number[] = [];
  if (session.payment_status === "paid") {
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? null);

    // Sessions opened before extra charges existed carry no `fare` flag and
    // always covered the fare.
    const coversFare = isQuote || session.metadata?.fare !== "0";
    const result = coversFare
      ? await execute(
          `UPDATE ${isQuote ? "quotes" : "bookings"}
              SET payment_status = 'paid', paid_at = UTC_TIMESTAMP(),
                  payment_method = 'card',
                  stripe_checkout_session_id = :sessionId,
                  stripe_payment_intent_id = :paymentIntentId
            WHERE id = :id AND payment_status = 'unpaid'`,
          { id, sessionId: session.id, paymentIntentId },
        )
      : { affectedRows: 0 };

    const chargeIds = (session.metadata?.chargeIds ?? "")
      .split(",")
      .map(Number)
      .filter((value) => Number.isInteger(value) && value > 0);
    paidChargeIds = chargeIds;
    const chargesPaid = isQuote ? 0 : await recordChargesPaid(id, chargeIds, paymentIntentId);

    newlyRecorded = result.affectedRows > 0 || chargesPaid > 0;
    if (newlyRecorded) {
      const amount = ((session.amount_total ?? 0) / 100).toFixed(2);
      await execute(
        `INSERT INTO activity_log
           (subject_type, subject_id, admin_user_id, action, from_status, to_status, note)
         VALUES (:kind, :id, NULL, 'payment_paid', NULL, NULL, :note)`,
        {
          kind: isQuote ? "quote" : "booking",
          id,
          note: `Paid $${amount} by card through Stripe${chargesPaid > 0 ? ` (includes ${chargesPaid} extra ${chargesPaid === 1 ? "charge" : "charges"})` : ""}.`,
        },
      );
    }
  }

  const latest = (isQuote ? await getQuoteById(id) : await getBookingById(id)) ?? current;

  if (newlyRecorded) {
    void notifyPaid(session, latest, paidChargeIds, coversFareOf(session, isQuote)).catch((error) =>
      console.error(`[mail] payment receipt for ${latest.reference} failed: ${String(error)}`),
    );
  }

  return {
    reference: latest.reference,
    paymentStatus: latest.paymentStatus === "paid" ? "paid" : "unpaid",
    // What this payment was for. A session that settled only extra charges must
    // not read back as the trip fare.
    amountCents:
      session.payment_status === "paid" && session.amount_total
        ? session.amount_total
        : amountOf(latest),
  };
}

const coversFareOf = (session: Stripe.Checkout.Session, isQuote: boolean) =>
  isQuote || session.metadata?.fare !== "0";

/**
 * Emails the customer and the office that a payment came in: what was paid and,
 * if anything is still owing, the balance. Built from the stored rows after the
 * payment is recorded, so the figures are the database's, not the session's.
 */
async function notifyPaid(
  session: Stripe.Checkout.Session,
  row: Booking | Quote,
  paidChargeIds: number[],
  coversFare: boolean,
): Promise<void> {
  const paidFor: { label: string; amountCents: number }[] = [];
  const dueLines: { label: string; amountCents: number }[] = [];
  let trip: Parameters<typeof sendPaymentReceivedEmails>[0]["trip"];

  if ("agreedPriceCents" in row) {
    paidFor.push({ label: "Agreed price", amountCents: row.agreedPriceCents ?? 0 });
  } else {
    if (coversFare) paidFor.push({ label: "Trip fare", amountCents: row.quotedTotalCents ?? 0 });
    else if (row.paymentStatus !== "paid" && row.quotedTotalCents && row.status !== "cancelled") {
      dueLines.push({ label: "Trip fare", amountCents: row.quotedTotalCents });
    }
    for (const charge of await listCharges(row.id)) {
      if (paidChargeIds.includes(charge.id)) {
        paidFor.push({ label: charge.title, amountCents: charge.amountCents });
      } else if (!charge.paidAt) {
        dueLines.push({ label: charge.title, amountCents: charge.amountCents });
      }
    }
    const vehicle = (await getVehicleBySlug(row.vehicleClass).catch(() => null))?.name;
    trip = {
      pickup: row.pickup,
      destination: row.destination,
      pickupAt: row.pickupAt,
      vehicle: vehicle ?? row.vehicleClass,
    };
  }

  await sendPaymentReceivedEmails({
    reference: row.reference,
    kind: "agreedPriceCents" in row ? "quote" : "booking",
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    paidCents: session.amount_total ?? paidFor.reduce((sum, line) => sum + line.amountCents, 0),
    paidFor,
    paidAt: new Date(),
    dueCents: dueLines.reduce((sum, line) => sum + line.amountCents, 0),
    dueLines,
    trip,
  });
}

/**
 * The webhook: the same recording, driven by Stripe rather than by the
 * customer's browser, for the customer who pays and closes the tab.
 * `rawBody` must be the exact bytes Stripe sent — the signature covers them.
 */
export async function handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new ApiError(503, "webhook_unconfigured", "Webhook secret is not set.");
  }

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    throw new ApiError(400, "bad_signature", "Webhook signature did not verify.");
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    await recordSession(event.data.object);
  }
}

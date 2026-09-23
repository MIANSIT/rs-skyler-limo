import Stripe from "stripe";

import { execute } from "../db.js";
import { env } from "../env.js";
import { ApiError } from "../lib/http.js";
import { getBookingById, type Booking } from "./bookings.js";
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

function siteUrl(path: string): string {
  return `${env.SITE_BASE_URL.replace(/\/+$/, "")}${path}`;
}

/** Opens a Checkout Session for the booking's stored fare and returns its URL. */
export async function createCheckout(booking: Booking): Promise<string> {
  if (!canPayOnline(booking)) {
    throw ApiError.conflict("This booking cannot be paid online.");
  }

  let vehicleName = booking.vehicleClass;
  try {
    vehicleName = (await getVehicleBySlug(booking.vehicleClass))?.name ?? vehicleName;
  } catch {
    // The slug is a fine fallback for a line-item name.
  }

  const metadata = { bookingId: String(booking.id), reference: booking.reference };

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: booking.quotedTotalCents!,
          product_data: {
            // Reference and vehicle only. Addresses stay with us: Stripe needs
            // to know what was bought, not where the customer was going.
            name: `RSSkyler Limo — ${vehicleName}`,
            description: `Booking ${booking.reference}`,
          },
        },
      },
    ],
    customer_email: booking.customerEmail,
    client_reference_id: booking.reference,
    metadata,
    payment_intent_data: { metadata },
    success_url: siteUrl("/pay/complete?session_id={CHECKOUT_SESSION_ID}"),
    cancel_url: siteUrl(`/pay/cancelled?reference=${encodeURIComponent(booking.reference)}`),
  });

  if (!session.url) {
    throw new ApiError(502, "payments_failed", "Stripe did not return a payment page.");
  }

  await execute(
    `UPDATE bookings SET stripe_checkout_session_id = :sessionId WHERE id = :id`,
    { sessionId: session.id, id: booking.id },
  );

  return session.url;
}

/**
 * Records a completed Checkout Session against its booking.
 *
 * Asks Stripe for the session rather than trusting whoever sent the id, so the
 * only thing a caller can do with this is have a genuinely paid session
 * recorded. Idempotent: the success page and the webhook may both arrive, and
 * the second is a no-op.
 */
export async function recordCheckout(sessionId: string): Promise<Booking> {
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

async function recordSession(session: Stripe.Checkout.Session): Promise<Booking> {
  const bookingId = Number(session.metadata?.bookingId);
  const booking = Number.isInteger(bookingId) ? await getBookingById(bookingId) : null;

  if (!booking || booking.reference !== session.metadata?.reference) {
    throw ApiError.notFound("No booking matches that payment.");
  }

  if (session.payment_status !== "paid") return booking;

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  const result = await execute(
    `UPDATE bookings
        SET payment_status = 'paid', paid_at = UTC_TIMESTAMP(),
            payment_method = 'card',
            stripe_checkout_session_id = :sessionId,
            stripe_payment_intent_id = :paymentIntentId
      WHERE id = :id AND payment_status = 'unpaid'`,
    { id: booking.id, sessionId: session.id, paymentIntentId },
  );

  if (result.affectedRows > 0) {
    const amount = ((session.amount_total ?? 0) / 100).toFixed(2);
    await execute(
      `INSERT INTO activity_log
         (subject_type, subject_id, admin_user_id, action, from_status, to_status, note)
       VALUES ('booking', :id, NULL, 'payment_paid', NULL, NULL, :note)`,
      { id: booking.id, note: `Paid $${amount} by card through Stripe.` },
    );
  }

  return (await getBookingById(booking.id)) ?? booking;
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

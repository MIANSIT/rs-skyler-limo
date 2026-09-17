import nodemailer, { type Transporter } from "nodemailer";

import { buildBookingEmail } from "../emails/booking.js";
import { env } from "../env.js";
import type { Booking } from "./bookings.js";
import { getVehicleBySlug } from "./vehicles.js";

/**
 * Outbound email.
 *
 * Two rules govern everything here:
 *
 *  1. **A booking is never lost to a mail failure.** The row is already
 *     committed by the time this runs. Yahoo being slow, throttling us, or
 *     rejecting the password must show up in the log and nowhere else — never
 *     as a 500 on a customer's confirmation screen.
 *  2. **The customer and the office get separate messages.** Not one message
 *     with four recipients: the office copy carries the customer's phone,
 *     email and the internal framing, and copying everyone would also show
 *     each operator's address to the customer and to each other.
 */

let transporter: Transporter | null = null;
let warnedUnconfigured = false;

export function mailAvailable(): boolean {
  return Boolean(env.MAIL && env.MAIL_APP_PASSWORD);
}

function getTransport(): Transporter | null {
  if (!mailAvailable()) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.MAIL_HOST,
      port: env.MAIL_PORT,
      // 465 is implicit TLS. On 587 this must be false so STARTTLS is used
      // instead — setting it true there produces a hang, not an error.
      secure: env.MAIL_PORT === 465,
      auth: { user: env.MAIL, pass: env.MAIL_APP_PASSWORD },
      // One connection reused across sends. A booking sends two messages and
      // opening a fresh TLS session for each is a wasted round trip.
      pool: true,
      maxConnections: 2,
      maxMessages: 50,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 20_000,
    });
  }

  return transporter;
}

/**
 * Checked once at boot so a wrong password is discovered on a quiet morning
 * rather than by a customer who never got a confirmation. Advisory only — a
 * failure here does not stop the API serving.
 */
export async function verifyMail(): Promise<void> {
  if (!mailAvailable()) {
    console.warn(
      "[mail] MAIL / MAIL_APP_PASSWORD are unset — booking emails are disabled and will be logged instead.",
    );
    return;
  }

  try {
    await getTransport()!.verify();
    console.log(
      `[mail] ready: ${env.MAIL} via ${env.MAIL_HOST}:${env.MAIL_PORT} → ops ${env.MAIL_OPS_RECIPIENTS.join(", ")}`,
    );
  } catch (error) {
    console.error(
      `[mail] transport will not authenticate — booking emails will fail: ${describe(error)}`,
    );
  }
}

type Message = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

/**
 * Sends, or explains why it did not. Never throws — every caller is on a path
 * where the customer's booking has already succeeded.
 */
async function send(message: Message): Promise<boolean> {
  const transport = getTransport();

  if (!transport) {
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      console.warn("[mail] not configured; skipping all sends.");
    }
    console.log(
      `[mail] would send "${message.subject}" to ${[message.to].flat().join(", ")}`,
    );
    return false;
  }

  try {
    const info = await transport.sendMail({
      from: { name: env.MAIL_FROM_NAME, address: env.MAIL! },
      to: message.to,
      replyTo: message.replyTo,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    console.log(
      `[mail] sent "${message.subject}" to ${[message.to].flat().join(", ")} (${info.messageId})`,
    );
    return true;
  } catch (error) {
    console.error(
      `[mail] FAILED "${message.subject}" to ${[message.to].flat().join(", ")}: ${describe(error)}`,
    );
    return false;
  }
}

/**
 * Both messages for one booking: the customer's confirmation and the office's
 * notification.
 *
 * Awaited by nobody on the request path — see the call site in
 * `routes/public.ts`. The customer sees their reference immediately and the
 * mail goes out behind it.
 */
export async function sendBookingEmails(booking: Booking): Promise<void> {
  // Name the car, not its slug. A deleted vehicle falls back to a tidied slug
  // rather than dropping the whole email.
  let vehicleName: string | null = null;
  try {
    vehicleName = (await getVehicleBySlug(booking.vehicleClass))?.name ?? null;
  } catch {
    vehicleName = null;
  }

  const customer = buildBookingEmail(booking, vehicleName, "customer");
  const ops = buildBookingEmail(booking, vehicleName, "ops");

  await Promise.allSettled([
    send({
      to: booking.customerEmail,
      subject: customer.subject,
      html: customer.html,
      text: customer.text,
    }),
    send({
      to: env.MAIL_OPS_RECIPIENTS,
      // So hitting reply in the office writes to the customer, not to us.
      replyTo: booking.customerEmail,
      subject: ops.subject,
      html: ops.html,
      text: ops.text,
    }),
  ]);
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as NodeJS.ErrnoException).code;
    return code ? `${code} — ${error.message}` : error.message;
  }
  return String(error);
}

/** Lets the process exit promptly instead of waiting on a pooled socket. */
export function closeMail(): void {
  transporter?.close();
  transporter = null;
}

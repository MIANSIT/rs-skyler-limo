import { env } from "../env.js";
import type { Booking } from "../services/bookings.js";
import type { Quote } from "../services/quotes.js";
import { PAYMENT_LABELS, type BuiltEmail } from "./booking.js";
import {
  BRAND,
  CONTACT,
  SANS_FONT,
  detailRow,
  escapeHtml,
  formatDate,
  formatMoney,
  formatTime,
  panel,
  shell,
} from "./render.js";

/**
 * The customer's email when an operator moves a booking or a quote request on.
 *
 * Sent only when the operator leaves "Email the customer" ticked, so a status
 * fixed by mistake does not have to reach anyone. The operator's own note is
 * never included — it is written for the record, not for the customer.
 *
 * Every message carries the tracking link: the same page, reference and phone
 * number the customer already used, so there is one place to check, not two.
 */

/** Booking statuses that tell the customer something. `new` and `quoted` do
 *  not: a reopened booking is an internal correction, and a priced one has its
 *  own "Your quote is ready" email. */
export const NOTIFIED_BOOKING_STATUSES = ["confirmed", "cancelled", "completed", "pending"] as const;

/** Quote-request statuses worth a message. `new` is a correction. */
export const NOTIFIED_QUOTE_STATUSES = ["quoted", "won", "lost", "pending"] as const;

function siteUrl(path: string): string {
  return `${env.SITE_BASE_URL.replace(/\/+$/, "")}${path}`;
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || "there";
}

/** The gold button. One per email, as on the site. */
function button(href: string, label: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 24px 0;">
    <tr>
      <td style="background:${BRAND.gold};">
        <a href="${escapeHtml(href)}"
           style="display:inline-block;padding:14px 28px;font-family:${SANS_FONT};font-size:15px;font-weight:700;color:${BRAND.midnight};text-decoration:none;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>`;
}

function paragraph(html: string): string {
  return `<p style="margin:0 0 24px 0;font-family:${SANS_FONT};font-size:15px;line-height:1.7;color:${BRAND.charcoal};">${html}</p>`;
}

const TRACK_HINT =
  "The link fills in your reference. You add the phone number you gave us, so a forwarded email cannot open your trip.";

const FOOTER =
  "Questions? Call us or reply to this email. A person will always answer faster than a form.";

function signOff(): string[] {
  return ["", "--", "RSSkyler Limo — chauffeured travel across all five boroughs.", `${CONTACT.phone} · ${CONTACT.email}`];
}

/* -------------------------------------------------------------------------- */
/* Bookings                                                                   */
/* -------------------------------------------------------------------------- */

type BookingCopy = { subject: string; headline: string; intro: string; after: string };

function bookingCopy(booking: Booking): BookingCopy {
  const name = firstName(booking.customerName);
  // The fact table shows "10:30 AM / 10:30"; a sentence reads better with one.
  const when = `${formatDate(booking.pickupAt)} at ${formatTime(booking.pickupAt).split(" / ")[0]}`;
  const cardDue =
    booking.paymentMethod === "card" && booking.paymentStatus === "unpaid" && booking.quotedTotalCents !== null;

  switch (booking.status) {
    case "confirmed":
      return {
        subject: `Booking confirmed — ${booking.reference}`,
        headline: "Your booking is confirmed.",
        intro: `Thank you, ${name}. Your car is booked for ${when}, New York time. The details are below.`,
        after: cardDue
          ? "You chose to pay by card. You can pay securely through Stripe from your booking page."
          : booking.paymentMethod === "cash"
            ? "You chose cash on delivery: pay your chauffeur at the end of the trip."
            : "",
      };
    case "cancelled":
      return {
        subject: `Booking cancelled — ${booking.reference}`,
        headline: "Your booking is cancelled.",
        intro: `${name}, your booking for ${when} has been cancelled.`,
        after: `If you did not ask for this, or want to book again, call us on ${CONTACT.phone}. If you paid in advance, we will be in touch about that payment under our terms.`,
      };
    case "completed":
      return {
        subject: `Thank you for riding with us — ${booking.reference}`,
        headline: "Thank you for riding with us.",
        intro: `${name}, your trip on ${formatDate(booking.pickupAt)} is complete. We hope it went exactly as it should.`,
        after: "If you have a minute, tell us how it went. Every review is read before it is published.",
      };
    default:
      return {
        subject: `Booking on hold — ${booking.reference}`,
        headline: "Your booking is on hold.",
        intro: `${name}, we need to confirm a detail with you before your booking for ${when} can go ahead.`,
        after: `A reservations agent will be in touch. If it is urgent, call us on ${CONTACT.phone}.`,
      };
  }
}

export function buildBookingUpdateEmail(booking: Booking, vehicleName: string): BuiltEmail {
  const copy = bookingCopy(booking);
  const completed = booking.status === "completed";
  const fare = formatMoney(booking.quotedTotalCents);
  const trackUrl = siteUrl(`/track?reference=${encodeURIComponent(booking.reference)}`);
  const reviewUrl = siteUrl(`/review?reference=${encodeURIComponent(booking.reference)}`);

  const tripRows = [
    detailRow("Pick-up", escapeHtml(booking.pickup)),
    detailRow("Drop-off", escapeHtml(booking.destination)),
    detailRow("Date", escapeHtml(formatDate(booking.pickupAt))),
    detailRow("Time", escapeHtml(formatTime(booking.pickupAt))),
    detailRow("Vehicle", escapeHtml(vehicleName)),
    fare ? detailRow("Fare", escapeHtml(fare)) : "",
    detailRow(
      "Payment",
      escapeHtml(
        `${PAYMENT_LABELS[booking.paymentMethod] ?? booking.paymentMethod}${
          booking.paymentStatus === "paid" ? " · paid" : ""
        }`,
      ),
    ),
  ].join("");

  // On a finished trip the one gold action is the review; the booking page
  // becomes a plain link. Everywhere else it is the booking page.
  const actions = completed
    ? `${button(reviewUrl, "Leave a review")}${paragraph(
        `Your booking stays on the <a href="${escapeHtml(trackUrl)}" style="color:${BRAND.midnight};font-weight:600;">tracking page</a>.`,
      )}`
    : `${button(trackUrl, "View your booking")}${paragraph(escapeHtml(TRACK_HINT))}`;

  const html = shell({
    preheader: `${booking.reference} · ${copy.headline}`,
    eyebrow: "Your booking",
    headline: copy.headline,
    intro: copy.intro,
    headerFacts: [
      { label: "Pick-up date", value: formatDate(booking.pickupAt) },
      { label: "Pick-up time", value: formatTime(booking.pickupAt) },
      { label: "Reference", value: booking.reference },
    ],
    body: [
      panel("The trip", tripRows),
      copy.after ? paragraph(escapeHtml(copy.after)) : "",
      actions,
    ].join(""),
    footerNote: FOOTER,
  });

  const text = [
    `RSSKYLER LIMO — ${copy.headline.replace(/\.$/, "").toUpperCase()}`,
    "",
    copy.intro,
    "",
    `Reference:  ${booking.reference}`,
    `Date:       ${formatDate(booking.pickupAt)}`,
    `Time:       ${formatTime(booking.pickupAt)} (New York)`,
    `Pick-up:    ${booking.pickup}`,
    `Drop-off:   ${booking.destination}`,
    `Vehicle:    ${vehicleName}`,
    ...(fare ? [`Fare:       ${fare}`] : []),
    `Payment:    ${PAYMENT_LABELS[booking.paymentMethod] ?? booking.paymentMethod}${
      booking.paymentStatus === "paid" ? " (paid)" : ""
    }`,
    ...(copy.after ? ["", copy.after] : []),
    "",
    ...(completed ? [`Leave a review: ${reviewUrl}`] : []),
    `View your booking: ${trackUrl}`,
    TRACK_HINT,
    ...signOff(),
  ].join("\n");

  return { subject: copy.subject, html, text };
}

/* -------------------------------------------------------------------------- */
/* Quote requests                                                             */
/* -------------------------------------------------------------------------- */

const QUOTE_SERVICE_LABELS: Record<string, string> = {
  corporate: "Corporate account",
  wedding: "Wedding",
  event: "Event",
  hourly: "Hourly charter",
  other: "Something else",
};

function quoteCopy(quote: Quote): BookingCopy {
  const name = firstName(quote.customerName);

  switch (quote.status) {
    case "quoted":
      return {
        subject: `Your price — ${quote.reference}`,
        headline: "We have priced your request.",
        intro:
          quote.agreedPriceCents !== null
            ? `Thank you, ${name}. The price for your request is ${formatMoney(quote.agreedPriceCents)}. The details are below.`
            : `Thank you, ${name}. A reservations agent has worked out a price for your request and sends it to you by phone or email.`,
        after: "Reply to this email or call us to go ahead. Nothing is reserved or charged until you agree the price.",
      };
    case "won":
      return {
        subject: `Going ahead — ${quote.reference}`,
        headline: "Your request is going ahead.",
        intro: `Thank you, ${name}, for choosing us. We will be in touch with the details.`,
        after: "",
      };
    case "lost":
      return {
        subject: `Request closed — ${quote.reference}`,
        headline: "We have closed your request.",
        intro: `${name}, this request is now closed.`,
        after: `If that is not right, or your plans change, call us on ${CONTACT.phone}. We would be glad to help.`,
      };
    default:
      return {
        subject: `Request on hold — ${quote.reference}`,
        headline: "Your request is on hold.",
        intro: `${name}, we need to confirm a detail with you before we can price your request.`,
        after: `A reservations agent will be in touch. If it is urgent, call us on ${CONTACT.phone}.`,
      };
  }
}

export function buildQuoteUpdateEmail(quote: Quote): BuiltEmail {
  const copy = quoteCopy(quote);
  const service = QUOTE_SERVICE_LABELS[quote.serviceType] ?? quote.serviceType;
  const trackUrl = siteUrl(`/track?reference=${encodeURIComponent(quote.reference)}`);
  const eventDay = quote.eventDate ? formatDate(`${quote.eventDate}T12:00:00Z`) : "Not given yet";

  const html = shell({
    preheader: `${quote.reference} · ${copy.headline}`,
    eyebrow: "Your request",
    headline: copy.headline,
    intro: copy.intro,
    headerFacts: [
      { label: "Service", value: service },
      { label: "Event date", value: eventDay },
      { label: "Reference", value: quote.reference },
    ],
    body: [
      panel(
        "The request",
        [
          detailRow("Service", escapeHtml(service)),
          detailRow("Event date", escapeHtml(eventDay)),
          quote.agreedPriceCents !== null
            ? detailRow("Price", escapeHtml(formatMoney(quote.agreedPriceCents) ?? ""))
            : "",
        ].join(""),
      ),
      copy.after ? paragraph(escapeHtml(copy.after)) : "",
      button(trackUrl, "View your request"),
      paragraph(escapeHtml(TRACK_HINT)),
    ].join(""),
    footerNote: FOOTER,
  });

  const text = [
    `RSSKYLER LIMO — ${copy.headline.replace(/\.$/, "").toUpperCase()}`,
    "",
    copy.intro,
    "",
    `Reference:  ${quote.reference}`,
    `Service:    ${service}`,
    `Event date: ${eventDay}`,
    ...(quote.agreedPriceCents !== null ? [`Price:      ${formatMoney(quote.agreedPriceCents)}`] : []),
    ...(copy.after ? ["", copy.after] : []),
    "",
    `View your request: ${trackUrl}`,
    TRACK_HINT,
    ...signOff(),
  ].join("\n");

  return { subject: copy.subject, html, text };
}

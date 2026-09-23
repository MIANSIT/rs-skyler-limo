import { env } from "../env.js";
import type { Booking } from "../services/bookings.js";
import type { Quote } from "../services/quotes.js";
import {
  BRAND,
  CONTACT,
  DISPLAY_FONT,
  SANS_FONT,
  detailRow,
  escapeHtml,
  formatDate,
  formatDateTime,
  formatMoney,
  formatTime,
  panel,
  shell,
} from "./render.js";
import { PAYMENT_LABELS, type BuiltEmail } from "./booking.js";

/**
 * Two emails for a quote request, one for a priced trip.
 *
 * A quote request (the quote, corporate and wedding forms) used to land in the
 * dashboard and nothing else: the customer got a reference on screen and
 * nothing in writing, and the office only knew if someone was watching. It now
 * follows the booking email's rule, two separate messages: the customer's
 * acknowledgement and the office's notification.
 *
 * Every string a customer typed goes through `escapeHtml` before it reaches
 * the markup.
 */

const SERVICE_LABELS: Record<string, string> = {
  corporate: "Corporate account",
  wedding: "Wedding",
  event: "Event",
  hourly: "Hourly charter",
  other: "Something else",
};

/** A calendar date with no time. Noon UTC is the same day in New York. */
function eventDay(date: string | null): string {
  return date ? formatDate(`${date}T12:00:00Z`) : "Not given yet";
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || "there";
}

/** Opens the tracking page with the reference already filled in. */
function trackUrl(reference: string): string {
  return `${env.SITE_BASE_URL.replace(/\/+$/, "")}/track?reference=${encodeURIComponent(reference)}`;
}

/* -------------------------------------------------------------------------- */
/* A quote request                                                            */
/* -------------------------------------------------------------------------- */

export type QuoteEmailAudience = "customer" | "ops";

export function buildQuoteRequestEmail(
  quote: Quote,
  audience: QuoteEmailAudience,
): BuiltEmail {
  const isOps = audience === "ops";
  const service = SERVICE_LABELS[quote.serviceType] ?? quote.serviceType;

  const tripRows = [
    detailRow("Service", escapeHtml(service)),
    detailRow("Event date", escapeHtml(eventDay(quote.eventDate))),
    quote.passengers
      ? detailRow("Passengers", escapeHtml(String(quote.passengers)))
      : "",
    quote.company ? detailRow("Company", escapeHtml(quote.company)) : "",
  ].join("");

  const contactRows = [
    detailRow("Name", escapeHtml(quote.customerName)),
    detailRow(
      "Phone",
      `<a href="tel:${escapeHtml(quote.customerPhone.replace(/[^\d+]/g, ""))}" style="color:${BRAND.midnight};text-decoration:none;">${escapeHtml(quote.customerPhone)}</a>`,
    ),
    detailRow(
      "Email",
      `<a href="mailto:${escapeHtml(quote.customerEmail)}" style="color:${BRAND.midnight};text-decoration:none;">${escapeHtml(quote.customerEmail)}</a>`,
    ),
  ].join("");

  const detailsPanel = panel(
    isOps ? "What the customer wrote" : "What you told us",
    `<tr><td style="padding:12px 16px;font-family:${SANS_FONT};font-size:15px;line-height:1.7;color:${BRAND.charcoal};white-space:pre-wrap;">${escapeHtml(quote.details)}</td></tr>`,
  );

  const nextStep = isOps
    ? ""
    : `
  <p style="margin:0 0 24px 0;font-family:${SANS_FONT};font-size:15px;line-height:1.7;color:${BRAND.charcoal};">
    A reservations agent will reply by phone or email, usually the same day.
    If the date is close, call us on
    <a href="tel:${CONTACT.phoneHref}" style="color:${BRAND.midnight};font-weight:600;">${escapeHtml(CONTACT.phone)}</a>.
    Nothing is reserved or charged until you agree the price.
  </p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 24px 0;">
    <tr>
      <td style="background:${BRAND.gold};">
        <a href="${escapeHtml(trackUrl(quote.reference))}"
           style="display:inline-block;padding:14px 28px;font-family:${SANS_FONT};font-size:15px;font-weight:700;color:${BRAND.midnight};text-decoration:none;">
          Track this request
        </a>
      </td>
    </tr>
  </table>
  <p style="margin:0 0 24px 0;font-family:${SANS_FONT};font-size:13px;line-height:1.7;color:rgba(44,44,47,0.66);">
    The link fills in your reference. You add the phone number you gave us, so a forwarded email cannot open your trip.
  </p>`;

  const body = [
    panel("The request", tripRows),
    isOps ? panel("Contact", contactRows) : "",
    detailsPanel,
    nextStep,
  ].join("");

  const created = quote.createdAt;

  const html = shell({
    preheader: isOps
      ? `${quote.customerName} · ${service} · ${eventDay(quote.eventDate)}`
      : `Reference ${quote.reference} · we will price your ${service.toLowerCase()} and come back to you`,
    eyebrow: isOps ? "Reservations desk" : "Quote request",
    headline: isOps
      ? `New quote request — ${quote.reference}`
      : "We have your request.",
    intro: isOps
      ? `Submitted ${formatDateTime(created)} from the ${quote.source} form. It needs a price and a reply.`
      : `Thank you, ${firstName(quote.customerName)}. We have what we need and a reservations agent will price your trip. Your reference is below.`,
    headerFacts: [
      { label: "Service", value: service },
      { label: "Event date", value: eventDay(quote.eventDate) },
      { label: "Reference", value: quote.reference },
    ],
    body,
    footerNote: isOps
      ? "Open the dashboard, Quotes, to reply and update the status."
      : "Need to add something? Reply to this email or call us. A person will always answer faster than a form.",
  });

  const subject = isOps
    ? `[QUOTE] ${quote.reference} · ${service} · ${quote.customerName}`
    : `Request received — ${quote.reference}`;

  const lines = [
    isOps
      ? `NEW QUOTE REQUEST — ${quote.reference}`
      : "RSSKYLER LIMO — REQUEST RECEIVED",
    "",
    `Reference:  ${quote.reference}`,
    `Service:    ${service}`,
    `Event date: ${eventDay(quote.eventDate)}`,
  ];
  if (quote.passengers) lines.push(`Passengers: ${quote.passengers}`);
  if (quote.company) lines.push(`Company:    ${quote.company}`);
  if (isOps) {
    lines.push(
      "",
      "CONTACT",
      `  ${quote.customerName}`,
      `  ${quote.customerPhone}`,
      `  ${quote.customerEmail}`,
      "",
      `Submitted ${formatDateTime(created)} from the ${quote.source} form.`,
    );
  }
  lines.push("", "DETAILS", `  ${quote.details.trim()}`);
  if (!isOps) {
    lines.push(
      "",
      "A reservations agent will reply by phone or email, usually the same day.",
      "Nothing is reserved or charged until you agree the price.",
      "",
      `Track this request: ${trackUrl(quote.reference)}`,
      "The link fills in your reference. You add the phone number you gave us, so a forwarded email cannot open your trip.",
    );
  }
  lines.push(
    "",
    "--",
    "RSSkyler Limo — chauffeured travel across all five boroughs.",
    `${CONTACT.phone} · ${CONTACT.email}`,
  );

  return { subject, html, text: lines.join("\n") };
}

/* -------------------------------------------------------------------------- */
/* A priced trip                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Sent to the customer when an operator sets a price on their booking.
 *
 * Customer only: the office entered the price and does not need a copy of it.
 * The fare sits on a midnight panel because gold text is only allowed on
 * midnight, and the one gold button is the tracking link, where the price is
 * also shown.
 */
export function buildQuotedEmail(
  booking: Booking,
  vehicleName: string,
): BuiltEmail {
  const fare = formatMoney(booking.quotedTotalCents) ?? "";
  const note = booking.quoteNote?.trim() ?? "";

  const farePanel = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;border-collapse:collapse;">
    <tr>
      <td style="background:${BRAND.midnight};padding:20px 16px;">
        <div style="font-family:${SANS_FONT};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.gold};font-weight:700;">Your quote</div>
        <div style="margin-top:8px;font-family:${DISPLAY_FONT};font-size:30px;line-height:1;font-weight:600;color:${BRAND.white};">${escapeHtml(fare)}</div>
        <div style="margin-top:10px;font-family:${SANS_FONT};font-size:13px;line-height:1.7;color:rgba(255,255,255,0.70);">
          Nothing is charged until you confirm. Call or reply to this email to go ahead.${
            booking.paymentMethod === "card"
              ? " To pay by card, open your booking below and choose Pay by card — payment is taken securely by Stripe."
              : " You chose cash on delivery: pay your chauffeur at the end of the trip."
          }
        </div>
      </td>
    </tr>
  </table>`;

  const noteBlock = note
    ? panel(
        "A note from our reservations team",
        `<tr><td style="padding:12px 16px;font-family:${SANS_FONT};font-size:15px;line-height:1.7;color:${BRAND.charcoal};white-space:pre-wrap;">${escapeHtml(note)}</td></tr>`,
      )
    : "";

  const tripRows = [
    detailRow("Pick-up", escapeHtml(booking.pickup)),
    detailRow("Drop-off", escapeHtml(booking.destination)),
    detailRow("Date", escapeHtml(formatDate(booking.pickupAt))),
    detailRow("Time", escapeHtml(formatTime(booking.pickupAt))),
    detailRow("Vehicle", escapeHtml(vehicleName)),
    detailRow(
      "Payment",
      escapeHtml(PAYMENT_LABELS[booking.paymentMethod] ?? booking.paymentMethod),
    ),
  ].join("");

  const trackButton = `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 24px 0;">
    <tr>
      <td style="background:${BRAND.gold};">
        <a href="${escapeHtml(trackUrl(booking.reference))}"
           style="display:inline-block;padding:14px 28px;font-family:${SANS_FONT};font-size:15px;font-weight:700;color:${BRAND.midnight};text-decoration:none;">
          View this booking
        </a>
      </td>
    </tr>
  </table>
  <p style="margin:0 0 24px 0;font-family:${SANS_FONT};font-size:13px;line-height:1.7;color:rgba(44,44,47,0.66);">
    The link fills in your reference. You add the phone number you gave us, so a forwarded email cannot open your trip.
  </p>`;

  const html = shell({
    preheader: `Reference ${booking.reference} · ${fare} · ${booking.pickup} to ${booking.destination}`,
    eyebrow: "Your quote",
    headline: "Your quote is ready.",
    intro: `Thank you, ${firstName(booking.customerName)}. We have priced your trip. The details are below.`,
    headerFacts: [
      { label: "Pick-up date", value: formatDate(booking.pickupAt) },
      { label: "Pick-up time", value: formatTime(booking.pickupAt) },
      { label: "Reference", value: booking.reference },
    ],
    body: [farePanel, noteBlock, panel("The trip", tripRows), trackButton].join(""),
    footerNote:
      "Questions about the price? Call us. A person will always answer faster than a form.",
  });

  const text = [
    "RSSKYLER LIMO — YOUR QUOTE IS READY",
    "",
    `Reference:  ${booking.reference}`,
    `Date:       ${formatDate(booking.pickupAt)}`,
    `Time:       ${formatTime(booking.pickupAt)} (New York)`,
    "",
    `Pick-up:    ${booking.pickup}`,
    `Drop-off:   ${booking.destination}`,
    `Vehicle:    ${vehicleName}`,
    `Payment:    ${PAYMENT_LABELS[booking.paymentMethod] ?? booking.paymentMethod}`,
    "",
    `Quote:      ${fare}`,
    "Nothing is charged until you confirm. Call or reply to this email to go ahead.",
    booking.paymentMethod === "card"
      ? "To pay by card, open your booking below and choose Pay by card (Stripe)."
      : "You chose cash on delivery: pay your chauffeur at the end of the trip.",
    ...(note ? ["", "NOTE", `  ${note}`] : []),
    "",
    `View this booking: ${trackUrl(booking.reference)}`,
    "The link fills in your reference. You add the phone number you gave us, so a forwarded email cannot open your trip.",
    "",
    "--",
    "RSSkyler Limo — chauffeured travel across all five boroughs.",
    `${CONTACT.phone} · ${CONTACT.email}`,
  ].join("\n");

  return { subject: `Your quote — ${booking.reference}`, html, text };
}

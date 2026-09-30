import { env } from "../env.js";
import type { FieldChange } from "../services/changes.js";
import type { Booking } from "../services/bookings.js";
import type { Quote } from "../services/quotes.js";
import type { BuiltEmail } from "./booking.js";
import {
  BRAND,
  CONTACT,
  DISPLAY_FONT,
  SANS_FONT,
  detailRow,
  escapeHtml,
  formatDate,
  formatTime,
  panel,
  shell,
} from "./render.js";

/**
 * Emails for a customer changing their own booking or quote request.
 *
 *  - The code: customer only. No button — the one thing to do is type six
 *    digits into the page they already have open.
 *  - The change: the customer gets what their booking now says; the office
 *    gets the same with every change as before → after, so a dispatcher can
 *    act on it without opening the dashboard.
 */

function siteUrl(path: string): string {
  return `${env.SITE_BASE_URL.replace(/\/+$/, "")}${path}`;
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || "there";
}

function paragraph(html: string): string {
  return `<p style="margin:0 0 24px 0;font-family:${SANS_FONT};font-size:15px;line-height:1.7;color:${BRAND.charcoal};">${html}</p>`;
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

const signOff = ["", "--", "RSSkyler Limo — chauffeured travel across all five boroughs.", `${CONTACT.phone} · ${CONTACT.email}`];

/** The changes as panel rows: label, then "before → after". */
function changeRows(changes: FieldChange[]): string {
  return changes
    .map((change) =>
      detailRow(
        change.label,
        `<span style="color:rgba(44,44,47,0.66);font-weight:400;text-decoration:line-through;">${escapeHtml(
          change.before,
        )}</span><br>${escapeHtml(change.after)}`,
      ),
    )
    .join("");
}

function changeText(changes: FieldChange[]): string[] {
  return changes.map((change) => `  ${change.label}: ${change.before} → ${change.after}`);
}

/* -------------------------------------------------------------------------- */
/* The code                                                                   */
/* -------------------------------------------------------------------------- */

export function buildChangeCodeEmail(input: {
  reference: string;
  kind: "booking" | "quote";
  customerName: string;
  code: string;
  expiresInMinutes: number;
}): BuiltEmail {
  const noun = input.kind === "booking" ? "booking" : "request";
  const subject = `Your code to change ${input.reference}: ${input.code}`;
  const intro = `${firstName(input.customerName)}, here is the code to change your ${noun}. Enter it on the page you have open. It works for ${input.expiresInMinutes} minutes, once.`;
  const warning = `If you did not ask for this, ignore this email. Nothing on your ${noun} changes without this code.`;

  const html = shell({
    preheader: `Your code is ${input.code}. It works for ${input.expiresInMinutes} minutes.`,
    eyebrow: input.kind === "booking" ? "Change your booking" : "Change your request",
    headline: "Your code",
    intro,
    headerFacts: [{ label: "Reference", value: input.reference }],
    body: [
      // Midnight numerals on grey, spaced for reading aloud. Gold stays a rule.
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;border-collapse:collapse;">
        <tr>
          <td style="border-top:2px solid ${BRAND.gold};background:${BRAND.grey};padding:22px 16px;text-align:center;font-family:${DISPLAY_FONT};font-size:36px;font-weight:600;letter-spacing:0.3em;color:${BRAND.midnight};">
            ${escapeHtml(input.code)}
          </td>
        </tr>
      </table>`,
      paragraph(escapeHtml(warning)),
    ].join(""),
    footerNote: "We will never ask you for this code by phone. Only type it into rsskylerlimo.com.",
  });

  const text = [
    "RSSKYLER LIMO — YOUR CODE",
    "",
    intro,
    "",
    `Code:       ${input.code}`,
    `Reference:  ${input.reference}`,
    "",
    warning,
    "We will never ask you for this code by phone.",
    ...signOff,
  ].join("\n");

  return { subject, html, text };
}

/* -------------------------------------------------------------------------- */
/* A booking changed                                                          */
/* -------------------------------------------------------------------------- */

export function buildBookingChangedEmail(
  booking: Booking,
  vehicleName: string,
  changes: FieldChange[],
  audience: "customer" | "ops",
): BuiltEmail {
  const trackUrl = siteUrl(`/track?reference=${encodeURIComponent(booking.reference)}`);
  const reconfirm = booking.status === "pending";
  const ops = audience === "ops";

  const subject = ops
    ? `Customer changed ${booking.reference} — ${booking.customerName}`
    : `Your booking was updated — ${booking.reference}`;
  const headline = ops ? "A customer changed their booking." : "Your booking is updated.";
  const intro = ops
    ? `${booking.customerName} changed ${booking.reference} from the tracking page, after confirming the email on the booking. It is tagged in the dashboard until someone marks it reviewed.`
    : `Thank you, ${firstName(booking.customerName)}. We have saved your changes to ${booking.reference}. The reference stays the same.`;
  const after = ops
    ? reconfirm
      ? "The trip details moved, so the booking is back to Pending. Re-confirm it once a car is set."
      : ""
    : reconfirm
      ? "Because the trip changed, a reservations agent will re-confirm it with you shortly."
      : "";

  const tripRows = [
    detailRow("Pick-up", escapeHtml(booking.pickup)),
    detailRow("Drop-off", escapeHtml(booking.destination)),
    detailRow("Date", escapeHtml(formatDate(booking.pickupAt))),
    detailRow("Time", escapeHtml(formatTime(booking.pickupAt))),
    detailRow("Vehicle", escapeHtml(vehicleName)),
    ...(ops
      ? [
          detailRow("Customer", escapeHtml(booking.customerName)),
          detailRow("Phone", escapeHtml(booking.customerPhone)),
          detailRow("Email", escapeHtml(booking.customerEmail)),
        ]
      : []),
  ].join("");

  const html = shell({
    preheader: `${booking.reference} · ${changes.map((change) => change.label).join(", ")}`,
    eyebrow: ops ? "Changed by customer" : "Your booking",
    headline,
    intro,
    headerFacts: [
      { label: "Pick-up date", value: formatDate(booking.pickupAt) },
      { label: "Pick-up time", value: formatTime(booking.pickupAt) },
      { label: "Reference", value: booking.reference },
    ],
    body: [
      panel("What changed", changeRows(changes)),
      panel(ops ? "The booking now" : "Your trip now", tripRows),
      after ? paragraph(escapeHtml(after)) : "",
      ops ? "" : button(trackUrl, "View your booking"),
      ops
        ? ""
        : paragraph(
            escapeHtml(`Did not make this change? Call us straight away on ${CONTACT.phone}.`),
          ),
    ].join(""),
    footerNote: "Questions? Call us or reply to this email. A person will always answer faster than a form.",
  });

  const text = [
    `RSSKYLER LIMO — ${headline.replace(/\.$/, "").toUpperCase()}`,
    "",
    intro,
    "",
    "What changed:",
    ...changeText(changes),
    "",
    `Reference:  ${booking.reference}`,
    `Date:       ${formatDate(booking.pickupAt)}`,
    `Time:       ${formatTime(booking.pickupAt)} (New York)`,
    `Pick-up:    ${booking.pickup}`,
    `Drop-off:   ${booking.destination}`,
    `Vehicle:    ${vehicleName}`,
    ...(ops ? [`Customer:   ${booking.customerName}`, `Phone:      ${booking.customerPhone}`, `Email:      ${booking.customerEmail}`] : []),
    ...(after ? ["", after] : []),
    ...(ops ? [] : ["", `View your booking: ${trackUrl}`, `Did not make this change? Call us on ${CONTACT.phone}.`]),
    ...signOff,
  ].join("\n");

  return { subject, html, text };
}

/* -------------------------------------------------------------------------- */
/* A quote request changed                                                    */
/* -------------------------------------------------------------------------- */

export function buildQuoteChangedEmail(
  quote: Quote,
  changes: FieldChange[],
  audience: "customer" | "ops",
): BuiltEmail {
  const trackUrl = siteUrl(`/track?reference=${encodeURIComponent(quote.reference)}`);
  const ops = audience === "ops";
  const repriced = changes.some((change) => change.label === "Agreed price");

  const subject = ops
    ? `Customer changed ${quote.reference} — ${quote.customerName}`
    : `Your request was updated — ${quote.reference}`;
  const headline = ops ? "A customer changed their request." : "Your request is updated.";
  const intro = ops
    ? `${quote.customerName} changed ${quote.reference} from the tracking page, after confirming the email on the request. It is tagged in the dashboard until someone marks it reviewed.`
    : `Thank you, ${firstName(quote.customerName)}. We have saved your changes to ${quote.reference}. The reference stays the same.`;
  const after = repriced
    ? ops
      ? "The request changed after it was priced, so the agreed price was cleared and it is back to New. Price it again."
      : "Because the request changed after we priced it, a reservations agent will send you a new price."
    : "";

  const html = shell({
    preheader: `${quote.reference} · ${changes.map((change) => change.label).join(", ")}`,
    eyebrow: ops ? "Changed by customer" : "Your request",
    headline,
    intro,
    headerFacts: [{ label: "Reference", value: quote.reference }],
    body: [
      panel("What changed", changeRows(changes)),
      ops
        ? panel(
            "The customer",
            [
              detailRow("Name", escapeHtml(quote.customerName)),
              detailRow("Phone", escapeHtml(quote.customerPhone)),
              detailRow("Email", escapeHtml(quote.customerEmail)),
            ].join(""),
          )
        : "",
      after ? paragraph(escapeHtml(after)) : "",
      ops ? "" : button(trackUrl, "View your request"),
      ops ? "" : paragraph(escapeHtml(`Did not make this change? Call us straight away on ${CONTACT.phone}.`)),
    ].join(""),
    footerNote: "Questions? Call us or reply to this email. A person will always answer faster than a form.",
  });

  const text = [
    `RSSKYLER LIMO — ${headline.replace(/\.$/, "").toUpperCase()}`,
    "",
    intro,
    "",
    "What changed:",
    ...changeText(changes),
    ...(ops ? ["", `Customer:   ${quote.customerName}`, `Phone:      ${quote.customerPhone}`, `Email:      ${quote.customerEmail}`] : []),
    ...(after ? ["", after] : []),
    ...(ops ? [] : ["", `View your request: ${trackUrl}`, `Did not make this change? Call us on ${CONTACT.phone}.`]),
    ...signOff,
  ].join("\n");

  return { subject, html, text };
}

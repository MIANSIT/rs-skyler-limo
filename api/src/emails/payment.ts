import type { Booking } from "../services/bookings.js";
import type { BuiltEmail } from "./booking.js";
import {
  BRAND,
  CONTACT,
  DISPLAY_FONT,
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
 * "Pay for your booking" — the email behind the dashboard's Send payment link.
 *
 * One gold button, the payment link. The fare sits on a midnight panel, the
 * one ground where gold may carry text. The link is signed for this booking
 * and this amount, and expires; the email says so, plainly.
 */

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || "there";
}

export function buildPaymentLinkEmail(
  booking: Booking,
  vehicleName: string,
  payUrl: string,
  expiresAt: Date,
): BuiltEmail {
  const fare = formatMoney(booking.quotedTotalCents) ?? "";
  const expires = formatDate(expiresAt.toISOString());

  const farePanel = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;border-collapse:collapse;">
    <tr>
      <td style="background:${BRAND.midnight};padding:20px 16px;">
        <div style="font-family:${SANS_FONT};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.gold};font-weight:700;">Amount due</div>
        <div style="margin-top:8px;font-family:${DISPLAY_FONT};font-size:30px;line-height:1;font-weight:600;color:${BRAND.white};">${escapeHtml(fare)}</div>
        <div style="margin-top:10px;font-family:${SANS_FONT};font-size:13px;line-height:1.7;color:rgba(255,255,255,0.70);">
          Paid by card through Stripe. Your card details go to Stripe, never to us.
        </div>
      </td>
    </tr>
  </table>`;

  const tripRows = [
    detailRow("Pick-up", escapeHtml(booking.pickup)),
    detailRow("Drop-off", escapeHtml(booking.destination)),
    detailRow("Date", escapeHtml(formatDate(booking.pickupAt))),
    detailRow("Time", escapeHtml(formatTime(booking.pickupAt))),
    detailRow("Vehicle", escapeHtml(vehicleName)),
  ].join("");

  const payButton = `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 16px 0;">
    <tr>
      <td style="background:${BRAND.gold};">
        <a href="${escapeHtml(payUrl)}"
           style="display:inline-block;padding:14px 28px;font-family:${SANS_FONT};font-size:15px;font-weight:700;color:${BRAND.midnight};text-decoration:none;">
          Pay ${escapeHtml(fare)} securely
        </a>
      </td>
    </tr>
  </table>
  <p style="margin:0 0 24px 0;font-family:${SANS_FONT};font-size:13px;line-height:1.7;color:rgba(44,44,47,0.66);">
    This link is for booking ${escapeHtml(booking.reference)} only and works until ${escapeHtml(expires)}.
    If the price changes we send a new one.
  </p>`;

  const html = shell({
    preheader: `${booking.reference} · ${fare} · pay securely by card`,
    eyebrow: "Payment",
    headline: "Pay for your booking.",
    intro: `Thank you, ${firstName(booking.customerName)}. Your trip is priced and ready to pay. One tap below takes you to Stripe's secure page.`,
    headerFacts: [
      { label: "Pick-up date", value: formatDate(booking.pickupAt) },
      { label: "Pick-up time", value: formatTime(booking.pickupAt) },
      { label: "Reference", value: booking.reference },
    ],
    body: [farePanel, payButton, panel("The trip", tripRows)].join(""),
    footerNote:
      "Would rather pay another way? Call us or reply to this email. A person will always answer faster than a form.",
  });

  const text = [
    "RSSKYLER LIMO — PAY FOR YOUR BOOKING",
    "",
    `Reference:  ${booking.reference}`,
    `Amount:     ${fare}`,
    `Date:       ${formatDate(booking.pickupAt)}`,
    `Time:       ${formatTime(booking.pickupAt)} (New York)`,
    `Pick-up:    ${booking.pickup}`,
    `Drop-off:   ${booking.destination}`,
    `Vehicle:    ${vehicleName}`,
    "",
    `Pay securely by card: ${payUrl}`,
    `This link is for this booking only and works until ${expires}.`,
    "",
    "--",
    "RSSkyler Limo — chauffeured travel across all five boroughs.",
    `${CONTACT.phone} · ${CONTACT.email}`,
  ].join("\n");

  return { subject: `Pay for your booking — ${booking.reference}`, html, text };
}

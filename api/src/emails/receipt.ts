import { formatReference } from "../lib/reference.js";
import type { BuiltEmail, BookingEmailAudience } from "./booking.js";
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

/**
 * "Payment received" — sent once, when Stripe confirms a card payment.
 *
 * Same document as every other email: midnight header and footer, the gold rule,
 * the reference top right. The amount paid sits on the midnight panel, the one
 * ground where gold may carry text. When something is still owing (an extra
 * charge added after the fare was paid, say) it is shown as a balance due;
 * when nothing is, the email says only what was paid.
 *
 * Two audiences, one layout: the customer gets a receipt, the office gets the
 * same figures plus who paid and how to reach them.
 */

export type ReceiptInput = {
  /** `RS-…` for a booking, `RQ-…` for a quote request. */
  reference: string;
  kind: "booking" | "quote";
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  /** What this payment settled, in cents, tax included. */
  paidCents: number;
  /** One entry per item this payment covered: "Trip fare", a charge title. */
  paidFor: { label: string; amountCents: number }[];
  paidAt: Date;
  /** Still owing after this payment, in cents. Zero when settled. */
  dueCents: number;
  dueLines: { label: string; amountCents: number }[];
  /** Booking only. */
  trip?: {
    pickup: string;
    destination: string;
    pickupAt: string;
    vehicle: string;
  };
};

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || "there";
}

export function buildReceiptEmail(
  input: ReceiptInput,
  audience: BookingEmailAudience,
): BuiltEmail {
  const isOps = audience === "ops";
  const ref = formatReference(input.reference);
  const paid = formatMoney(input.paidCents) ?? "";
  const due = formatMoney(input.dueCents) ?? "";
  const settled = input.dueCents <= 0;
  const paidOn = formatDateTime(input.paidAt.toISOString());

  const lineDiv = (label: string, cents: number) =>
    `<div style="margin-top:6px;font-family:${SANS_FONT};font-size:13px;color:rgba(255,255,255,0.85);">${escapeHtml(label)} · ${escapeHtml(formatMoney(cents) ?? "")}</div>`;

  const amountPanel = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;border-collapse:collapse;">
    <tr>
      <td style="background:${BRAND.midnight};padding:20px 16px;">
        <div style="font-family:${SANS_FONT};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.gold};font-weight:700;">Amount paid</div>
        <div style="margin-top:8px;font-family:${DISPLAY_FONT};font-size:30px;line-height:1;font-weight:600;color:${BRAND.white};">${escapeHtml(paid)}</div>
        ${input.paidFor.length > 1 || (input.paidFor[0] && input.paidFor[0].label !== "Trip fare") ? input.paidFor.map((line) => lineDiv(line.label, line.amountCents)).join("") : ""}
        <div style="margin-top:10px;font-family:${SANS_FONT};font-size:13px;line-height:1.7;color:rgba(255,255,255,0.70);">
          Paid by card through Stripe on ${escapeHtml(paidOn)} (New York time).
        </div>
      </td>
    </tr>
  </table>`;

  const duePanel = settled
    ? ""
    : panel(
        "Balance due",
        [
          ...input.dueLines.map((line) =>
            detailRow(line.label, escapeHtml(formatMoney(line.amountCents) ?? "")),
          ),
          detailRow("Total due", escapeHtml(due)),
        ].join(""),
      );

  const accountRows = [
    detailRow("Reference", escapeHtml(ref)),
    detailRow("Customer", escapeHtml(input.customerName)),
    isOps ? detailRow("Email", escapeHtml(input.customerEmail)) : "",
    isOps ? detailRow("Phone", escapeHtml(input.customerPhone)) : "",
    detailRow("Status", escapeHtml(settled ? "Paid in full" : `Paid · ${due} still due`)),
  ].join("");

  const tripPanel = input.trip
    ? panel(
        "The trip",
        [
          detailRow("Pick-up", escapeHtml(input.trip.pickup)),
          detailRow("Drop-off", escapeHtml(input.trip.destination)),
          detailRow("Date", escapeHtml(formatDate(input.trip.pickupAt))),
          detailRow("Time", escapeHtml(formatTime(input.trip.pickupAt))),
          detailRow("Vehicle", escapeHtml(input.trip.vehicle)),
        ].join(""),
      )
    : "";

  const headline = settled ? "Payment received." : "Payment received. A balance remains.";
  const intro = isOps
    ? `${input.customerName} paid ${paid} for ${ref}. ${settled ? "Nothing further is owing." : `${due} is still due.`}`
    : settled
      ? `Thank you, ${firstName(input.customerName)}. We have received your payment of ${paid}. Nothing further is owing on ${ref}.`
      : `Thank you, ${firstName(input.customerName)}. We have received your payment of ${paid}. ${due} is still due on ${ref}; the details are below.`;

  const html = shell({
    preheader: `${ref} · ${paid} paid${settled ? "" : ` · ${due} due`}`,
    eyebrow: isOps ? "Payment · Office copy" : "Payment receipt",
    headline,
    intro,
    headerFacts: [
      { label: "Paid on", value: formatDate(input.paidAt.toISOString()) },
      { label: "Amount", value: paid },
      { label: "Reference", value: ref },
    ],
    body: [amountPanel, duePanel, panel("Payment", accountRows), tripPanel].join(""),
    footerNote: isOps
      ? "Recorded automatically from Stripe. Reply to this email to write to the customer."
      : "Keep this email as your receipt. Questions about your booking? Reply to this email. A person will always answer faster than a form.",
  });

  const text = [
    `RSSKYLER LIMO — ${isOps ? "PAYMENT RECEIVED (OFFICE COPY)" : "PAYMENT RECEIPT"}`,
    "",
    `Reference:  ${ref}`,
    `Customer:   ${input.customerName}`,
    ...(isOps ? [`Email:      ${input.customerEmail}`, `Phone:      ${input.customerPhone}`] : []),
    "",
    ...input.paidFor.map((line) => `${line.label}: ${formatMoney(line.amountCents)}`),
    `Amount paid: ${paid}`,
    `Paid on:     ${paidOn} (New York)`,
    settled
      ? "Status:      Paid in full"
      : [
          ...input.dueLines.map((line) => `Due — ${line.label}: ${formatMoney(line.amountCents)}`),
          `Total due:   ${due}`,
        ].join("\n"),
    ...(input.trip
      ? [
          "",
          `Date:       ${formatDate(input.trip.pickupAt)}`,
          `Time:       ${formatTime(input.trip.pickupAt)} (New York)`,
          `Pick-up:    ${input.trip.pickup}`,
          `Drop-off:   ${input.trip.destination}`,
          `Vehicle:    ${input.trip.vehicle}`,
        ]
      : []),
    "",
    "--",
    "RSSkyler Limo — chauffeured travel across all five boroughs.",
    CONTACT.email,
  ].join("\n");

  return {
    subject: isOps
      ? `Payment received — ${ref} — ${paid}${settled ? "" : ` (${due} due)`}`
      : `Payment received — ${ref}`,
    html,
    text,
  };
}

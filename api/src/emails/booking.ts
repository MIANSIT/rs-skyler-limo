import { env } from "../env.js";
import type { Booking } from "../services/bookings.js";
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
  titleCase,
} from "./render.js";

/**
 * The reservation email, in the shape of a trade reservation sheet: the date,
 * time and reference top right, then the parties, then passenger and routing,
 * then charges.
 *
 * Two audiences, one document. The customer gets a confirmation; the office
 * gets the same facts plus the contact details and the internal note. Sending
 * them the same layout is deliberate — when a customer phones about a booking,
 * the operator is reading the page the customer is reading.
 */

export type BookingEmailAudience = "customer" | "ops";

export type BuiltEmail = {
  subject: string;
  html: string;
  text: string;
};

const SERVICE_LABELS: Record<string, string> = {
  personal: "Personal travel",
  corporate: "Corporate",
  wedding: "Wedding",
  event: "Event",
  other: "Other",
};

/** Shared with the quote-ready email, so both name the choice the same way. */
export const PAYMENT_LABELS: Record<string, string> = {
  card: "Card (Stripe)",
  cash: "Cash on delivery",
};

const TRIP_LABELS: Record<string, string> = {
  airport: "Airport transfer",
  "point-to-point": "Point to point",
  hourly: "Hourly charter",
};

export function buildBookingEmail(
  booking: Booking,
  /** Resolved from the `vehicles` table so the email names the car, not a slug. */
  vehicleName: string | null,
  audience: BookingEmailAudience,
): BuiltEmail {
  const isOps = audience === "ops";
  const fixed = booking.pricingMode === "fixed";
  const fare = formatMoney(booking.quotedTotalCents);
  const vehicle = vehicleName ?? titleCase(booking.vehicleClass);

  /* ------------------------------------------------------------ routing */

  const flight = [booking.airline, booking.flightNumber]
    .filter(Boolean)
    .join(" ");

  const routingRows = [
    detailRow("Pick-up", escapeHtml(booking.pickup)),
    detailRow("Drop-off", escapeHtml(booking.destination)),
    detailRow("Date", escapeHtml(formatDate(booking.pickupAt))),
    detailRow("Time", escapeHtml(formatTime(booking.pickupAt))),
    flight ? detailRow("Flight", escapeHtml(flight)) : "",
    booking.airportCode
      ? detailRow(
          "Airport",
          escapeHtml(
            `${booking.airportCode}${
              booking.airportDirection === "to-airport"
                ? " — departing"
                : booking.airportDirection === "from-airport"
                  ? " — arriving"
                  : ""
            }`,
          ),
        )
      : "",
  ].join("");

  /* ------------------------------------------------------------ vehicle */

  const vehicleRows = [
    detailRow("Vehicle", escapeHtml(vehicle)),
    detailRow(
      "Passengers",
      escapeHtml(
        `${booking.passengers} · ${booking.bags} ${booking.bags === 1 ? "bag" : "bags"}`,
      ),
    ),
    booking.childSeats > 0
      ? detailRow(
          "Child seats",
          escapeHtml(
            `${booking.childSeats} ${booking.childSeats === 1 ? "seat" : "seats"}`,
          ),
        )
      : "",
    detailRow(
      "Service",
      escapeHtml(SERVICE_LABELS[booking.serviceType] ?? booking.serviceType),
    ),
    detailRow(
      "Trip type",
      escapeHtml(TRIP_LABELS[booking.tripType] ?? booking.tripType),
    ),
    detailRow(
      "Payment",
      escapeHtml(PAYMENT_LABELS[booking.paymentMethod] ?? booking.paymentMethod),
    ),
  ].join("");

  /* ------------------------------------------------------------- people */

  const passengerRows = [
    detailRow("Passenger", escapeHtml(booking.customerName)),
    detailRow(
      "Phone",
      `<a href="tel:${escapeHtml(booking.customerPhone.replace(/[^\d+]/g, ""))}" style="color:${BRAND.midnight};text-decoration:none;">${escapeHtml(booking.customerPhone)}</a>`,
    ),
    detailRow(
      "Email",
      `<a href="mailto:${escapeHtml(booking.customerEmail)}" style="color:${BRAND.midnight};text-decoration:none;">${escapeHtml(booking.customerEmail)}</a>`,
    ),
  ].join("");

  /* ------------------------------------------------------------- charges */

  // Gold on midnight is 6.8:1 and safe for text; gold on white is 2.4:1 and is
  // never used for type. The fare therefore sits on a midnight panel.
  const chargesPanel = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;border-collapse:collapse;">
    <tr>
      <td style="background:${BRAND.midnight};padding:20px 16px;">
        <div style="font-family:${SANS_FONT};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.gold};font-weight:700;">
          ${fixed ? "Fixed fare" : "Charges &amp; fees"}
        </div>
        <div style="margin-top:8px;font-family:${DISPLAY_FONT};font-size:30px;line-height:1;font-weight:600;color:${BRAND.white};">
          ${fixed && fare ? escapeHtml(fare) : "To be quoted"}
        </div>
        <div style="margin-top:10px;font-family:${SANS_FONT};font-size:13px;line-height:1.7;color:rgba(255,255,255,0.70);">
          ${
            fixed
              ? "Tolls and gratuity included. This is the price, not an estimate."
              : "A reservations agent is pricing this trip and will come back to you. Nothing is charged until you agree the fare."
          }${
            booking.paymentMethod === "cash"
              ? " Paid in cash to your chauffeur at the end of the trip."
              : fixed
                ? " Payment is by card through Stripe. If you did not finish paying, you can pay from the tracking page."
                : ""
          }
        </div>
      </td>
    </tr>
  </table>`;

  /* ---------------------------------------------------------------- body */

  const notesPanel =
    booking.notes && booking.notes.trim()
      ? panel(
          "Instructions from the customer",
          `<tr><td style="padding:12px 16px;font-family:${SANS_FONT};font-size:15px;line-height:1.7;color:${BRAND.charcoal};">${escapeHtml(booking.notes)}</td></tr>`,
        )
      : "";

  const trackButton = isOps
    ? ""
    : `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 24px 0;">
    <tr>
      <td style="background:${BRAND.gold};">
        <a href="${escapeHtml(trackUrl(booking.reference))}"
           style="display:inline-block;padding:14px 28px;font-family:${SANS_FONT};font-size:15px;font-weight:700;color:${BRAND.midnight};text-decoration:none;">
          Track this booking
        </a>
      </td>
    </tr>
  </table>
  <p style="margin:0 0 24px 0;font-family:${SANS_FONT};font-size:13px;line-height:1.7;color:rgba(44,44,47,0.66);">
    The link fills in your reference. You add the phone number you gave us, so a forwarded email cannot open your trip.
  </p>`;

  const body = [
    panel("Passenger & routing", routingRows),
    panel("Vehicle & requirements", vehicleRows),
    isOps ? panel("Contact", passengerRows) : "",
    chargesPanel,
    notesPanel,
    trackButton,
  ].join("");

  /* ------------------------------------------------------------- wrapper */

  const headline = isOps
    ? `New ${fixed ? "booking" : "quote request"} — ${booking.reference}`
    : fixed
      ? "Your car is booked."
      : "We have your request.";

  const intro = isOps
    ? `Submitted ${formatDateTime(booking.createdAt)} from the ${booking.source} form. ${
        fixed
          ? "This one carries a published fixed fare and needs confirming."
          : "This one needs a price before it can be confirmed."
      }`
    : fixed
      ? `Thank you, ${firstName(booking.customerName)}. Your reservation is below, with the fare agreed up front. We will be in touch the day before with your chauffeur's details.`
      : `Thank you, ${firstName(booking.customerName)}. We have everything we need and a reservations agent is pricing your trip now. Your reference is below — nothing is reserved or charged until you agree the fare.`;

  const subject = isOps
    ? `[${fixed ? "BOOKING" : "QUOTE"}] ${booking.reference} · ${formatDate(booking.pickupAt)} · ${booking.customerName}`
    : `${fixed ? "Booking confirmed" : "Request received"} — ${booking.reference}`;

  const html = shell({
    preheader: isOps
      ? `${booking.customerName} · ${booking.pickup} to ${booking.destination} · ${formatDateTime(booking.pickupAt)}`
      : `Reference ${booking.reference} · ${formatDateTime(booking.pickupAt)} · ${booking.pickup} to ${booking.destination}`,
    eyebrow: isOps ? "Reservations desk" : "Reservation",
    headline,
    intro,
    headerFacts: [
      { label: "Pick-up date", value: formatDate(booking.pickupAt) },
      { label: "Pick-up time", value: formatTime(booking.pickupAt) },
      { label: "Reference", value: booking.reference },
    ],
    body,
    footerNote: isOps
      ? "Open the dashboard to price, confirm or cancel this booking."
      : "Need to change or cancel? Call us — the cancellation window is in our terms, and a person will always answer faster than a form.",
  });

  return { subject, html, text: plainText(booking, vehicle, audience) };
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || "there";
}

/** Opens the tracking page with the reference already filled in. */
function trackUrl(reference: string): string {
  // `env`, not `process.env`. Every value the API uses is declared and
  // validated in env.ts, and nothing below that file reads the environment
  // directly — a default hidden down here is a default nobody finds.
  return `${env.SITE_BASE_URL.replace(/\/+$/, "")}/track?reference=${encodeURIComponent(reference)}`;
}

/**
 * The plain-text alternative.
 *
 * Not decoration: a message with no text part scores as spam, and some clients
 * and every screen reader in text mode show this instead of the markup.
 */
function plainText(
  booking: Booking,
  vehicle: string,
  audience: BookingEmailAudience,
): string {
  const fixed = booking.pricingMode === "fixed";
  const fare = formatMoney(booking.quotedTotalCents);
  const lines = [
    audience === "ops"
      ? `NEW ${fixed ? "BOOKING" : "QUOTE REQUEST"} — ${booking.reference}`
      : `RSSKYLER LIMO — ${fixed ? "BOOKING CONFIRMED" : "REQUEST RECEIVED"}`,
    "",
    `Reference:  ${booking.reference}`,
    `Date:       ${formatDate(booking.pickupAt)}`,
    `Time:       ${formatTime(booking.pickupAt)} (New York)`,
    "",
    `Pick-up:    ${booking.pickup}`,
    `Drop-off:   ${booking.destination}`,
  ];

  const flight = [booking.airline, booking.flightNumber].filter(Boolean).join(" ");
  if (flight) lines.push(`Flight:     ${flight}`);

  lines.push(
    "",
    `Vehicle:    ${vehicle}`,
    `Passengers: ${booking.passengers}, ${booking.bags} bag(s)`,
  );
  if (booking.childSeats > 0) {
    lines.push(`Child seats: ${booking.childSeats}`);
  }

  lines.push(
    "",
    fixed && fare
      ? `Fare:       ${fare} (tolls and gratuity included)`
      : "Fare:       To be quoted. Nothing is charged until you agree it.",
    `Payment:    ${
      booking.paymentMethod === "cash"
        ? "Cash on delivery — paid to the chauffeur at the end of the trip"
        : PAYMENT_LABELS[booking.paymentMethod] ?? booking.paymentMethod
    }`,
  );

  if (audience === "ops") {
    lines.push(
      "",
      "CONTACT",
      `  ${booking.customerName}`,
      `  ${booking.customerPhone}`,
      `  ${booking.customerEmail}`,
      "",
      `Submitted ${formatDateTime(booking.createdAt)} from the ${booking.source} form.`,
    );
  }

  if (booking.notes && booking.notes.trim()) {
    lines.push("", "INSTRUCTIONS", `  ${booking.notes.trim()}`);
  }

  if (audience === "customer") {
    lines.push(
      "",
      `Track this booking: ${trackUrl(booking.reference)}`,
      "The link fills in your reference. You add the phone number you gave us, so a forwarded email cannot open your trip.",
    );
  }

  lines.push(
    "",
    "--",
    "RSSkyler Limo — chauffeured travel across all five boroughs.",
    `${CONTACT.phone} · ${CONTACT.email}`,
    "All times are New York time.",
  );

  return lines.join("\n");
}

import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";

import {
  execute,
  executeOn,
  queryOne,
  runOn,
  transaction,
  type RowDataPacket,
} from "../db.js";
import { CONTACT, formatMoney, titleCase } from "../emails/render.js";
import { ApiError } from "../lib/http.js";
import { todayInNewYork } from "../lib/new-york.js";
import { samePhone } from "../lib/phone.js";
import { isReference } from "../lib/reference.js";
import type { ChangeBookingInput, ChangeQuoteInput } from "../schemas.js";
import { getBookingById, getBookingByReference, type Booking } from "./bookings.js";
import { CHILD_SEAT_FEE_CENTS, decideFare, type FareDecision } from "./pricing.js";
import { getQuoteById, getQuoteByReference, type Quote } from "./quotes.js";
import { getVehicleBySlug } from "./vehicles.js";

/**
 * Customers changing their own booking or quote request.
 *
 * The flow, end to end:
 *
 *   1. /track finds the record with its reference and phone number, as today.
 *   2. "Change this booking" emails a 6-digit code to the address already on
 *      the record. Never one typed now: a reference and a phone number travel
 *      on paper and over shoulders, an inbox does not.
 *   3. The right code is traded for a token that lasts 30 minutes.
 *   4. One save spends the token. The same record is updated — the reference
 *      never changes — and it is tagged in the dashboard until an operator
 *      marks the change reviewed.
 *
 * The fare is re-derived here exactly as on a new booking. The browser never
 * sends a price; when a change moves the fare, the customer is shown the new
 * one first and the save goes through only if it still matches.
 */

export const CHANGE_RULES = {
  codeMinutes: 10,
  maxAttempts: 5,
  resendSeconds: 60,
  codesPerHour: 5,
  tokenMinutes: 30,
  /** No self-service changes this close to pickup: the car may already be out. */
  cutoffHours: 12,
} as const;

const NO_MATCH = "No booking matches those details.";

export type ChangeSubject =
  | { kind: "booking"; booking: Booking }
  | { kind: "quote"; quote: Quote };

function subjectKey(subject: ChangeSubject): { type: "booking" | "quote"; id: number } {
  return subject.kind === "booking"
    ? { type: "booking", id: subject.booking.id }
    : { type: "quote", id: subject.quote.id };
}

/** The same two factors, and the same single "no match" message, as /track. */
export async function findChangeSubject(reference: string, phone: string): Promise<ChangeSubject> {
  const ref = reference.trim().toUpperCase();
  if (!isReference(ref)) throw ApiError.notFound(NO_MATCH);

  if (ref.startsWith("RQ-")) {
    const quote = await getQuoteByReference(ref);
    if (!quote || !samePhone(quote.customerPhone, phone)) throw ApiError.notFound(NO_MATCH);
    return { kind: "quote", quote };
  }

  const booking = await getBookingByReference(ref);
  if (!booking || !samePhone(booking.customerPhone, phone)) throw ApiError.notFound(NO_MATCH);
  return { kind: "booking", booking };
}

/* -------------------------------------------------------------------------- */
/* Whether a change is allowed at all                                         */
/* -------------------------------------------------------------------------- */

export type Changeability = { allowed: boolean; reason: string | null };

const allowed: Changeability = { allowed: true, reason: null };
const refused = (reason: string): Changeability => ({ allowed: false, reason });

export function bookingChangeability(booking: Booking, now = Date.now()): Changeability {
  if (booking.status === "completed") {
    return refused("This trip is complete, so it can no longer be changed.");
  }
  if (booking.status === "cancelled") {
    return refused(`This booking is cancelled. Call us on ${CONTACT.phone} to book again.`);
  }
  if (Date.parse(booking.pickupAt) - now < CHANGE_RULES.cutoffHours * 3_600_000) {
    return refused(
      `Your pickup is less than ${CHANGE_RULES.cutoffHours} hours away. Call us on ${CONTACT.phone} to change it.`,
    );
  }
  return allowed;
}

export function quoteChangeability(quote: Quote): Changeability {
  if (quote.status === "won") {
    return refused(`This request is going ahead. Call us on ${CONTACT.phone} to change the details.`);
  }
  if (quote.status === "lost") {
    return refused(`This request is closed. Call us on ${CONTACT.phone}, or send a new request.`);
  }
  if (quote.paymentStatus === "paid") {
    return refused(`This request is paid. Call us on ${CONTACT.phone} to change it.`);
  }
  if (quote.eventDate && quote.eventDate < todayInNewYork()) {
    return refused("The date of this request has passed.");
  }
  return allowed;
}

export function changeability(subject: ChangeSubject): Changeability {
  return subject.kind === "booking"
    ? bookingChangeability(subject.booking)
    : quoteChangeability(subject.quote);
}

function assertChangeable(subject: ChangeSubject): void {
  const check = changeability(subject);
  if (!check.allowed) throw ApiError.conflict(check.reason ?? "This can no longer be changed online.");
}

/* -------------------------------------------------------------------------- */
/* Codes and tokens                                                           */
/* -------------------------------------------------------------------------- */

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/**
 * `sarah.jones@gmail.com` → `s•••s@gmail.com`. Enough for the owner to spot a
 * typo in their own address, not enough to hand a stranger the address. The
 * domain stays whole because that is where most typos are.
 */
export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  const tail = local.length > 2 ? local.at(-1) : "";
  return `${local.slice(0, 1)}•••${tail}@${domain}`;
}

export type IssuedCode = {
  code: string;
  email: string;
  maskedEmail: string;
  expiresInMinutes: number;
  resendAfterSeconds: number;
};

export async function issueChangeCode(subject: ChangeSubject): Promise<IssuedCode> {
  assertChangeable(subject);
  const { type, id } = subjectKey(subject);

  const recent = await queryOne<
    RowDataPacket & { since_last: number | null; last_hour: number | null }
  >(
    `SELECT TIMESTAMPDIFF(SECOND, MAX(created_at), UTC_TIMESTAMP()) AS since_last,
            SUM(created_at > UTC_TIMESTAMP() - INTERVAL 1 HOUR)     AS last_hour
       FROM change_codes
      WHERE subject_type = :type AND subject_id = :id`,
    { type, id },
  );

  const sinceLast = recent?.since_last;
  if (sinceLast !== null && sinceLast !== undefined && sinceLast < CHANGE_RULES.resendSeconds) {
    const wait = CHANGE_RULES.resendSeconds - sinceLast;
    throw ApiError.tooMany(`Wait ${wait} ${wait === 1 ? "second" : "seconds"} before asking for another code.`);
  }
  if (Number(recent?.last_hour ?? 0) >= CHANGE_RULES.codesPerHour) {
    throw ApiError.tooMany(
      `You have asked for several codes in the last hour. Try again later, or call us on ${CONTACT.phone}.`,
    );
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const salt = randomBytes(16).toString("hex");

  await transaction(async (connection) => {
    // A new code replaces every earlier one, and any change session opened
    // with them: only the latest email is ever the key.
    await executeOn(
      connection,
      `UPDATE change_codes
          SET expires_at = LEAST(expires_at, UTC_TIMESTAMP()),
              token_expires_at = CASE
                WHEN token_expires_at > UTC_TIMESTAMP() THEN UTC_TIMESTAMP()
                ELSE token_expires_at END
        WHERE subject_type = :type AND subject_id = :id AND used_at IS NULL`,
      { type, id },
    );
    await executeOn(
      connection,
      `INSERT INTO change_codes (subject_type, subject_id, code_salt, code_hash, expires_at)
       VALUES (:type, :id, :salt, :hash, UTC_TIMESTAMP() + INTERVAL ${CHANGE_RULES.codeMinutes} MINUTE)`,
      { type, id, salt, hash: sha256(`${salt}:${code}`) },
    );
  });

  const email = subject.kind === "booking" ? subject.booking.customerEmail : subject.quote.customerEmail;

  return {
    code,
    email,
    maskedEmail: maskEmail(email),
    expiresInMinutes: CHANGE_RULES.codeMinutes,
    resendAfterSeconds: CHANGE_RULES.resendSeconds,
  };
}

/** Checks the code and, if it is right, trades it for a change token. */
export async function verifyChangeCode(
  subject: ChangeSubject,
  code: string,
): Promise<{ token: string; expiresInMinutes: number }> {
  assertChangeable(subject);
  const { type, id } = subjectKey(subject);

  const row = await queryOne<
    RowDataPacket & { id: number; code_salt: string; code_hash: string; attempts: number; live: number }
  >(
    `SELECT id, code_salt, code_hash, attempts, expires_at > UTC_TIMESTAMP() AS live
       FROM change_codes
      WHERE subject_type = :type AND subject_id = :id
        AND verified_at IS NULL AND used_at IS NULL
      ORDER BY id DESC
      LIMIT 1`,
    { type, id },
  );

  if (!row || !row.live) {
    throw new ApiError(400, "code_expired", "That code has expired. Ask for a new one.");
  }
  if (row.attempts >= CHANGE_RULES.maxAttempts) {
    throw new ApiError(429, "too_many_attempts", "Too many wrong codes. Ask for a new one.");
  }

  const expected = Buffer.from(row.code_hash, "hex");
  const given = Buffer.from(sha256(`${row.code_salt}:${code}`), "hex");

  if (!timingSafeEqual(expected, given)) {
    await execute(`UPDATE change_codes SET attempts = attempts + 1 WHERE id = :id`, { id: row.id });
    const left = CHANGE_RULES.maxAttempts - (row.attempts + 1);
    throw new ApiError(
      400,
      "wrong_code",
      left > 0
        ? `That code is not right. ${left} ${left === 1 ? "try" : "tries"} left.`
        : "That code is not right, and it has now stopped working. Ask for a new one.",
    );
  }

  const token = randomBytes(32).toString("base64url");
  const result = await execute(
    `UPDATE change_codes
        SET verified_at = UTC_TIMESTAMP(),
            token_hash = :tokenHash,
            token_expires_at = UTC_TIMESTAMP() + INTERVAL ${CHANGE_RULES.tokenMinutes} MINUTE
      WHERE id = :id AND verified_at IS NULL`,
    { id: row.id, tokenHash: sha256(token) },
  );
  if (result.affectedRows === 0) {
    throw new ApiError(400, "code_expired", "That code has already been used. Ask for a new one.");
  }

  return { token, expiresInMinutes: CHANGE_RULES.tokenMinutes };
}

const SESSION_EXPIRED = "Your change session has expired. Ask for a new code to carry on.";

/** Read-only check, so the fare step cannot be reached without a live token. */
async function assertLiveToken(type: string, id: number, token: string): Promise<void> {
  const row = await queryOne<RowDataPacket>(
    `SELECT id FROM change_codes
      WHERE subject_type = :type AND subject_id = :id AND token_hash = :hash
        AND used_at IS NULL AND token_expires_at > UTC_TIMESTAMP()
      LIMIT 1`,
    { type, id, hash: sha256(token) },
  );
  if (!row) throw new ApiError(401, "change_expired", SESSION_EXPIRED);
}

/** Spends the token inside the save's transaction, so one code is one save. */
async function spendToken(
  connection: Parameters<Parameters<typeof transaction>[0]>[0],
  type: string,
  id: number,
  token: string,
): Promise<void> {
  const rows = await runOn<RowDataPacket & { id: number }>(
    connection,
    `SELECT id FROM change_codes
      WHERE subject_type = :type AND subject_id = :id AND token_hash = :hash
        AND used_at IS NULL AND token_expires_at > UTC_TIMESTAMP()
      LIMIT 1
      FOR UPDATE`,
    { type, id, hash: sha256(token) },
  );
  const row = rows[0];
  if (!row) throw new ApiError(401, "change_expired", SESSION_EXPIRED);
  await executeOn(connection, `UPDATE change_codes SET used_at = UTC_TIMESTAMP() WHERE id = :id`, {
    id: row.id,
  });
}

/* -------------------------------------------------------------------------- */
/* What the customer sees once the code is right                              */
/* -------------------------------------------------------------------------- */

/** The booking's editable fields, for pre-filling the change form. */
export function bookingEditable(booking: Booking) {
  return {
    kind: "booking" as const,
    reference: booking.reference,
    tripType: booking.tripType,
    airportCode: booking.airportCode,
    airportDirection: booking.airportDirection,
    pickupAt: booking.pickupAt,
    pickup: booking.pickup,
    destination: booking.destination,
    passengers: booking.passengers,
    bags: booking.bags,
    childSeats: booking.childSeats,
    vehicleClass: booking.vehicleClass,
    airline: booking.airline,
    flightNumber: booking.flightNumber,
    notes: booking.notes,
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    pricingMode: booking.pricingMode,
    quotedTotalCents: booking.quotedTotalCents,
    paymentStatus: booking.paymentStatus,
  };
}

export function quoteEditable(quote: Quote) {
  return {
    kind: "quote" as const,
    reference: quote.reference,
    serviceType: quote.serviceType,
    eventDate: quote.eventDate,
    passengers: quote.passengers,
    company: quote.company,
    customerName: quote.customerName,
    customerPhone: quote.customerPhone,
    details: quote.details,
    agreedPriceCents: quote.agreedPriceCents,
  };
}

/* -------------------------------------------------------------------------- */
/* Formatting a before → after                                                */
/* -------------------------------------------------------------------------- */

export type FieldChange = { label: string; before: string; after: string };

const pickupFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function showPickup(iso: string): string {
  return pickupFormat.format(new Date(iso));
}

function showDay(ymd: string | null): string {
  if (!ymd) return "Not given";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${ymd}T12:00:00Z`));
}

const show = (value: string | number | null | undefined): string =>
  value === null || value === undefined || value === "" ? "None" : String(value);

function clip(value: string, max = 300): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function fareLabel(mode: string, cents: number | null): string {
  if (cents === null) return mode === "fixed" ? "Fixed fare" : "To be priced by our team";
  return formatMoney(cents) ?? "";
}

async function vehicleName(slug: string): Promise<string> {
  try {
    return (await getVehicleBySlug(slug))?.name ?? titleCase(slug);
  } catch {
    return titleCase(slug);
  }
}

/** Optional text: blank and null are the same answer. */
const opt = (value: string | null | undefined): string | null => {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
};

function sameMinute(a: string, b: string): boolean {
  return Math.floor(Date.parse(a) / 60_000) === Math.floor(Date.parse(b) / 60_000);
}

/** The history note: one "Label: before → after" per line. */
function historyNote(changes: FieldChange[]): string {
  return changes.map((change) => `${change.label}: ${change.before} → ${change.after}`).join("\n");
}

/* -------------------------------------------------------------------------- */
/* Saving a booking change                                                    */
/* -------------------------------------------------------------------------- */

export type ProposedFare = { pricingMode: "fixed" | "quote"; totalCents: number | null; reason: string };

export type BookingChangeResult =
  | {
      outcome: "confirm-fare";
      fare: ProposedFare;
      previous: { pricingMode: "fixed" | "quote"; totalCents: number | null };
    }
  | { outcome: "saved"; booking: Booking; changes: FieldChange[]; statusChanged: boolean };

export async function changeBooking(
  booking: Booking,
  input: ChangeBookingInput,
): Promise<BookingChangeResult> {
  assertChangeable({ kind: "booking", booking });
  await assertLiveToken("booking", booking.id, input.token);

  const isAirport = booking.tripType === "airport";

  /* ---- The new pickup must itself be outside the cut-off ---- */
  const pickupMs = Date.parse(input.pickupAt);
  if (!sameMinute(input.pickupAt, booking.pickupAt) && pickupMs - Date.now() < CHANGE_RULES.cutoffHours * 3_600_000) {
    throw ApiError.badRequest(
      `Choose a pickup at least ${CHANGE_RULES.cutoffHours} hours from now. For anything sooner, call us on ${CONTACT.phone}.`,
    );
  }

  /* ---- The vehicle, and what it can carry ---- */
  const vehicle = await getVehicleBySlug(input.vehicleClass);
  if (input.vehicleClass !== booking.vehicleClass && (!vehicle || !vehicle.isActive)) {
    throw ApiError.badRequest("Choose a vehicle from the list.");
  }
  if (vehicle && input.passengers > vehicle.passengerCapacity) {
    throw ApiError.badRequest(
      `The ${vehicle.name} seats up to ${vehicle.passengerCapacity}. Choose a larger vehicle or fewer passengers.`,
    );
  }
  if (vehicle && input.childSeats > vehicle.maxChildSeats) {
    throw ApiError.badRequest(
      vehicle.maxChildSeats === 0
        ? `The ${vehicle.name} does not take child seats.`
        : `The ${vehicle.name} takes up to ${vehicle.maxChildSeats} child seats.`,
    );
  }

  /* ---- The next state. On an airport run the airport end stays the airport ---- */
  const next = {
    pickupAt: input.pickupAt,
    pickup: isAirport && booking.airportDirection !== "to-airport" ? booking.pickup : input.pickup,
    destination: isAirport && booking.airportDirection === "to-airport" ? booking.destination : input.destination,
    passengers: input.passengers,
    bags: input.bags,
    childSeats: input.childSeats,
    vehicleClass: input.vehicleClass,
    airline: isAirport ? opt(input.airline) : booking.airline,
    flightNumber: isAirport ? opt(input.flightNumber) : booking.flightNumber,
    notes: opt(input.notes),
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone.trim(),
  };

  /* ---- What actually changed ---- */
  const changed = new Set<string>();
  const changes: FieldChange[] = [];
  const note = (key: string, label: string, before: string, after: string) => {
    changed.add(key);
    changes.push({ label, before, after });
  };

  if (!sameMinute(next.pickupAt, booking.pickupAt)) {
    note("pickupAt", "Pick-up time", showPickup(booking.pickupAt), showPickup(next.pickupAt));
  }
  if (next.pickup !== booking.pickup) note("pickup", "Pick-up", booking.pickup, next.pickup);
  if (next.destination !== booking.destination) {
    note("destination", "Drop-off", booking.destination, next.destination);
  }
  if (next.passengers !== booking.passengers) {
    note("passengers", "Passengers", String(booking.passengers), String(next.passengers));
  }
  if (next.bags !== booking.bags) note("bags", "Bags", String(booking.bags), String(next.bags));
  if (next.childSeats !== booking.childSeats) {
    note("childSeats", "Child seats", String(booking.childSeats), String(next.childSeats));
  }
  if (next.vehicleClass !== booking.vehicleClass) {
    note("vehicleClass", "Vehicle", await vehicleName(booking.vehicleClass), vehicle?.name ?? titleCase(next.vehicleClass));
  }
  if (next.airline !== opt(booking.airline)) note("airline", "Airline", show(booking.airline), show(next.airline));
  if (next.flightNumber !== opt(booking.flightNumber)) {
    note("flightNumber", "Flight number", show(booking.flightNumber), show(next.flightNumber));
  }
  if (next.notes !== opt(booking.notes)) {
    note("notes", "Instructions", clip(show(booking.notes)), clip(show(next.notes)));
  }
  if (next.customerName !== booking.customerName) {
    note("customerName", "Name", booking.customerName, next.customerName);
  }
  if (next.customerPhone !== booking.customerPhone) {
    note("customerPhone", "Phone", booking.customerPhone, next.customerPhone);
  }

  if (changes.length === 0) {
    throw ApiError.badRequest("Nothing has changed yet. Edit a detail, then save.");
  }

  const TRIP_KEYS = ["pickupAt", "pickup", "destination", "passengers", "bags", "childSeats", "vehicleClass", "airline", "flightNumber"];
  const FARE_KEYS = ["vehicleClass", "childSeats", "pickup", "destination"];
  const tripChanged = TRIP_KEYS.some((key) => changed.has(key));
  const fareInputs = FARE_KEYS.filter((key) => changed.has(key));

  /* ---- The fare, decided again on the server ---- */
  let nextMode = booking.pricingMode;
  let nextTotal = booking.quotedTotalCents;
  let reason = "Your fare is unchanged.";
  let resolved: FareDecision | null = null;

  if (fareInputs.length > 0) {
    if (
      fareInputs.length === 1 &&
      fareInputs[0] === "childSeats" &&
      booking.pricingMode === "fixed" &&
      booking.quotedTotalCents !== null
    ) {
      // Only the seats moved on a fixed fare: no need to ask Google again.
      nextTotal = booking.quotedTotalCents + (next.childSeats - booking.childSeats) * CHILD_SEAT_FEE_CENTS;
      reason = "Fixed fare, including the child seats you asked for.";
    } else {
      const stored = await queryOne<
        RowDataPacket & { pickup_place_id: string | null; destination_place_id: string | null }
      >(`SELECT pickup_place_id, destination_place_id FROM bookings WHERE id = :id`, { id: booking.id });

      resolved = await decideFare({
        tripType: booking.tripType,
        vehicleClass: next.vehicleClass,
        airportCode: booking.airportCode,
        airportDirection: booking.airportDirection,
        childSeats: next.childSeats,
        childSeatFeeCents: CHILD_SEAT_FEE_CENTS,
        pickupPlaceId: changed.has("pickup") ? opt(input.pickupPlaceId) : stored?.pickup_place_id ?? null,
        destinationPlaceId: changed.has("destination")
          ? opt(input.destinationPlaceId)
          : stored?.destination_place_id ?? null,
        sessionToken: input.placesSessionToken ?? randomUUID(),
      });
      nextMode = resolved.pricingMode;
      nextTotal = resolved.totalCents;
      reason = resolved.reason;
    }
  } else if (booking.pricingMode === "quote" && booking.quotedTotalCents !== null && tripChanged) {
    // The operator priced the old trip, not this one.
    nextTotal = null;
    reason = "Our team will price the changed trip and let you know.";
  }

  const fareChanged = nextMode !== booking.pricingMode || nextTotal !== booking.quotedTotalCents;

  if (fareChanged && booking.paymentStatus === "paid") {
    throw ApiError.conflict(
      `This change would alter the fare you have already paid. Call us on ${CONTACT.phone} and we will sort it out.`,
    );
  }

  const accepted = input.acceptedFare;
  if (fareChanged && !(accepted && accepted.pricingMode === nextMode && accepted.totalCents === nextTotal)) {
    return {
      outcome: "confirm-fare",
      fare: { pricingMode: nextMode, totalCents: nextTotal, reason },
      previous: { pricingMode: booking.pricingMode, totalCents: booking.quotedTotalCents },
    };
  }

  if (fareChanged) {
    changes.push({
      label: "Fare",
      before: fareLabel(booking.pricingMode, booking.quotedTotalCents),
      after: fareLabel(nextMode, nextTotal),
    });
  }

  /* ---- Status: a changed trip is re-confirmed by a person ---- */
  let nextStatus = booking.status;
  if (fareChanged && nextTotal === null && booking.status === "quoted") nextStatus = "new";
  else if (tripChanged && booking.status === "confirmed") nextStatus = "pending";

  const priceCleared = fareChanged && nextTotal === null;

  await transaction(async (connection) => {
    await spendToken(connection, "booking", booking.id, input.token);

    await executeOn(
      connection,
      `UPDATE bookings
          SET pickup_at = :pickupAt, pickup = :pickup, destination = :destination,
              passengers = :passengers, bags = :bags, child_seats = :childSeats,
              vehicle_class = :vehicleClass, airline = :airline, flight_number = :flightNumber,
              notes = :notes, customer_name = :customerName, customer_phone = :customerPhone,
              pricing_mode = :pricingMode, quoted_total_cents = :quotedTotalCents,
              ${priceCleared ? "quoted_at = NULL, quoted_by = NULL, quote_note = NULL," : ""}
              ${
                changed.has("pickup")
                  ? "pickup_place_id = :pickupPlaceId, pickup_locality = :pickupLocality, pickup_region = :pickupRegion,"
                  : ""
              }
              ${
                changed.has("destination")
                  ? "destination_place_id = :destinationPlaceId, destination_locality = :destinationLocality, destination_region = :destinationRegion,"
                  : ""
              }
              status = :status,
              customer_change_pending = 1,
              customer_changed_at = UTC_TIMESTAMP()
        WHERE id = :id`,
      {
        id: booking.id,
        pickupAt: new Date(next.pickupAt),
        pickup: next.pickup,
        destination: next.destination,
        passengers: next.passengers,
        bags: next.bags,
        childSeats: next.childSeats,
        vehicleClass: next.vehicleClass,
        airline: next.airline,
        flightNumber: next.flightNumber,
        notes: next.notes,
        customerName: next.customerName,
        customerPhone: next.customerPhone,
        pricingMode: nextMode,
        quotedTotalCents: nextTotal,
        pickupPlaceId: opt(input.pickupPlaceId),
        pickupLocality: resolved?.pickupPlace?.locality ?? null,
        pickupRegion: resolved?.pickupPlace?.region ?? null,
        destinationPlaceId: opt(input.destinationPlaceId),
        destinationLocality: resolved?.destinationPlace?.locality ?? null,
        destinationRegion: resolved?.destinationPlace?.region ?? null,
        status: nextStatus,
      },
    );

    await executeOn(
      connection,
      `INSERT INTO activity_log
         (subject_type, subject_id, admin_user_id, action, from_status, to_status, note)
       VALUES ('booking', :id, NULL, 'customer_changed', :fromStatus, :toStatus, :note)`,
      {
        id: booking.id,
        fromStatus: nextStatus !== booking.status ? booking.status : null,
        toStatus: nextStatus !== booking.status ? nextStatus : null,
        note: historyNote(changes),
      },
    );
  });

  const saved = await getBookingById(booking.id);
  if (!saved) throw ApiError.notFound("That booking no longer exists.");

  return { outcome: "saved", booking: saved, changes, statusChanged: nextStatus !== booking.status };
}

/* -------------------------------------------------------------------------- */
/* Saving a quote-request change                                              */
/* -------------------------------------------------------------------------- */

export type QuoteChangeResult =
  | { outcome: "confirm-price-reset"; agreedPriceCents: number }
  | { outcome: "saved"; quote: Quote; changes: FieldChange[]; statusChanged: boolean };

export async function changeQuote(quote: Quote, input: ChangeQuoteInput): Promise<QuoteChangeResult> {
  assertChangeable({ kind: "quote", quote });
  await assertLiveToken("quote", quote.id, input.token);

  const next = {
    eventDate: input.eventDate ?? null,
    passengers: input.passengers ?? null,
    company: opt(input.company),
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone.trim(),
    details: input.details.trim(),
  };

  const changed = new Set<string>();
  const changes: FieldChange[] = [];
  const note = (key: string, label: string, before: string, after: string) => {
    changed.add(key);
    changes.push({ label, before, after });
  };

  if (next.eventDate !== quote.eventDate) note("eventDate", "Date", showDay(quote.eventDate), showDay(next.eventDate));
  if (next.passengers !== quote.passengers) {
    note("passengers", "Passengers", show(quote.passengers), show(next.passengers));
  }
  if (next.company !== opt(quote.company)) note("company", "Company", show(quote.company), show(next.company));
  if (next.customerName !== quote.customerName) note("customerName", "Name", quote.customerName, next.customerName);
  if (next.customerPhone !== quote.customerPhone) {
    note("customerPhone", "Phone", quote.customerPhone, next.customerPhone);
  }
  if (next.details !== quote.details) note("details", "Details", clip(quote.details), clip(next.details));

  if (changes.length === 0) {
    throw ApiError.badRequest("Nothing has changed yet. Edit a detail, then save.");
  }

  // The agreed price was for the old request. Name, phone and company do not move it.
  const requestChanged = ["eventDate", "passengers", "details"].some((key) => changed.has(key));
  const priceReset = requestChanged && quote.agreedPriceCents !== null;

  if (priceReset && !input.acceptPriceReset) {
    return { outcome: "confirm-price-reset", agreedPriceCents: quote.agreedPriceCents! };
  }

  if (priceReset) {
    changes.push({
      label: "Agreed price",
      before: formatMoney(quote.agreedPriceCents) ?? "",
      after: "To be priced again by our team",
    });
  }

  const nextStatus = priceReset ? "new" : quote.status;

  await transaction(async (connection) => {
    await spendToken(connection, "quote", quote.id, input.token);

    await executeOn(
      connection,
      `UPDATE quotes
          SET event_date = :eventDate, passengers = :passengers, company = :company,
              customer_name = :customerName, customer_phone = :customerPhone, details = :details,
              ${priceReset ? "agreed_price_cents = NULL, priced_at = NULL, payment_method = NULL," : ""}
              status = :status,
              customer_change_pending = 1,
              customer_changed_at = UTC_TIMESTAMP()
        WHERE id = :id`,
      { id: quote.id, ...next, status: nextStatus },
    );

    await executeOn(
      connection,
      `INSERT INTO activity_log
         (subject_type, subject_id, admin_user_id, action, from_status, to_status, note)
       VALUES ('quote', :id, NULL, 'customer_changed', :fromStatus, :toStatus, :note)`,
      {
        id: quote.id,
        fromStatus: nextStatus !== quote.status ? quote.status : null,
        toStatus: nextStatus !== quote.status ? nextStatus : null,
        note: historyNote(changes),
      },
    );
  });

  const saved = await getQuoteById(quote.id);
  if (!saved) throw ApiError.notFound("That quote no longer exists.");

  return { outcome: "saved", quote: saved, changes, statusChanged: nextStatus !== quote.status };
}

/* -------------------------------------------------------------------------- */
/* The dashboard's "Mark as reviewed"                                         */
/* -------------------------------------------------------------------------- */

export async function markChangeReviewed(
  type: "booking" | "quote",
  id: number,
  adminUserId: number,
): Promise<void> {
  const table = type === "booking" ? "bookings" : "quotes";

  await transaction(async (connection) => {
    const result = await executeOn(
      connection,
      `UPDATE ${table} SET customer_change_pending = 0 WHERE id = :id AND customer_change_pending = 1`,
      { id },
    );

    if (result.affectedRows === 0) {
      const exists = await runOn<RowDataPacket>(connection, `SELECT id FROM ${table} WHERE id = :id`, { id });
      if (exists.length === 0) throw ApiError.notFound(`That ${type} no longer exists.`);
      return; // Already reviewed by someone else; nothing to record twice.
    }

    await executeOn(
      connection,
      `INSERT INTO activity_log (subject_type, subject_id, admin_user_id, action)
       VALUES (:type, :id, :adminUserId, 'change_reviewed')`,
      { type, id, adminUserId },
    );
  });
}

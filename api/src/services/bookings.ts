import type { z } from "zod";

import {
  execute,
  executeOn,
  query,
  queryOne,
  runOn,
  transaction,
  type RowDataPacket,
} from "../db.js";
import { ApiError } from "../lib/http.js";
import { makeReference } from "../lib/reference.js";
import type {
  createBookingSchema,
  listBookingsSchema,
  updateBookingSchema,
} from "../schemas.js";
import type { FareDecision } from "./pricing.js";

type BookingRow = RowDataPacket & {
  id: number;
  reference: string;
  status: string;
  trip_type: string;
  pickup: string;
  destination: string;
  pickup_at: Date;
  passengers: number;
  bags: number;
  child_seats: number;
  vehicle_class: string;
  service_type: string;
  pricing_mode: "fixed" | "quote";
  quoted_at: Date | null;
  quote_note: string | null;
  payment_method: "card" | "cash";
  payment_status: "unpaid" | "paid";
  paid_at: Date | null;
  stripe_payment_intent_id: string | null;
  pickup_locality: string | null;
  pickup_region: string | null;
  destination_locality: string | null;
  destination_region: string | null;
  airport_code: string | null;
  airport_direction: string | null;
  airline: string | null;
  flight_number: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  notes: string | null;
  quoted_total_cents: number | null;
  source: string;
  created_at: Date;
  updated_at: Date;
};

export type Booking = ReturnType<typeof toBooking>;

function toBooking(row: BookingRow) {
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    tripType: row.trip_type,
    pickup: row.pickup,
    destination: row.destination,
    pickupAt: row.pickup_at.toISOString(),
    passengers: row.passengers,
    bags: row.bags,
    childSeats: row.child_seats,
    vehicleClass: row.vehicle_class,
    serviceType: row.service_type,
    pricingMode: row.pricing_mode,
    quotedAt: row.quoted_at ? row.quoted_at.toISOString() : null,
    quoteNote: row.quote_note,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    paidAt: row.paid_at ? row.paid_at.toISOString() : null,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    pickupLocality: row.pickup_locality,
    pickupRegion: row.pickup_region,
    destinationLocality: row.destination_locality,
    destinationRegion: row.destination_region,
    airportCode: row.airport_code,
    airportDirection: row.airport_direction,
    airline: row.airline,
    flightNumber: row.flight_number,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    notes: row.notes,
    quotedTotalCents: row.quoted_total_cents,
    source: row.source,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

const SELECT_COLUMNS = `id, reference, status, trip_type, pricing_mode, pickup,
  destination, pickup_at, passengers, bags, child_seats, vehicle_class,
  service_type, airline, flight_number, customer_name, customer_email, customer_phone, notes,
  quoted_total_cents, quoted_at, quote_note,
  payment_method, payment_status, paid_at, stripe_payment_intent_id,
  pickup_locality, pickup_region, destination_locality, destination_region,
  airport_code, airport_direction,
  source, created_at, updated_at`;

export async function createBooking(
  input: z.infer<typeof createBookingSchema>,
  source: string,
  /**
   * Decided server-side by `decideFare`, never sent by the browser. A customer
   * who could name their own price would.
   */
  fare: FareDecision,
): Promise<Booking> {
  // A reference collision is a ~1-in-34-billion event, but a booking lost to
  // one is a customer standing on a kerb, so retry rather than assume.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const reference = makeReference("RS");
    try {
      const result = await execute(
        `INSERT INTO bookings
           (reference, trip_type, pricing_mode, pickup, destination, pickup_at,
            passengers, bags, child_seats, vehicle_class, service_type, payment_method,
            airline, flight_number, customer_name, customer_email, customer_phone, notes,
            quoted_total_cents, pickup_place_id, pickup_locality, pickup_region,
            destination_place_id, destination_locality, destination_region,
            airport_code, airport_direction, source)
         VALUES
           (:reference, :tripType, :pricingMode, :pickup, :destination, :pickupAt,
            :passengers, :bags, :childSeats, :vehicleClass, :serviceType, :paymentMethod,
            :airline, :flightNumber, :customerName, :customerEmail, :customerPhone, :notes,
            :quotedTotalCents, :pickupPlaceId, :pickupLocality, :pickupRegion,
            :destinationPlaceId, :destinationLocality, :destinationRegion,
            :airportCode, :airportDirection, :source)`,
        {
          reference,
          tripType: input.tripType,
          pickup: input.pickup,
          destination: input.destination,
          pickupAt: new Date(input.pickupAt),
          passengers: input.passengers,
          bags: input.bags,
          childSeats: input.childSeats,
          vehicleClass: input.vehicleClass,
          serviceType: input.serviceType,
          paymentMethod: input.paymentMethod,
          airline: input.airline ?? null,
          flightNumber: input.flightNumber ?? null,
          customerName: input.customerName,
          customerEmail: input.customerEmail.toLowerCase(),
          customerPhone: input.customerPhone,
          notes: input.notes ?? null,
          pricingMode: fare.pricingMode,
          quotedTotalCents: fare.totalCents,
          pickupPlaceId: input.pickupPlaceId ?? null,
          pickupLocality: fare.pickupPlace?.locality ?? input.statedBorough ?? null,
          pickupRegion: fare.pickupPlace?.region ?? null,
          destinationPlaceId: input.destinationPlaceId ?? null,
          destinationLocality: fare.destinationPlace?.locality ?? null,
          destinationRegion: fare.destinationPlace?.region ?? null,
          airportCode: input.airportCode ?? null,
          airportDirection: input.airportDirection ?? null,
          source,
        },
      );

      const created = await getBookingById(result.insertId);
      if (!created) throw new Error("Booking vanished immediately after insert");
      return created;
    } catch (error) {
      if (isDuplicateReference(error)) continue;
      throw error;
    }
  }

  throw new ApiError(500, "reference_exhausted", "Could not allocate a booking reference.");
}

function isDuplicateReference(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ER_DUP_ENTRY"
  );
}

export async function getBookingById(id: number): Promise<Booking | null> {
  const row = await queryOne<BookingRow>(
    `SELECT ${SELECT_COLUMNS} FROM bookings WHERE id = :id LIMIT 1`,
    { id },
  );
  return row ? toBooking(row) : null;
}

export async function getBookingByReference(
  reference: string,
): Promise<Booking | null> {
  const row = await queryOne<BookingRow>(
    `SELECT ${SELECT_COLUMNS} FROM bookings WHERE reference = :reference LIMIT 1`,
    { reference: reference.toUpperCase() },
  );
  return row ? toBooking(row) : null;
}

export type BookingList = {
  bookings: Booking[];
  total: number;
  page: number;
  perPage: number;
};

/**
 * The WHERE clause for the bookings list, shared with the Excel export so a
 * download holds exactly what the operator was looking at.
 */
function bookingFilters(filters: {
  status?: string;
  q?: string;
  from?: string;
  to?: string;
}): { where: string; params: Record<string, unknown> } {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (filters.status) {
    conditions.push("status = :status");
    params.status = filters.status;
  }

  if (filters.q) {
    conditions.push(`(reference LIKE :q OR customer_name LIKE :q
      OR customer_email LIKE :q OR customer_phone LIKE :q
      OR pickup LIKE :q OR destination LIKE :q)`);
    params.q = `%${escapeLike(filters.q)}%`;
  }

  if (filters.from) {
    conditions.push("pickup_at >= :from");
    params.from = `${filters.from} 00:00:00`;
  }

  if (filters.to) {
    conditions.push("pickup_at <= :to");
    params.to = `${filters.to} 23:59:59`;
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

export async function listBookings(
  filters: z.infer<typeof listBookingsSchema>,
): Promise<BookingList> {
  const { where, params } = bookingFilters(filters);

  const countRow = await queryOne<RowDataPacket & { total: number }>(
    `SELECT COUNT(*) AS total FROM bookings ${where}`,
    params,
  );

  // LIMIT/OFFSET are interpolated rather than bound: the MySQL protocol will
  // not accept placeholders there in a prepared statement. Both values come
  // from Zod as bounded integers, so there is nothing to inject.
  const perPage = filters.perPage;
  const offset = (filters.page - 1) * perPage;

  const rows = await query<BookingRow & { clash_count: number }>(
    `SELECT ${SELECT_COLUMNS},
        CASE WHEN status IN ('new','quoted','confirmed','pending') THEN (
          SELECT COUNT(*) FROM bookings other
           WHERE other.id <> bookings.id
             AND other.vehicle_class = bookings.vehicle_class
             AND other.status IN ('new','quoted','confirmed','pending')
             AND other.pickup_at > bookings.pickup_at - INTERVAL 180 MINUTE
             AND other.pickup_at < bookings.pickup_at + INTERVAL 180 MINUTE
        ) ELSE 0 END AS clash_count
       FROM bookings ${where}
      ORDER BY
        -- New requests first regardless of date; then soonest pickup.
        CASE WHEN status = 'new' THEN 0 ELSE 1 END,
        pickup_at ASC
      LIMIT ${perPage} OFFSET ${offset}`,
    params,
  );

  return {
    bookings: rows.map((row) => ({
      ...toBooking(row),
      possibleClashes: Number(row.clash_count ?? 0),
    })),
    total: countRow?.total ?? 0,
    page: filters.page,
    perPage,
  };
}

/** Every booking matching the filters, newest pickup first, capped for sanity. */
export async function listBookingsForExport(filters: {
  status?: string;
  q?: string;
  from?: string;
  to?: string;
}): Promise<Booking[]> {
  const { where, params } = bookingFilters(filters);
  const rows = await query<BookingRow>(
    `SELECT ${SELECT_COLUMNS} FROM bookings ${where}
      ORDER BY pickup_at DESC LIMIT 20000`,
    params,
  );
  return rows.map(toBooking);
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

/**
 * Booking fields the dashboard's edit page may change, with their column and
 * the name the history uses. Kept as data so a new editable field is one line,
 * and so what the history reports is exactly what was written.
 */
const EDITABLE_FIELDS = [
  { key: "customerName", column: "customer_name", label: "customer name" },
  { key: "customerEmail", column: "customer_email", label: "email" },
  { key: "customerPhone", column: "customer_phone", label: "phone" },
  { key: "tripType", column: "trip_type", label: "trip type" },
  { key: "pickup", column: "pickup", label: "pick-up" },
  { key: "destination", column: "destination", label: "drop-off" },
  { key: "passengers", column: "passengers", label: "passengers" },
  { key: "bags", column: "bags", label: "bags" },
  { key: "childSeats", column: "child_seats", label: "child seats" },
  { key: "serviceType", column: "service_type", label: "service" },
  { key: "airportCode", column: "airport_code", label: "airport" },
  { key: "airportDirection", column: "airport_direction", label: "airport direction" },
  { key: "airline", column: "airline", label: "airline" },
  { key: "flightNumber", column: "flight_number", label: "flight number" },
  { key: "customerNotes", column: "notes", label: "customer instructions" },
] as const;

type EditableKey = (typeof EDITABLE_FIELDS)[number]["key"];

/**
 * Pick-up times are chosen to the minute. A stored time with stray seconds
 * (seed data, an older client) must not read as "changed" when an operator
 * saves the edit form without touching it.
 */
function sameMinute(a: string, b: string): boolean {
  return Math.floor(Date.parse(a) / 60_000) === Math.floor(Date.parse(b) / 60_000);
}

/** The booking's current value for an editable field, for change detection. */
function currentValue(booking: Booking, key: EditableKey): unknown {
  return key === "customerNotes" ? booking.notes : booking[key];
}

export async function updateBooking(
  id: number,
  patch: z.infer<typeof updateBookingSchema>,
  adminUserId: number,
): Promise<Booking> {
  const existing = await getBookingById(id);
  if (!existing) throw ApiError.notFound("That booking no longer exists.");

  return transaction(async (connection) => {
    const assignments: string[] = [];
    const params: Record<string, unknown> = { id };

    if (patch.status !== undefined) {
      assignments.push("status = :status");
      params.status = patch.status;
    }
    if (patch.pickupAt !== undefined && !sameMinute(patch.pickupAt, existing.pickupAt)) {
      assignments.push("pickup_at = :pickupAt");
      params.pickupAt = new Date(patch.pickupAt);
    }
    if (patch.vehicleClass !== undefined && patch.vehicleClass !== existing.vehicleClass) {
      assignments.push("vehicle_class = :vehicleClass");
      params.vehicleClass = patch.vehicleClass;
    }
    // Only what actually changed is written and reported, so saving the edit
    // page untouched leaves no noise in the history.
    const changed: string[] = [];

    if (patch.pickupAt !== undefined && !sameMinute(patch.pickupAt, existing.pickupAt)) {
      changed.push("pick-up time");
    }
    if (patch.vehicleClass !== undefined && patch.vehicleClass !== existing.vehicleClass) {
      changed.push("vehicle");
    }

    for (const field of EDITABLE_FIELDS) {
      const next = patch[field.key];
      if (next === undefined) continue;
      const value =
        field.key === "customerEmail" && typeof next === "string" ? next.toLowerCase() : next;
      if (value === currentValue(existing, field.key)) continue;
      assignments.push(`${field.column} = :${field.key}`);
      params[field.key] = value;
      changed.push(field.label);
    }

    const paymentChanged =
      (patch.paymentMethod !== undefined && patch.paymentMethod !== existing.paymentMethod) ||
      (patch.paymentStatus !== undefined && patch.paymentStatus !== existing.paymentStatus);

    if (
      patch.quotedTotalCents !== undefined &&
      patch.quotedTotalCents !== existing.quotedTotalCents
    ) {
      assignments.push("quoted_total_cents = :quotedTotalCents");
      params.quotedTotalCents = patch.quotedTotalCents;
      changed.push("fare");
    }
    if (patch.paymentMethod !== undefined && patch.paymentMethod !== existing.paymentMethod) {
      assignments.push("payment_method = :paymentMethod");
      params.paymentMethod = patch.paymentMethod;
    }
    // `paid_at` follows the status rather than being sent, so it is always
    // the moment an operator recorded the money, never a typed date.
    if (patch.paymentStatus !== undefined && patch.paymentStatus !== existing.paymentStatus) {
      assignments.push("payment_status = :paymentStatus");
      assignments.push(
        patch.paymentStatus === "paid" ? "paid_at = UTC_TIMESTAMP()" : "paid_at = NULL",
      );
      params.paymentStatus = patch.paymentStatus;
    }

    if (assignments.length) {
      await executeOn(
        connection,
        `UPDATE bookings SET ${assignments.join(", ")} WHERE id = :id`,
        params,
      );
    }

    // A note with no field change is still worth recording — it is how an
    // operator leaves "customer called, flight delayed" on the record. A save
    // that changed nothing and says nothing is not.
    if (assignments.length > 0 || patch.note) await executeOn(
      connection,
      `INSERT INTO activity_log
         (subject_type, subject_id, admin_user_id, action, from_status, to_status, note)
       VALUES ('booking', :id, :adminUserId, :action, :fromStatus, :toStatus, :note)`,
      {
        id,
        adminUserId,
        // A details edit that also moved the payment reads as one edit, with
        // the payment named among its changes; a payment button on its own
        // keeps its specific label.
        action: patch.status
          ? "status_changed"
          : changed.length > 0
            ? "details_updated"
            : patch.paymentStatus && patch.paymentStatus !== existing.paymentStatus
              ? `payment_${patch.paymentStatus}`
              : patch.paymentMethod && patch.paymentMethod !== existing.paymentMethod
                ? `payment_method_${patch.paymentMethod}`
                : "updated",
        fromStatus: patch.status ? existing.status : null,
        toStatus: patch.status ?? null,
        note:
          [
            changed.length > 0
              ? `Changed: ${[...changed, ...(paymentChanged ? ["payment"] : [])].join(", ")}.`
              : "",
            patch.note ?? "",
          ]
            .filter(Boolean)
            .join(" ") || null,
      },
    );

    const rows = await runOn<BookingRow>(
      connection,
      `SELECT ${SELECT_COLUMNS} FROM bookings WHERE id = :id`,
      { id },
    );
    const row = rows[0];
    if (!row) throw ApiError.notFound("That booking no longer exists.");
    return toBooking(row);
  });
}

export type ActivityEntry = {
  id: number;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  actor: string | null;
  createdAt: string;
};

export async function getActivity(
  subjectType: "booking" | "quote",
  subjectId: number,
): Promise<ActivityEntry[]> {
  const rows = await query<
    RowDataPacket & {
      id: number;
      action: string;
      from_status: string | null;
      to_status: string | null;
      note: string | null;
      actor: string | null;
      created_at: Date;
    }
  >(
    `SELECT a.id, a.action, a.from_status, a.to_status, a.note,
            u.name AS actor, a.created_at
       FROM activity_log a
       LEFT JOIN admin_users u ON u.id = a.admin_user_id
      WHERE a.subject_type = :subjectType AND a.subject_id = :subjectId
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT 100`,
    { subjectType, subjectId },
  );

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    note: row.note,
    actor: row.actor,
    createdAt: row.created_at.toISOString(),
  }));
}

/**
 * A booking the same person already sent in the last ten minutes, if any.
 *
 * Catches a double click, a retried request and a script replaying one payload,
 * none of which should produce a second reference and a second pair of emails.
 * Deliberately narrow (same email, same pick-up instant, same vehicle class) so
 * it can never refuse a real second trip.
 */
export async function findRecentDuplicate(input: {
  customerEmail: string;
  pickupAt: string;
  vehicleClass: string;
}): Promise<string | null> {
  const row = await queryOne<RowDataPacket & { reference: string }>(
    `SELECT reference FROM bookings
      WHERE customer_email = :email
        AND pickup_at = :pickupAt
        AND vehicle_class = :vehicleClass
        AND created_at > (NOW() - INTERVAL 10 MINUTE)
      ORDER BY id DESC LIMIT 1`,
    {
      email: input.customerEmail.toLowerCase(),
      pickupAt: new Date(input.pickupAt),
      vehicleClass: input.vehicleClass,
    },
  );

  return row?.reference ?? null;
}

/**
 * How close two pick-ups of the same vehicle class have to be for the dashboard
 * to warn that one car may be asked to do both. An operator aid, not a rule:
 * nothing is blocked, because how many cars of a class the business owns is a
 * fact this system does not hold. Three hours is a working assumption for a
 * trip plus a turnaround; change it here and in `listBookings` together.
 */
export const CLASH_WINDOW_MINUTES = 180;

/** Statuses that still need a car. A cancelled or completed trip does not. */
const LIVE_STATUSES = ["new", "quoted", "confirmed", "pending"] as const;

export type PossibleClash = {
  id: number;
  reference: string;
  status: string;
  pickupAt: string;
  customerName: string;
};

/** Other bookings for the same vehicle class close to this one's pick-up. */
export async function findClashes(
  booking: Pick<Booking, "id" | "status" | "vehicleClass" | "pickupAt">,
): Promise<PossibleClash[]> {
  if (!(LIVE_STATUSES as readonly string[]).includes(booking.status)) return [];

  const centre = new Date(booking.pickupAt).getTime();
  const span = CLASH_WINDOW_MINUTES * 60_000;

  const rows = await query<
    RowDataPacket & {
      id: number;
      reference: string;
      status: string;
      pickup_at: Date;
      customer_name: string;
    }
  >(
    `SELECT id, reference, status, pickup_at, customer_name
       FROM bookings
      WHERE id <> :id
        AND vehicle_class = :vehicleClass
        AND status IN ('new','quoted','confirmed','pending')
        AND pickup_at > :from AND pickup_at < :to
      ORDER BY pickup_at ASC`,
    {
      id: booking.id,
      vehicleClass: booking.vehicleClass,
      from: new Date(centre - span),
      to: new Date(centre + span),
    },
  );

  return rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    status: row.status,
    pickupAt: row.pickup_at.toISOString(),
    customerName: row.customer_name,
  }));
}

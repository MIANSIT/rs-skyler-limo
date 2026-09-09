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
  vehicle_class: string;
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
    vehicleClass: row.vehicle_class,
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

const SELECT_COLUMNS = `id, reference, status, trip_type, pickup, destination,
  pickup_at, passengers, bags, vehicle_class, airline, flight_number,
  customer_name, customer_email, customer_phone, notes, quoted_total_cents,
  source, created_at, updated_at`;

export async function createBooking(
  input: z.infer<typeof createBookingSchema>,
  source: string,
): Promise<Booking> {
  // A reference collision is a ~1-in-34-billion event, but a booking lost to
  // one is a customer standing on a kerb, so retry rather than assume.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const reference = makeReference("RS");
    try {
      const result = await execute(
        `INSERT INTO bookings
           (reference, trip_type, pickup, destination, pickup_at, passengers,
            bags, vehicle_class, airline, flight_number, customer_name,
            customer_email, customer_phone, notes, quoted_total_cents, source)
         VALUES
           (:reference, :tripType, :pickup, :destination, :pickupAt, :passengers,
            :bags, :vehicleClass, :airline, :flightNumber, :customerName,
            :customerEmail, :customerPhone, :notes, :quotedTotalCents, :source)`,
        {
          reference,
          tripType: input.tripType,
          pickup: input.pickup,
          destination: input.destination,
          pickupAt: new Date(input.pickupAt),
          passengers: input.passengers,
          bags: input.bags,
          vehicleClass: input.vehicleClass,
          airline: input.airline ?? null,
          flightNumber: input.flightNumber ?? null,
          customerName: input.customerName,
          customerEmail: input.customerEmail.toLowerCase(),
          customerPhone: input.customerPhone,
          notes: input.notes ?? null,
          quotedTotalCents: input.quotedTotalCents ?? null,
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

export async function listBookings(
  filters: z.infer<typeof listBookingsSchema>,
): Promise<BookingList> {
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

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRow = await queryOne<RowDataPacket & { total: number }>(
    `SELECT COUNT(*) AS total FROM bookings ${where}`,
    params,
  );

  // LIMIT/OFFSET are interpolated rather than bound: the MySQL protocol will
  // not accept placeholders there in a prepared statement. Both values come
  // from Zod as bounded integers, so there is nothing to inject.
  const perPage = filters.perPage;
  const offset = (filters.page - 1) * perPage;

  const rows = await query<BookingRow>(
    `SELECT ${SELECT_COLUMNS} FROM bookings ${where}
      ORDER BY
        -- New requests first regardless of date; then soonest pickup.
        CASE WHEN status = 'new' THEN 0 ELSE 1 END,
        pickup_at ASC
      LIMIT ${perPage} OFFSET ${offset}`,
    params,
  );

  return {
    bookings: rows.map(toBooking),
    total: countRow?.total ?? 0,
    page: filters.page,
    perPage,
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
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
    if (patch.pickupAt !== undefined) {
      assignments.push("pickup_at = :pickupAt");
      params.pickupAt = new Date(patch.pickupAt);
    }
    if (patch.vehicleClass !== undefined) {
      assignments.push("vehicle_class = :vehicleClass");
      params.vehicleClass = patch.vehicleClass;
    }
    if (patch.quotedTotalCents !== undefined) {
      assignments.push("quoted_total_cents = :quotedTotalCents");
      params.quotedTotalCents = patch.quotedTotalCents;
    }

    if (assignments.length) {
      await executeOn(
        connection,
        `UPDATE bookings SET ${assignments.join(", ")} WHERE id = :id`,
        params,
      );
    }

    // A note with no field change is still worth recording — it is how an
    // operator leaves "customer called, flight delayed" on the record.
    await executeOn(
      connection,
      `INSERT INTO activity_log
         (subject_type, subject_id, admin_user_id, action, from_status, to_status, note)
       VALUES ('booking', :id, :adminUserId, :action, :fromStatus, :toStatus, :note)`,
      {
        id,
        adminUserId,
        action: patch.status ? "status_changed" : "updated",
        fromStatus: patch.status ? existing.status : null,
        toStatus: patch.status ?? null,
        note: patch.note ?? null,
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

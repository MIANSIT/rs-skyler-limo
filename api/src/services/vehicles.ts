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
import { env } from "../env.js";
import { ApiError } from "../lib/http.js";
import { deleteStoredImage, type StoredFile } from "../lib/uploads.js";
import type {
  listVehiclesSchema,
  photoMetaSchema,
  photoUpdateSchema,
  vehicleInputSchema,
  vehicleUpdateSchema,
} from "../schemas.js";
import {
  AMENITIES,
  isAmenityKey,
  type Amenity,
  type AmenityKey,
} from "../vehicles/amenities.js";

type VehicleRow = RowDataPacket & {
  id: number;
  slug: string;
  name: string;
  category: string;
  model: string | null;
  passenger_capacity: number;
  luggage_capacity: number;
  max_child_seats: number;
  base_fare_cents: number;
  best_for: string;
  detail: string;
  amenities: unknown;
  is_active: number;
  display_order: number;
  created_at: Date;
  updated_at: Date;
};

type PhotoRow = RowDataPacket & {
  id: number;
  vehicle_id: number;
  file_path: string;
  kind: "exterior" | "interior";
  alt_text: string;
  width: number | null;
  height: number | null;
  byte_size: number | null;
  is_primary: number;
  display_order: number;
};

export type VehiclePhoto = {
  id: number;
  url: string;
  kind: "exterior" | "interior";
  altText: string;
  width: number | null;
  height: number | null;
  isPrimary: boolean;
  displayOrder: number;
};

export type Vehicle = {
  id: number;
  slug: string;
  name: string;
  category: string;
  model: string | null;
  passengerCapacity: number;
  luggageCapacity: number;
  maxChildSeats: number;
  baseFareCents: number;
  bestFor: string;
  detail: string;
  amenities: AmenityKey[];
  /** Expanded for display so neither client app needs the amenity table. */
  amenityLabels: { key: string; label: string; hint?: string }[];
  isActive: boolean;
  displayOrder: number;
  photos: VehiclePhoto[];
  primaryPhoto: VehiclePhoto | null;
  createdAt: string;
  updatedAt: string;
};

const SELECT_COLUMNS = `id, slug, name, category, model, passenger_capacity,
  luggage_capacity, max_child_seats, base_fare_cents, best_for, detail,
  amenities, is_active, display_order, created_at, updated_at`;

// Typed as the wide `Amenity` so the optional `hint` is reachable; the
// literal tuple from `as const` narrows it away.
const amenityByKey = new Map<string, Amenity>(
  AMENITIES.map((amenity) => [amenity.key, amenity]),
);

function photoUrl(filePath: string): string {
  // Stored paths are relative; the host is configuration, not data.
  return `${env.UPLOADS_BASE_URL.replace(/\/$/, "")}/${filePath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

function toPhoto(row: PhotoRow): VehiclePhoto {
  return {
    id: row.id,
    url: photoUrl(row.file_path),
    kind: row.kind,
    altText: row.alt_text,
    width: row.width,
    height: row.height,
    isPrimary: row.is_primary === 1,
    displayOrder: row.display_order,
  };
}

/**
 * MySQL's JSON columns come back already parsed by mysql2, but a row written by
 * hand or by an older version can arrive as a string — and an unknown amenity
 * key must not crash a page, so anything unrecognised is dropped.
 */
function parseAmenities(value: unknown): AmenityKey[] {
  let raw = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw.filter(isAmenityKey);
}

function toVehicle(row: VehicleRow, photos: PhotoRow[]): Vehicle {
  const amenities = parseAmenities(row.amenities);
  const mapped = photos.map(toPhoto);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    model: row.model,
    passengerCapacity: row.passenger_capacity,
    luggageCapacity: row.luggage_capacity,
    maxChildSeats: row.max_child_seats,
    baseFareCents: row.base_fare_cents,
    bestFor: row.best_for,
    detail: row.detail,
    amenities,
    amenityLabels: amenities.map((key) => {
      const found = amenityByKey.get(key)!;
      return found.hint
        ? { key, label: found.label, hint: found.hint }
        : { key, label: found.label };
    }),
    isActive: row.is_active === 1,
    displayOrder: row.display_order,
    photos: mapped,
    primaryPhoto:
      mapped.find((photo) => photo.isPrimary) ??
      mapped.find((photo) => photo.kind === "exterior") ??
      mapped[0] ??
      null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** One query for the vehicles, one for all their photos — never N+1. */
async function attachPhotos(rows: VehicleRow[]): Promise<Vehicle[]> {
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  // Interpolated, not bound: mysql2 expands a bound array into a single
  // parameter, and every id here is an integer straight from the database.
  const photos = await query<PhotoRow>(
    `SELECT id, vehicle_id, file_path, kind, alt_text, width, height,
            byte_size, is_primary, display_order
       FROM vehicle_photos
      WHERE vehicle_id IN (${ids.join(",")})
      ORDER BY is_primary DESC, display_order ASC, id ASC`,
  );

  const byVehicle = new Map<number, PhotoRow[]>();
  for (const photo of photos) {
    const list = byVehicle.get(photo.vehicle_id);
    if (list) list.push(photo);
    else byVehicle.set(photo.vehicle_id, [photo]);
  }

  return rows.map((row) => toVehicle(row, byVehicle.get(row.id) ?? []));
}

export async function listVehicles(
  filters: z.infer<typeof listVehiclesSchema>,
): Promise<Vehicle[]> {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (!filters.includeInactive) conditions.push("is_active = 1");

  if (filters.q) {
    conditions.push("(name LIKE :q OR slug LIKE :q OR model LIKE :q)");
    params.q = `%${filters.q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await query<VehicleRow>(
    `SELECT ${SELECT_COLUMNS} FROM vehicles ${where}
      ORDER BY display_order ASC, id ASC`,
    params,
  );

  return attachPhotos(rows);
}

export async function getVehicle(id: number): Promise<Vehicle | null> {
  const row = await queryOne<VehicleRow>(
    `SELECT ${SELECT_COLUMNS} FROM vehicles WHERE id = :id LIMIT 1`,
    { id },
  );
  if (!row) return null;

  const [vehicle] = await attachPhotos([row]);
  return vehicle ?? null;
}

export async function getVehicleBySlug(slug: string): Promise<Vehicle | null> {
  const row = await queryOne<VehicleRow>(
    `SELECT ${SELECT_COLUMNS} FROM vehicles WHERE slug = :slug LIMIT 1`,
    { slug },
  );
  if (!row) return null;

  const [vehicle] = await attachPhotos([row]);
  return vehicle ?? null;
}

function isDuplicateSlug(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "ER_DUP_ENTRY"
  );
}

export async function createVehicle(
  input: z.infer<typeof vehicleInputSchema>,
  /** `null` for changes the system made, such as the initial fleet install. */
  adminUserId: number | null,
): Promise<Vehicle> {
  try {
    const result = await execute(
      `INSERT INTO vehicles
         (slug, name, category, model, passenger_capacity, luggage_capacity,
          max_child_seats, base_fare_cents, best_for, detail, amenities,
          is_active, display_order)
       VALUES
         (:slug, :name, :category, :model, :passengerCapacity, :luggageCapacity,
          :maxChildSeats, :baseFareCents, :bestFor, :detail, :amenities,
          :isActive, :displayOrder)`,
      {
        slug: input.slug,
        name: input.name,
        category: input.category,
        model: input.model ?? null,
        passengerCapacity: input.passengerCapacity,
        luggageCapacity: input.luggageCapacity,
        maxChildSeats: input.maxChildSeats,
        baseFareCents: input.baseFareCents,
        bestFor: input.bestFor,
        detail: input.detail,
        amenities: JSON.stringify(input.amenities),
        isActive: input.isActive ? 1 : 0,
        displayOrder: input.displayOrder,
      },
    );

    await logVehicleChange(result.insertId, adminUserId, "created", null);

    const created = await getVehicle(result.insertId);
    if (!created) throw new Error("Vehicle vanished immediately after insert");
    return created;
  } catch (error) {
    if (isDuplicateSlug(error)) {
      throw ApiError.conflict("A vehicle with that slug already exists.");
    }
    throw error;
  }
}

const COLUMN_BY_FIELD: Record<string, string> = {
  slug: "slug",
  name: "name",
  category: "category",
  model: "model",
  passengerCapacity: "passenger_capacity",
  luggageCapacity: "luggage_capacity",
  maxChildSeats: "max_child_seats",
  baseFareCents: "base_fare_cents",
  bestFor: "best_for",
  detail: "detail",
  amenities: "amenities",
  isActive: "is_active",
  displayOrder: "display_order",
};

export async function updateVehicle(
  id: number,
  patch: z.infer<typeof vehicleUpdateSchema>,
  adminUserId: number,
): Promise<Vehicle> {
  const existing = await getVehicle(id);
  if (!existing) throw ApiError.notFound("That vehicle no longer exists.");

  const assignments: string[] = [];
  const params: Record<string, unknown> = { id };

  for (const [field, value] of Object.entries(patch)) {
    const column = COLUMN_BY_FIELD[field];
    if (!column) continue;

    assignments.push(`${column} = :${field}`);
    params[field] =
      field === "amenities"
        ? JSON.stringify(value)
        : field === "isActive"
          ? value
            ? 1
            : 0
          : (value ?? null);
  }

  if (assignments.length === 0) {
    throw ApiError.badRequest("Nothing to update.");
  }

  try {
    await execute(
      `UPDATE vehicles SET ${assignments.join(", ")} WHERE id = :id`,
      params,
    );
  } catch (error) {
    if (isDuplicateSlug(error)) {
      throw ApiError.conflict("A vehicle with that slug already exists.");
    }
    throw error;
  }

  await logVehicleChange(
    id,
    adminUserId,
    patch.isActive === undefined
      ? "updated"
      : patch.isActive
        ? "activated"
        : "deactivated",
    Object.keys(patch).join(", "),
  );

  const updated = await getVehicle(id);
  if (!updated) throw ApiError.notFound("That vehicle no longer exists.");
  return updated;
}

/**
 * Hard delete, with the photo files removed from disk in the same operation.
 *
 * Refused once a booking references the slug: those bookings name a vehicle
 * class, and deleting it would leave an operator reading a dispatch sheet for a
 * car the system can no longer describe. Deactivating is the right move there,
 * and the error says so.
 */
export async function deleteVehicle(
  id: number,
  adminUserId: number,
): Promise<void> {
  const existing = await getVehicle(id);
  if (!existing) throw ApiError.notFound("That vehicle no longer exists.");

  const inUse = await queryOne<RowDataPacket & { total: number }>(
    `SELECT COUNT(*) AS total FROM bookings WHERE vehicle_class = :slug`,
    { slug: existing.slug },
  );

  if ((inUse?.total ?? 0) > 0) {
    throw ApiError.conflict(
      `${existing.name} is on ${inUse!.total} booking${
        inUse!.total === 1 ? "" : "s"
      } and cannot be deleted. Hide it instead — it will leave the website immediately and those bookings keep their history.`,
    );
  }

  await logVehicleChange(id, adminUserId, "deleted", existing.name);

  // The rows go first: a failed unlink must not leave a vehicle that cannot be
  // deleted, and an orphaned file is harmless.
  await execute(`DELETE FROM vehicles WHERE id = :id`, { id });

  for (const photo of existing.photos) {
    await deleteStoredImage(photoPathFromUrl(photo.url));
  }
}

function photoPathFromUrl(url: string): string {
  const base = env.UPLOADS_BASE_URL.replace(/\/$/, "");
  return decodeURIComponent(url.startsWith(base) ? url.slice(base.length + 1) : url);
}

export async function reorderVehicles(
  ids: number[],
  adminUserId: number,
): Promise<Vehicle[]> {
  await transaction(async (connection) => {
    for (const [index, id] of ids.entries()) {
      await executeOn(
        connection,
        `UPDATE vehicles SET display_order = :order WHERE id = :id`,
        { order: index, id },
      );
    }
  });

  await logVehicleChange(ids[0] ?? 0, adminUserId, "reordered", null);

  return listVehicles({ includeInactive: true });
}

/* -------------------------------------------------------------------------- */
/* Photos                                                                     */
/* -------------------------------------------------------------------------- */

export async function addVehiclePhoto(
  vehicleId: number,
  file: StoredFile,
  meta: z.infer<typeof photoMetaSchema>,
): Promise<Vehicle> {
  const vehicle = await getVehicle(vehicleId);
  if (!vehicle) {
    // The file is already on disk at this point; do not leave it orphaned.
    await deleteStoredImage(file.filePath);
    throw ApiError.notFound("That vehicle no longer exists.");
  }

  // The first photo of a vehicle is its primary one whether or not the caller
  // said so — a card with no image is worse than a guessed one.
  const shouldBePrimary = meta.isPrimary || vehicle.photos.length === 0;

  await transaction(async (connection) => {
    if (shouldBePrimary) {
      await executeOn(
        connection,
        `UPDATE vehicle_photos SET is_primary = 0 WHERE vehicle_id = :vehicleId`,
        { vehicleId },
      );
    }

    const nextOrder = await runOn<RowDataPacket & { next: number }>(
      connection,
      `SELECT COALESCE(MAX(display_order) + 1, 0) AS next
         FROM vehicle_photos WHERE vehicle_id = :vehicleId`,
      { vehicleId },
    );

    await executeOn(
      connection,
      `INSERT INTO vehicle_photos
         (vehicle_id, file_path, kind, alt_text, width, height, byte_size,
          is_primary, display_order)
       VALUES
         (:vehicleId, :filePath, :kind, :altText, :width, :height, :byteSize,
          :isPrimary, :displayOrder)`,
      {
        vehicleId,
        filePath: file.filePath,
        kind: meta.kind,
        altText: meta.altText,
        width: file.width,
        height: file.height,
        byteSize: file.byteSize,
        isPrimary: shouldBePrimary ? 1 : 0,
        displayOrder: nextOrder[0]?.next ?? 0,
      },
    );
  });

  const updated = await getVehicle(vehicleId);
  return updated!;
}

export async function updateVehiclePhoto(
  vehicleId: number,
  photoId: number,
  patch: z.infer<typeof photoUpdateSchema>,
): Promise<Vehicle> {
  const photo = await queryOne<PhotoRow>(
    `SELECT id, vehicle_id, file_path, kind, alt_text, width, height,
            byte_size, is_primary, display_order
       FROM vehicle_photos
      WHERE id = :photoId AND vehicle_id = :vehicleId
      LIMIT 1`,
    { photoId, vehicleId },
  );
  if (!photo) throw ApiError.notFound("That photo no longer exists.");

  await transaction(async (connection) => {
    if (patch.isPrimary) {
      await executeOn(
        connection,
        `UPDATE vehicle_photos SET is_primary = 0 WHERE vehicle_id = :vehicleId`,
        { vehicleId },
      );
    }

    const assignments: string[] = [];
    const params: Record<string, unknown> = { photoId };

    if (patch.kind !== undefined) {
      assignments.push("kind = :kind");
      params.kind = patch.kind;
    }
    if (patch.altText !== undefined) {
      assignments.push("alt_text = :altText");
      params.altText = patch.altText;
    }
    if (patch.isPrimary !== undefined) {
      assignments.push("is_primary = :isPrimary");
      params.isPrimary = patch.isPrimary ? 1 : 0;
    }
    if (patch.displayOrder !== undefined) {
      assignments.push("display_order = :displayOrder");
      params.displayOrder = patch.displayOrder;
    }

    if (assignments.length) {
      await executeOn(
        connection,
        `UPDATE vehicle_photos SET ${assignments.join(", ")} WHERE id = :photoId`,
        params,
      );
    }
  });

  const updated = await getVehicle(vehicleId);
  return updated!;
}

export async function deleteVehiclePhoto(
  vehicleId: number,
  photoId: number,
): Promise<Vehicle> {
  const photo = await queryOne<PhotoRow>(
    `SELECT id, vehicle_id, file_path, is_primary
       FROM vehicle_photos
      WHERE id = :photoId AND vehicle_id = :vehicleId
      LIMIT 1`,
    { photoId, vehicleId },
  );
  if (!photo) throw ApiError.notFound("That photo no longer exists.");

  await execute(`DELETE FROM vehicle_photos WHERE id = :photoId`, { photoId });
  await deleteStoredImage(photo.file_path);

  // Removing the primary photo must not leave the vehicle without one.
  if (photo.is_primary === 1) {
    await execute(
      `UPDATE vehicle_photos
          SET is_primary = 1
        WHERE vehicle_id = :vehicleId
        ORDER BY display_order ASC, id ASC
        LIMIT 1`,
      { vehicleId },
    );
  }

  const updated = await getVehicle(vehicleId);
  if (!updated) throw ApiError.notFound("That vehicle no longer exists.");
  return updated;
}

async function logVehicleChange(
  vehicleId: number,
  adminUserId: number | null,
  action: string,
  note: string | null,
): Promise<void> {
  await execute(
    `INSERT INTO activity_log
       (subject_type, subject_id, admin_user_id, action, note)
     VALUES ('vehicle', :vehicleId, :adminUserId, :action, :note)`,
    { vehicleId, adminUserId, action, note },
  );
}

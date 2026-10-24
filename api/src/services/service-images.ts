import { execute, query, queryOne, type RowDataPacket } from "../db.js";
import { env } from "../env.js";
import { ApiError } from "../lib/http.js";
import { deleteStoredImage, type StoredFile } from "../lib/uploads.js";

/**
 * The photo on each service card. The slugs are the site's `services` in
 * content.ts — the one place a service is described — and the names are what
 * the dashboard labels each upload slot with.
 */
export const SERVICE_SLOTS = [
  { slug: "airport-transfers", name: "Airport Transfers" },
  { slug: "point-to-point", name: "Point to Point" },
  { slug: "hourly-charters", name: "Hourly Charters" },
  { slug: "corporate-accounts", name: "Corporate Accounts" },
  { slug: "events", name: "Events" },
  { slug: "weddings", name: "Weddings" },
] as const;

export type ServiceSlug = (typeof SERVICE_SLOTS)[number]["slug"];

export function assertServiceSlug(raw: string | undefined): ServiceSlug {
  const slot = SERVICE_SLOTS.find((candidate) => candidate.slug === raw);
  if (!slot) throw ApiError.notFound("There is no such service.");
  return slot.slug;
}

type ImageRow = RowDataPacket & {
  slug: string;
  file_path: string;
  alt_text: string;
  width: number | null;
  height: number | null;
};

export type ServiceImage = {
  slug: string;
  url: string;
  altText: string;
  width: number | null;
  height: number | null;
};

function mediaUrl(filePath: string): string {
  // Stored paths are relative; the host is configuration, not data.
  return `${env.UPLOADS_BASE_URL.replace(/\/$/, "")}/${filePath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

function toImage(row: ImageRow): ServiceImage {
  return {
    slug: row.slug,
    url: mediaUrl(row.file_path),
    altText: row.alt_text,
    width: row.width,
    height: row.height,
  };
}

export async function listServiceImages(): Promise<ServiceImage[]> {
  const rows = await query<ImageRow>(
    `SELECT slug, file_path, alt_text, width, height FROM service_images`,
  );
  return rows.map(toImage);
}

/** Saves (or replaces) a service's photo and removes the file it replaces. */
export async function setServiceImage(
  slug: ServiceSlug,
  stored: StoredFile,
  altText: string,
): Promise<ServiceImage[]> {
  const previous = await queryOne<ImageRow>(
    `SELECT slug, file_path, alt_text, width, height FROM service_images WHERE slug = :slug`,
    { slug },
  );

  await execute(
    `INSERT INTO service_images (slug, file_path, alt_text, width, height, byte_size)
     VALUES (:slug, :filePath, :altText, :width, :height, :byteSize)
     ON DUPLICATE KEY UPDATE file_path = VALUES(file_path), alt_text = VALUES(alt_text),
       width = VALUES(width), height = VALUES(height), byte_size = VALUES(byte_size)`,
    {
      slug,
      filePath: stored.filePath,
      altText,
      width: stored.width,
      height: stored.height,
      byteSize: stored.byteSize,
    },
  );

  if (previous) await deleteStoredImage(previous.file_path);
  return listServiceImages();
}

/** Back to the site's own photo for that service. */
export async function removeServiceImage(slug: ServiceSlug): Promise<ServiceImage[]> {
  const previous = await queryOne<ImageRow>(
    `SELECT slug, file_path, alt_text, width, height FROM service_images WHERE slug = :slug`,
    { slug },
  );
  await execute(`DELETE FROM service_images WHERE slug = :slug`, { slug });
  if (previous) await deleteStoredImage(previous.file_path);
  return listServiceImages();
}

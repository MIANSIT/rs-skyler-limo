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
import type { heroMediaUpdateSchema } from "../schemas.js";

type HeroMediaRow = RowDataPacket & {
  id: number;
  kind: "image" | "video";
  file_path: string;
  poster_path: string | null;
  alt_text: string;
  width: number | null;
  height: number | null;
  byte_size: number | null;
  is_active: number;
  display_order: number;
};

export type HeroMediaItem = {
  id: number;
  kind: "image" | "video";
  url: string;
  posterUrl: string | null;
  altText: string;
  width: number | null;
  height: number | null;
  isActive: boolean;
  displayOrder: number;
};

const SELECT_COLUMNS = `id, kind, file_path, poster_path, alt_text, width,
  height, byte_size, is_active, display_order`;

function mediaUrl(filePath: string): string {
  // Stored paths are relative; the host is configuration, not data.
  return `${env.UPLOADS_BASE_URL.replace(/\/$/, "")}/${filePath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

function toItem(row: HeroMediaRow): HeroMediaItem {
  return {
    id: row.id,
    kind: row.kind,
    url: mediaUrl(row.file_path),
    posterUrl: row.poster_path ? mediaUrl(row.poster_path) : null,
    altText: row.alt_text,
    width: row.width,
    height: row.height,
    isActive: row.is_active === 1,
    displayOrder: row.display_order,
  };
}

/** All slides, active and hidden — what the dashboard manages. */
export async function listHeroMedia(): Promise<HeroMediaItem[]> {
  const rows = await query<HeroMediaRow>(
    `SELECT ${SELECT_COLUMNS} FROM hero_media ORDER BY display_order ASC, id ASC`,
  );
  return rows.map(toItem);
}

/** Active slides only, in order — what the homepage reads. */
export async function listActiveHeroMedia(): Promise<HeroMediaItem[]> {
  const rows = await query<HeroMediaRow>(
    `SELECT ${SELECT_COLUMNS} FROM hero_media
      WHERE is_active = 1
      ORDER BY display_order ASC, id ASC`,
  );
  return rows.map(toItem);
}

async function getRow(id: number): Promise<HeroMediaRow | null> {
  return queryOne<HeroMediaRow>(
    `SELECT ${SELECT_COLUMNS} FROM hero_media WHERE id = :id LIMIT 1`,
    { id },
  );
}

export async function addHeroMedia(
  file: StoredFile,
  meta: { kind: "image" | "video"; altText: string },
): Promise<HeroMediaItem> {
  const inserted = await transaction(async (connection) => {
    const nextOrder = await runOn<RowDataPacket & { next: number }>(
      connection,
      `SELECT COALESCE(MAX(display_order) + 1, 0) AS next FROM hero_media`,
    );

    const result = await executeOn(
      connection,
      `INSERT INTO hero_media
         (kind, file_path, alt_text, width, height, byte_size, display_order)
       VALUES
         (:kind, :filePath, :altText, :width, :height, :byteSize, :displayOrder)`,
      {
        kind: meta.kind,
        filePath: file.filePath,
        altText: meta.altText,
        width: file.width,
        height: file.height,
        byteSize: file.byteSize,
        displayOrder: nextOrder[0]?.next ?? 0,
      },
    );

    return result.insertId;
  });

  const row = await getRow(inserted);
  return toItem(row!);
}

/**
 * Swaps the file on an existing slide without touching its position, alt
 * text or active state — "change the image or video" as distinct from
 * delete-and-re-add.
 */
export async function replaceHeroMediaFile(
  id: number,
  file: StoredFile,
  kind: "image" | "video",
): Promise<HeroMediaItem> {
  const existing = await getRow(id);
  if (!existing) {
    await deleteStoredImage(file.filePath);
    throw ApiError.notFound("That slide no longer exists.");
  }

  await execute(
    `UPDATE hero_media
        SET kind = :kind, file_path = :filePath, width = :width,
            height = :height, byte_size = :byteSize
      WHERE id = :id`,
    {
      id,
      kind,
      filePath: file.filePath,
      width: file.width,
      height: file.height,
      byteSize: file.byteSize,
    },
  );

  await deleteStoredImage(existing.file_path);

  const row = await getRow(id);
  return toItem(row!);
}

/** Sets or replaces the still frame shown before a video slide plays. */
export async function setHeroMediaPoster(
  id: number,
  file: StoredFile,
): Promise<HeroMediaItem> {
  const existing = await getRow(id);
  if (!existing) {
    await deleteStoredImage(file.filePath);
    throw ApiError.notFound("That slide no longer exists.");
  }

  await execute(
    `UPDATE hero_media SET poster_path = :posterPath WHERE id = :id`,
    { id, posterPath: file.filePath },
  );

  if (existing.poster_path) await deleteStoredImage(existing.poster_path);

  const row = await getRow(id);
  return toItem(row!);
}

export async function updateHeroMedia(
  id: number,
  patch: z.infer<typeof heroMediaUpdateSchema>,
): Promise<HeroMediaItem> {
  const existing = await getRow(id);
  if (!existing) throw ApiError.notFound("That slide no longer exists.");

  const assignments: string[] = [];
  const params: Record<string, unknown> = { id };

  if (patch.altText !== undefined) {
    assignments.push("alt_text = :altText");
    params.altText = patch.altText;
  }
  if (patch.isActive !== undefined) {
    assignments.push("is_active = :isActive");
    params.isActive = patch.isActive ? 1 : 0;
  }
  if (patch.displayOrder !== undefined) {
    assignments.push("display_order = :displayOrder");
    params.displayOrder = patch.displayOrder;
  }

  if (assignments.length === 0) throw ApiError.badRequest("Nothing to update.");

  await execute(
    `UPDATE hero_media SET ${assignments.join(", ")} WHERE id = :id`,
    params,
  );

  const row = await getRow(id);
  return toItem(row!);
}

export async function deleteHeroMedia(id: number): Promise<void> {
  const existing = await getRow(id);
  if (!existing) throw ApiError.notFound("That slide no longer exists.");

  await execute(`DELETE FROM hero_media WHERE id = :id`, { id });

  await deleteStoredImage(existing.file_path);
  if (existing.poster_path) await deleteStoredImage(existing.poster_path);
}

export async function reorderHeroMedia(ids: number[]): Promise<HeroMediaItem[]> {
  await transaction(async (connection) => {
    for (const [index, id] of ids.entries()) {
      await executeOn(
        connection,
        `UPDATE hero_media SET display_order = :order WHERE id = :id`,
        { order: index, id },
      );
    }
  });

  return listHeroMedia();
}

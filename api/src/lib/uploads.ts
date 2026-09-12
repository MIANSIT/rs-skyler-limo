import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { env } from "../env.js";
import { ApiError } from "./http.js";

/**
 * Where uploaded photography lives. Outside the code tree on purpose: a deploy
 * replaces the application directory, and vehicle photos must survive that.
 */
export const UPLOADS_ROOT = resolve(env.UPLOADS_DIR);

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Accepted formats, identified by magic bytes rather than by the `Content-Type`
 * the client claims or the extension it picked. A caller can say anything; the
 * first few bytes of the file cannot lie as easily, and this is the check that
 * stops an `.html` or a script being written into a directory we serve.
 */
const SIGNATURES: {
  ext: string;
  mime: string;
  test: (bytes: Buffer) => boolean;
}[] = [
  {
    ext: "jpg",
    mime: "image/jpeg",
    test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    ext: "png",
    mime: "image/png",
    test: (b) =>
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    ext: "webp",
    mime: "image/webp",
    test: (b) =>
      b.length > 12 &&
      b.subarray(0, 4).toString("latin1") === "RIFF" &&
      b.subarray(8, 12).toString("latin1") === "WEBP",
  },
];

export type StoredFile = {
  /** Relative to `UPLOADS_ROOT`, and what goes in the database. */
  filePath: string;
  mime: string;
  byteSize: number;
  width: number | null;
  height: number | null;
};

/**
 * Reads intrinsic dimensions straight from the file header.
 *
 * Enough parsing to fill the `width`/`height` columns, which let the public
 * site render an `<Image>` without a layout shift. Deliberately not a decoder:
 * we never re-encode user images, so there is no image library to keep patched.
 */
function readDimensions(bytes: Buffer, ext: string): { width: number; height: number } | null {
  try {
    if (ext === "png") {
      return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
    }

    if (ext === "webp") {
      const format = bytes.subarray(12, 16).toString("latin1");
      if (format === "VP8 ") {
        return {
          width: bytes.readUInt16LE(26) & 0x3fff,
          height: bytes.readUInt16LE(28) & 0x3fff,
        };
      }
      if (format === "VP8L") {
        const bits = bytes.readUInt32LE(21);
        return {
          width: (bits & 0x3fff) + 1,
          height: ((bits >> 14) & 0x3fff) + 1,
        };
      }
      if (format === "VP8X") {
        return {
          width: (bytes.readUIntLE(24, 3) & 0xffffff) + 1,
          height: (bytes.readUIntLE(27, 3) & 0xffffff) + 1,
        };
      }
      return null;
    }

    if (ext === "jpg") {
      // Walk the segment markers to the start-of-frame, which carries the size.
      let offset = 2;
      while (offset < bytes.length - 9) {
        if (bytes[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        const marker = bytes[offset + 1]!;
        // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15
        const isStartOfFrame =
          marker >= 0xc0 &&
          marker <= 0xcf &&
          marker !== 0xc4 &&
          marker !== 0xc8 &&
          marker !== 0xcc;

        if (isStartOfFrame) {
          return {
            height: bytes.readUInt16BE(offset + 5),
            width: bytes.readUInt16BE(offset + 7),
          };
        }
        offset += 2 + bytes.readUInt16BE(offset + 2);
      }
    }
  } catch {
    // A header we cannot parse is not a reason to reject a valid image.
  }

  return null;
}

/**
 * Writes an uploaded image under `UPLOADS_ROOT` and returns what to store.
 *
 * The filename is generated, never taken from the client: an attacker-supplied
 * name is how `../../etc/something` and `photo.php` get written. Extension
 * comes from the verified signature.
 */
export async function storeImage(
  bytes: Buffer,
  scope: string,
): Promise<StoredFile> {
  if (bytes.length === 0) throw ApiError.badRequest("That file is empty.");

  if (bytes.length > MAX_BYTES) {
    throw ApiError.badRequest("Images must be 5 MB or smaller.");
  }

  const signature = SIGNATURES.find((candidate) => candidate.test(bytes));
  if (!signature) {
    throw ApiError.badRequest("Upload a JPEG, PNG or WebP image.");
  }

  const dimensions = readDimensions(bytes, signature.ext);

  // `scope` is caller-controlled, so it is reduced to a safe slug rather than
  // trusted as a path fragment.
  const safeScope = scope.replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "vehicle";
  const filePath = join(
    "vehicles",
    safeScope,
    `${Date.now()}-${randomBytes(6).toString("hex")}.${signature.ext}`,
  );

  const absolute = join(UPLOADS_ROOT, filePath);

  // Defence in depth: even with a generated name, confirm the resolved path did
  // not escape the uploads root before writing anything.
  if (!absolute.startsWith(UPLOADS_ROOT)) {
    throw ApiError.badRequest("Invalid upload path.");
  }

  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, bytes);

  return {
    filePath,
    mime: signature.mime,
    byteSize: bytes.length,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
  };
}

/** Best-effort: a missing file must not block deleting its database row. */
export async function deleteStoredImage(filePath: string): Promise<void> {
  const absolute = resolve(join(UPLOADS_ROOT, filePath));
  if (!absolute.startsWith(UPLOADS_ROOT)) return;

  await unlink(absolute).catch(() => {});
}

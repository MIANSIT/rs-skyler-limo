import { Router } from "express";
import express from "express";

import { ApiError } from "../lib/http.js";
import { storeImage, storeVideo } from "../lib/uploads.js";
import { requireAdmin } from "../middleware.js";
import { heroMediaMetaSchema, heroMediaUpdateSchema, reorderSchema } from "../schemas.js";
import {
  addHeroMedia,
  deleteHeroMedia,
  listHeroMedia,
  replaceHeroMediaFile,
  reorderHeroMedia,
  setHeroMediaPoster,
  updateHeroMedia,
} from "../services/hero.js";

export const adminHeroRouter: Router = Router();

adminHeroRouter.use(requireAdmin);

function parseId(raw: string | undefined): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw ApiError.notFound();
  return id;
}

function decodeHeader(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Main slide media (image or video) as a raw body, mirroring the vehicle
 * photo upload endpoint. `X-Media-Kind` says which; the body is verified
 * against that claim by magic bytes in `storeImage`/`storeVideo`, never
 * trusted from the header or the request's Content-Type alone.
 */
const rawMedia = express.raw({
  type: ["image/jpeg", "image/png", "image/webp", "video/mp4"],
  limit: "25mb",
});

adminHeroRouter.get("/", async (_req, res) => {
  res.json({ media: await listHeroMedia() });
});

adminHeroRouter.post("/", rawMedia, async (req, res) => {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    throw ApiError.badRequest(
      "Send the file as the request body with an image or video Content-Type.",
    );
  }

  const meta = heroMediaMetaSchema.parse({
    kind: req.get("x-media-kind") ?? undefined,
    altText: decodeHeader(req.get("x-media-alt") ?? ""),
  });

  const stored =
    meta.kind === "video"
      ? await storeVideo(req.body, "slide")
      : await storeImage(req.body, "slide", "hero");

  const item = await addHeroMedia(stored, meta);
  res.status(201).json({ media: item });
});

adminHeroRouter.put("/:id/media", rawMedia, async (req, res) => {
  const id = parseId(req.params.id);

  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    throw ApiError.badRequest(
      "Send the file as the request body with an image or video Content-Type.",
    );
  }

  const kind = req.get("x-media-kind") === "video" ? "video" : "image";
  const stored =
    kind === "video"
      ? await storeVideo(req.body, "slide")
      : await storeImage(req.body, "slide", "hero");

  const item = await replaceHeroMediaFile(id, stored, kind);
  res.json({ media: item });
});

const rawPoster = express.raw({
  type: ["image/jpeg", "image/png", "image/webp"],
  limit: "6mb",
});

adminHeroRouter.put("/:id/poster", rawPoster, async (req, res) => {
  const id = parseId(req.params.id);

  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    throw ApiError.badRequest(
      "Send the poster image as the request body with an image Content-Type.",
    );
  }

  const stored = await storeImage(req.body, "poster", "hero");
  const item = await setHeroMediaPoster(id, stored);
  res.json({ media: item });
});

adminHeroRouter.patch("/:id", async (req, res) => {
  const patch = heroMediaUpdateSchema.parse(req.body);
  const item = await updateHeroMedia(parseId(req.params.id), patch);
  res.json({ media: item });
});

adminHeroRouter.delete("/:id", async (req, res) => {
  await deleteHeroMedia(parseId(req.params.id));
  res.status(204).end();
});

adminHeroRouter.post("/reorder", async (req, res) => {
  const { ids } = reorderSchema.parse(req.body);
  res.json({ media: await reorderHeroMedia(ids) });
});

import express, { Router } from "express";
import { z } from "zod";

import { ApiError } from "../lib/http.js";
import { storeImage } from "../lib/uploads.js";
import { requireAdmin } from "../middleware.js";
import {
  SERVICE_SLOTS,
  assertServiceSlug,
  listServiceImages,
  removeServiceImage,
  setServiceImage,
} from "../services/service-images.js";

export const adminServiceImagesRouter: Router = Router();

adminServiceImagesRouter.use(requireAdmin);

const rawImage = express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "6mb" });

const altSchema = z.string().trim().min(1, "Describe the photo for screen readers.").max(255);

function decodeHeader(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Every service slot, with its uploaded photo when it has one. */
adminServiceImagesRouter.get("/", async (_req, res) => {
  const images = await listServiceImages();
  res.json({
    services: SERVICE_SLOTS.map((slot) => ({
      ...slot,
      image: images.find((image) => image.slug === slot.slug) ?? null,
    })),
  });
});

adminServiceImagesRouter.put("/:slug", rawImage, async (req, res) => {
  const slug = assertServiceSlug(req.params.slug);
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    throw ApiError.badRequest("Send the photo as the request body with an image Content-Type.");
  }

  const altText = altSchema.parse(decodeHeader(req.get("x-media-alt") ?? ""));
  const stored = await storeImage(req.body, slug, "services");
  await setServiceImage(slug, stored, altText);
  res.json({ ok: true });
});

adminServiceImagesRouter.delete("/:slug", async (req, res) => {
  await removeServiceImage(assertServiceSlug(req.params.slug));
  res.status(204).end();
});

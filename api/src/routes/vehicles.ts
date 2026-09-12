import { Router } from "express";
import express from "express";

import { ApiError } from "../lib/http.js";
import { storeImage } from "../lib/uploads.js";
import { requireAdmin } from "../middleware.js";
import {
  listVehiclesSchema,
  photoMetaSchema,
  photoUpdateSchema,
  reorderSchema,
  vehicleInputSchema,
  vehicleUpdateSchema,
} from "../schemas.js";
import {
  addVehiclePhoto,
  createVehicle,
  deleteVehicle,
  deleteVehiclePhoto,
  getVehicle,
  listVehicles,
  reorderVehicles,
  updateVehicle,
  updateVehiclePhoto,
} from "../services/vehicles.js";
import { AMENITIES, VEHICLE_CATEGORIES } from "../vehicles/amenities.js";

export const adminVehiclesRouter: Router = Router();

adminVehiclesRouter.use(requireAdmin);

function decodeHeader(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    // A malformed escape is the caller's problem, but it should surface as a
    // validation error on the field rather than a 500 from the decoder.
    return value;
  }
}

function parseId(raw: string | undefined): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw ApiError.notFound();
  return id;
}

/**
 * The vocabulary the admin form renders from, so the list of amenities and
 * categories lives in exactly one place and the form cannot drift from what
 * validation will accept.
 */
adminVehiclesRouter.get("/meta", (_req, res) => {
  res.json({ amenities: AMENITIES, categories: VEHICLE_CATEGORIES });
});

adminVehiclesRouter.get("/", async (req, res) => {
  const filters = listVehiclesSchema.parse({
    ...req.query,
    // The dashboard always wants to see hidden vehicles; that is the point of
    // hiding rather than deleting.
    includeInactive: req.query.includeInactive ?? true,
  });

  res.json({ vehicles: await listVehicles(filters) });
});

adminVehiclesRouter.post("/", async (req, res) => {
  const input = vehicleInputSchema.parse(req.body);
  const vehicle = await createVehicle(input, req.admin!.id);

  res.status(201).json({ vehicle });
});

adminVehiclesRouter.post("/reorder", async (req, res) => {
  const { ids } = reorderSchema.parse(req.body);
  res.json({ vehicles: await reorderVehicles(ids, req.admin!.id) });
});

adminVehiclesRouter.get("/:id", async (req, res) => {
  const vehicle = await getVehicle(parseId(req.params.id));
  if (!vehicle) throw ApiError.notFound("That vehicle no longer exists.");

  res.json({ vehicle });
});

adminVehiclesRouter.patch("/:id", async (req, res) => {
  const patch = vehicleUpdateSchema.parse(req.body);
  const vehicle = await updateVehicle(parseId(req.params.id), patch, req.admin!.id);

  res.json({ vehicle });
});

adminVehiclesRouter.delete("/:id", async (req, res) => {
  await deleteVehicle(parseId(req.params.id), req.admin!.id);
  res.status(204).end();
});

/* -------------------------------------------------------------------------- */
/* Photos                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Photos arrive as a raw image body rather than `multipart/form-data`.
 *
 * The metadata that would otherwise be sibling form fields travels in headers
 * instead, which avoids pulling in a multipart parser — a dependency whose
 * whole job is handling hostile input — for a single upload endpoint used by
 * one authenticated operator at a time.
 */
const rawImage = express.raw({
  type: ["image/jpeg", "image/png", "image/webp"],
  limit: "6mb",
});

adminVehiclesRouter.post("/:id/photos", rawImage, async (req, res) => {
  const vehicleId = parseId(req.params.id);

  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    throw ApiError.badRequest(
      "Send the image as the request body with an image Content-Type.",
    );
  }

  const meta = photoMetaSchema.parse({
    kind: req.get("x-photo-kind") ?? undefined,
    // Percent-encoded by the caller: header values are Latin-1 and alt text is
    // prose, so an em dash would otherwise be rejected before it arrived.
    altText: decodeHeader(req.get("x-photo-alt") ?? ""),
    isPrimary: req.get("x-photo-primary") === "true",
  });

  const stored = await storeImage(req.body, `v${vehicleId}`);
  const vehicle = await addVehiclePhoto(vehicleId, stored, meta);

  res.status(201).json({ vehicle });
});

adminVehiclesRouter.patch("/:id/photos/:photoId", async (req, res) => {
  const patch = photoUpdateSchema.parse(req.body);
  const vehicle = await updateVehiclePhoto(
    parseId(req.params.id),
    parseId(req.params.photoId),
    patch,
  );

  res.json({ vehicle });
});

adminVehiclesRouter.delete("/:id/photos/:photoId", async (req, res) => {
  const vehicle = await deleteVehiclePhoto(
    parseId(req.params.id),
    parseId(req.params.photoId),
  );

  res.json({ vehicle });
});

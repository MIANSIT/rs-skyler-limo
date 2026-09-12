"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { verifySession } from "@/lib/admin/dal";
import { ApiRequestError, apiFetch } from "@/lib/api/client";
import type { Vehicle } from "@/lib/api/types";

import { revalidatePublicFleet } from "./revalidate-web";

export type FleetFormState =
  | { status: "idle" }
  | { status: "error"; message: string; fields?: Record<string, string> }
  | { status: "saved"; message: string };

/** Refreshes every dashboard screen that shows a vehicle, then the public site. */
async function afterWrite(vehicleId?: number) {
  revalidatePath("/fleet");
  if (vehicleId) revalidatePath(`/fleet/${vehicleId}`);

  // The public site is a different application on a different origin, so its
  // cache cannot be reached with `revalidatePath`. It exposes a webhook.
  await revalidatePublicFleet();
}

/**
 * Reads the vehicle fields out of a FormData.
 *
 * Numbers arrive as strings and checkbox groups arrive as repeated entries, so
 * the shaping happens here and the API's Zod layer does the validating — there
 * is no second set of rules to keep in step.
 */
function readVehicle(formData: FormData) {
  const text = (key: string) => String(formData.get(key) ?? "").trim();

  return {
    slug: text("slug"),
    name: text("name"),
    category: text("category"),
    model: text("model") || null,
    passengerCapacity: text("passengerCapacity"),
    luggageCapacity: text("luggageCapacity"),
    maxChildSeats: text("maxChildSeats") || "0",
    // The form collects dollars because that is what an operator thinks in.
    baseFareCents: Math.round(Number(text("baseFare") || 0) * 100),
    bestFor: text("bestFor"),
    detail: text("detail"),
    amenities: formData.getAll("amenities").map(String),
    isActive: formData.get("isActive") === "on",
    displayOrder: text("displayOrder") || "0",
  };
}

function toFormState(error: unknown): FleetFormState {
  if (error instanceof ApiRequestError) {
    return {
      status: "error",
      message: error.failure.message,
      fields: error.failure.fields,
    };
  }
  throw error;
}

export async function createVehicle(
  _previous: FleetFormState,
  formData: FormData,
): Promise<FleetFormState> {
  const { token } = await verifySession();

  let vehicle: Vehicle;
  try {
    const result = await apiFetch<{ vehicle: Vehicle }>("/api/admin/vehicles", {
      method: "POST",
      token,
      body: readVehicle(formData),
    });
    vehicle = result.vehicle;
  } catch (error) {
    return toFormState(error);
  }

  await afterWrite(vehicle.id);

  // Outside the try: `redirect` works by throwing.
  redirect(`/fleet/${vehicle.id}?created=1`);
}

export async function updateVehicle(
  _previous: FleetFormState,
  formData: FormData,
): Promise<FleetFormState> {
  const { token } = await verifySession();
  const id = Number(formData.get("id"));

  if (!Number.isInteger(id) || id < 1) {
    return { status: "error", message: "Unknown vehicle." };
  }

  try {
    await apiFetch(`/api/admin/vehicles/${id}`, {
      method: "PATCH",
      token,
      body: readVehicle(formData),
    });
  } catch (error) {
    return toFormState(error);
  }

  await afterWrite(id);
  return { status: "saved", message: "Saved. The website is up to date." };
}

export async function setVehicleActive(formData: FormData) {
  const { token } = await verifySession();
  const id = Number(formData.get("id"));
  const isActive = formData.get("isActive") === "true";

  if (!Number.isInteger(id) || id < 1) return;

  await apiFetch(`/api/admin/vehicles/${id}`, {
    method: "PATCH",
    token,
    body: { isActive },
  });

  await afterWrite(id);
}

export async function deleteVehicle(
  _previous: FleetFormState,
  formData: FormData,
): Promise<FleetFormState> {
  const { token } = await verifySession();
  const id = Number(formData.get("id"));

  if (!Number.isInteger(id) || id < 1) {
    return { status: "error", message: "Unknown vehicle." };
  }

  try {
    await apiFetch(`/api/admin/vehicles/${id}`, { method: "DELETE", token });
  } catch (error) {
    // The API refuses to delete a class that bookings reference and explains
    // why; that message is written for the operator, so show it verbatim.
    return toFormState(error);
  }

  await afterWrite();
  redirect("/fleet?deleted=1");
}

export async function moveVehicle(formData: FormData) {
  const { token } = await verifySession();

  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map(Number)
    .filter((value) => Number.isInteger(value) && value > 0);

  if (ids.length === 0) return;

  await apiFetch("/api/admin/vehicles/reorder", {
    method: "POST",
    token,
    body: { ids },
  });

  await afterWrite();
}

/* -------------------------------------------------------------------------- */
/* Photos                                                                     */
/* -------------------------------------------------------------------------- */

export async function uploadVehiclePhoto(
  _previous: FleetFormState,
  formData: FormData,
): Promise<FleetFormState> {
  const { token } = await verifySession();

  const id = Number(formData.get("id"));
  const file = formData.get("photo");
  const altText = String(formData.get("altText") ?? "").trim();
  const kind = String(formData.get("kind") ?? "exterior");

  if (!Number.isInteger(id) || id < 1) {
    return { status: "error", message: "Unknown vehicle." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose an image to upload." };
  }
  if (!altText) {
    return {
      status: "error",
      message: "Describe the photo so screen readers can read it.",
      fields: { altText: "Alt text is required." },
    };
  }

  try {
    // The API takes the raw image bytes with its metadata in headers, so the
    // body is forwarded as-is rather than re-wrapped in another multipart.
    await apiFetch(`/api/admin/vehicles/${id}/photos`, {
      method: "POST",
      token,
      rawBody: {
        bytes: Buffer.from(await file.arrayBuffer()),
        contentType: file.type || "application/octet-stream",
        headers: {
          "X-Photo-Kind": kind,
          "X-Photo-Alt": encodeHeader(altText),
          "X-Photo-Primary": String(formData.get("isPrimary") === "on"),
        },
      },
    });
  } catch (error) {
    return toFormState(error);
  }

  await afterWrite(id);
  return { status: "saved", message: "Photo added." };
}

/**
 * HTTP header values are Latin-1. Alt text is prose and will contain em dashes
 * and curly quotes, so it is percent-encoded here and decoded by the API rather
 * than throwing on the first non-ASCII character.
 */
function encodeHeader(value: string): string {
  return encodeURIComponent(value);
}

export async function deleteVehiclePhoto(formData: FormData) {
  const { token } = await verifySession();
  const id = Number(formData.get("id"));
  const photoId = Number(formData.get("photoId"));

  if (!Number.isInteger(id) || !Number.isInteger(photoId)) return;

  await apiFetch(`/api/admin/vehicles/${id}/photos/${photoId}`, {
    method: "DELETE",
    token,
  });

  await afterWrite(id);
}

export async function setPrimaryPhoto(formData: FormData) {
  const { token } = await verifySession();
  const id = Number(formData.get("id"));
  const photoId = Number(formData.get("photoId"));

  if (!Number.isInteger(id) || !Number.isInteger(photoId)) return;

  await apiFetch(`/api/admin/vehicles/${id}/photos/${photoId}`, {
    method: "PATCH",
    token,
    body: { isPrimary: true },
  });

  await afterWrite(id);
}

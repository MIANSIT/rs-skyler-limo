"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/admin/dal";
import { ApiRequestError, apiFetch } from "@/lib/api/client";

import { revalidatePublicServiceImages } from "./revalidate-web";

export type ServiceImageState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "saved"; message: string };

async function afterWrite() {
  revalidatePath("/service-photos");
  await revalidatePublicServiceImages();
}

/** Uploads (or replaces) the photo for one service card. */
export async function uploadServiceImage(
  _previous: ServiceImageState,
  formData: FormData,
): Promise<ServiceImageState> {
  const { token } = await verifySession();

  const slug = String(formData.get("slug") ?? "");
  const file = formData.get("photo");
  const altText = String(formData.get("altText") ?? "").trim();

  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a photo to upload." };
  }
  if (!altText) {
    return { status: "error", message: "Describe the photo in a few words." };
  }

  try {
    await apiFetch(`/api/admin/service-images/${encodeURIComponent(slug)}`, {
      method: "PUT",
      token,
      rawBody: {
        bytes: Buffer.from(await file.arrayBuffer()),
        contentType: file.type || "application/octet-stream",
        // Header values are Latin-1, and alt text is prose.
        headers: { "X-Media-Alt": encodeURIComponent(altText) },
      },
    });
  } catch (error) {
    if (error instanceof ApiRequestError) return { status: "error", message: error.failure.message };
    throw error;
  }

  await afterWrite();
  return { status: "saved", message: "Saved. The homepage updates within seconds." };
}

/** Puts a service card back on the site's own photo. */
export async function removeServiceImage(formData: FormData): Promise<void> {
  const { token } = await verifySession();
  const slug = String(formData.get("slug") ?? "");

  await apiFetch(`/api/admin/service-images/${encodeURIComponent(slug)}`, {
    method: "DELETE",
    token,
  });
  await afterWrite();
}

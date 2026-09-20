"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/admin/dal";
import { ApiRequestError, apiFetch } from "@/lib/api/client";
import type { HeroMediaItem } from "@/lib/api/types";

import { revalidatePublicHero } from "./revalidate-web";

export type HeroFormState =
  | { status: "idle" }
  | { status: "error"; message: string; fields?: Record<string, string> }
  | { status: "saved"; message: string };

/** Refreshes the dashboard's hero page, then the public site. */
async function afterWrite() {
  revalidatePath("/hero");
  await revalidatePublicHero();
}

function toFormState(error: unknown): HeroFormState {
  if (error instanceof ApiRequestError) {
    return {
      status: "error",
      message: error.failure.message,
      fields: error.failure.fields,
    };
  }
  throw error;
}

/**
 * HTTP header values are Latin-1. Alt text is prose and will contain em dashes
 * and curly quotes, so it is percent-encoded here and decoded by the API
 * rather than throwing on the first non-ASCII character.
 */
function encodeHeader(value: string): string {
  return encodeURIComponent(value);
}

export async function uploadHeroMedia(
  _previous: HeroFormState,
  formData: FormData,
): Promise<HeroFormState> {
  const { token } = await verifySession();

  const file = formData.get("media");
  const kind = String(formData.get("kind") ?? "image");
  const altText = String(formData.get("altText") ?? "").trim();

  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose an image or video to upload." };
  }
  if (!altText) {
    return {
      status: "error",
      message: "Describe the slide so screen readers can read it.",
      fields: { altText: "Alt text is required." },
    };
  }

  let created: HeroMediaItem;
  try {
    // Same shape as the vehicle photo upload: raw bytes as the body, metadata
    // in headers rather than a second multipart layer.
    const result = await apiFetch<{ media: HeroMediaItem }>("/api/admin/hero", {
      method: "POST",
      token,
      rawBody: {
        bytes: Buffer.from(await file.arrayBuffer()),
        contentType: file.type || "application/octet-stream",
        headers: {
          "X-Media-Kind": kind,
          "X-Media-Alt": encodeHeader(altText),
        },
      },
    });
    created = result.media;
  } catch (error) {
    return toFormState(error);
  }

  const poster = formData.get("poster");
  if (poster instanceof File && poster.size > 0) {
    try {
      await apiFetch(`/api/admin/hero/${created.id}/poster`, {
        method: "PUT",
        token,
        rawBody: {
          bytes: Buffer.from(await poster.arrayBuffer()),
          contentType: poster.type || "application/octet-stream",
        },
      });
    } catch (error) {
      // The slide itself is already saved; a failed poster is a smaller,
      // separately correctable problem and must not look like a lost upload.
      await afterWrite();
      return toFormState(error);
    }
  }

  await afterWrite();
  return { status: "saved", message: "Slide added." };
}

/** Swaps the image or video on an existing slide without losing its position. */
export async function replaceHeroMedia(
  _previous: HeroFormState,
  formData: FormData,
): Promise<HeroFormState> {
  const { token } = await verifySession();

  const id = Number(formData.get("id"));
  const file = formData.get("media");
  const kind = String(formData.get("kind") ?? "image");

  if (!Number.isInteger(id) || id < 1) {
    return { status: "error", message: "Unknown slide." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a replacement file." };
  }

  try {
    await apiFetch(`/api/admin/hero/${id}/media`, {
      method: "PUT",
      token,
      rawBody: {
        bytes: Buffer.from(await file.arrayBuffer()),
        contentType: file.type || "application/octet-stream",
        headers: { "X-Media-Kind": kind },
      },
    });
  } catch (error) {
    return toFormState(error);
  }

  await afterWrite();
  return { status: "saved", message: "Slide updated." };
}

export async function setHeroMediaActive(formData: FormData) {
  const { token } = await verifySession();
  const id = Number(formData.get("id"));
  const isActive = formData.get("isActive") === "true";

  if (!Number.isInteger(id) || id < 1) return;

  await apiFetch(`/api/admin/hero/${id}`, {
    method: "PATCH",
    token,
    body: { isActive },
  });

  await afterWrite();
}

export async function deleteHeroMedia(formData: FormData) {
  const { token } = await verifySession();
  const id = Number(formData.get("id"));

  if (!Number.isInteger(id) || id < 1) return;

  await apiFetch(`/api/admin/hero/${id}`, { method: "DELETE", token });

  await afterWrite();
}

export async function reorderHeroMedia(formData: FormData) {
  const { token } = await verifySession();

  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map(Number)
    .filter((value) => Number.isInteger(value) && value > 0);

  if (ids.length === 0) return;

  await apiFetch("/api/admin/hero/reorder", {
    method: "POST",
    token,
    body: { ids },
  });

  await afterWrite();
}

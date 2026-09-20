"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/admin/dal";
import { apiFetch } from "@/lib/api/client";

import { revalidatePublicReviews } from "./revalidate-web";

const STATUSES = new Set(["pending", "approved", "hidden"]);

/** The dashboard list, then the public site's cached reviews. */
async function afterWrite() {
  revalidatePath("/reviews");
  await revalidatePublicReviews();
}

export async function setReviewStatus(formData: FormData) {
  const { token } = await verifySession();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "");

  if (!Number.isInteger(id) || id < 1 || !STATUSES.has(status)) return;

  await apiFetch(`/api/admin/reviews/${id}`, {
    method: "PATCH",
    token,
    body: { status },
  });

  await afterWrite();
}

export async function deleteReview(formData: FormData) {
  const { token } = await verifySession();
  const id = Number(formData.get("id"));

  if (!Number.isInteger(id) || id < 1) return;

  await apiFetch(`/api/admin/reviews/${id}`, { method: "DELETE", token });

  await afterWrite();
}

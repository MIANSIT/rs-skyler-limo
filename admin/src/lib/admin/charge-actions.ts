"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/admin/dal";
import { ApiRequestError, apiFetch } from "@/lib/api/client";

import type { FormState } from "./actions";

/**
 * Extra charges on a booking. Amounts are typed in dollars and sent in cents;
 * the API decides what is valid and never sees a float.
 */

function refresh(id: number) {
  revalidatePath(`/bookings/${id}`);
  revalidatePath("/bookings");
}

function failure(error: unknown): FormState {
  if (error instanceof ApiRequestError) return { error: error.failure.message };
  throw error;
}

export async function addBookingCharge(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { token } = await verifySession();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) return { error: "Unknown booking." };

  const title = String(formData.get("title") ?? "").trim();
  const raw = String(formData.get("amount") ?? "").replace(/[$,\s]/g, "");
  if (!title) return { error: "Say what the charge is for." };
  if (!/^\d+(\.\d{1,2})?$/.test(raw) || Number(raw) <= 0) {
    return { error: "Enter an amount like 25 or 37.50." };
  }

  try {
    await apiFetch(`/api/admin/bookings/${id}/charges`, {
      method: "POST",
      token,
      body: { title, amountCents: Math.round(Number(raw) * 100) },
    });
  } catch (error) {
    return failure(error);
  }

  refresh(id);
  return undefined;
}

/** One button per row: mark paid, mark unpaid, or remove. */
export async function changeBookingCharge(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { token } = await verifySession();
  const id = Number(formData.get("id"));
  const chargeId = Number(formData.get("chargeId"));
  if (!Number.isInteger(id) || id < 1 || !Number.isInteger(chargeId) || chargeId < 1) {
    return { error: "Unknown charge." };
  }

  const intent = String(formData.get("intent") ?? "");
  try {
    if (intent === "remove") {
      await apiFetch(`/api/admin/bookings/${id}/charges/${chargeId}`, { method: "DELETE", token });
    } else if (intent === "paid" || intent === "unpaid") {
      await apiFetch(`/api/admin/bookings/${id}/charges/${chargeId}`, {
        method: "PATCH",
        token,
        body: { paid: intent === "paid" },
      });
    } else {
      return { error: "Nothing to change." };
    }
  } catch (error) {
    return failure(error);
  }

  refresh(id);
  return undefined;
}

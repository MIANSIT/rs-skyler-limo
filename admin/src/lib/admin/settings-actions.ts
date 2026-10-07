"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/admin/dal";
import { ApiRequestError, apiFetch } from "@/lib/api/client";

import { revalidatePublicFleet } from "./revalidate-web";

export type SettingsFormState =
  | { status: "idle" }
  | { status: "error"; message: string; fields?: Record<string, string> }
  | { status: "saved"; message: string };

/**
 * Saves the default sales-tax rate. Only orders made from now on take it:
 * every existing booking and quote request keeps the rate it already has.
 */
export async function saveSettings(
  _previous: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const { token } = await verifySession();
  const taxRate = String(formData.get("taxRate") ?? "").trim();

  if (taxRate === "") {
    return {
      status: "error",
      message: "Enter a tax rate.",
      fields: { taxRate: "Enter a percentage, like 8.875. Use 0 for no tax." },
    };
  }

  try {
    await apiFetch("/api/admin/settings", { method: "PUT", token, body: { taxRate } });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return { status: "error", message: error.failure.message, fields: error.failure.fields };
    }
    throw error;
  }

  revalidatePath("/settings");
  // The booking form previews the tax on a fixed fare, so the site re-reads it.
  await revalidatePublicFleet();

  return {
    status: "saved",
    message: `Saved. New bookings and quote requests are taxed at ${Number(taxRate)}%. Existing ones keep their own rate.`,
  };
}

"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/admin/dal";
import { ApiRequestError, apiFetch } from "@/lib/api/client";

import { revalidatePublicFleet } from "./revalidate-web";

export type AirportFormState =
  | { status: "idle" }
  | { status: "error"; message: string; fields?: Record<string, string> }
  | { status: "saved"; message: string };

function toFormState(error: unknown): AirportFormState {
  if (error instanceof ApiRequestError) {
    return {
      status: "error",
      message: error.failure.message,
      fields: error.failure.fields,
    };
  }
  throw error;
}

/** The rate grid and the public booking form both list airports. */
async function afterWrite() {
  revalidatePath("/airports");
  revalidatePath("/rates");
  await revalidatePublicFleet();
}

export async function createAirport(
  _previous: AirportFormState,
  formData: FormData,
): Promise<AirportFormState> {
  const { token } = await verifySession();

  try {
    await apiFetch("/api/admin/airports", {
      method: "POST",
      token,
      body: {
        code: String(formData.get("code") ?? ""),
        name: String(formData.get("name") ?? ""),
        isActive: formData.get("isActive") === "on",
      },
    });
  } catch (error) {
    return toFormState(error);
  }

  await afterWrite();
  return {
    status: "saved",
    message: "Airport added. Set its fares on the Rates page.",
  };
}

export async function updateAirport(
  _previous: AirportFormState,
  formData: FormData,
): Promise<AirportFormState> {
  const { token } = await verifySession();
  const code = String(formData.get("code") ?? "");

  try {
    await apiFetch(`/api/admin/airports/${encodeURIComponent(code)}`, {
      method: "PATCH",
      token,
      body: {
        name: String(formData.get("name") ?? ""),
        isActive: formData.get("isActive") === "on",
      },
    });
  } catch (error) {
    return toFormState(error);
  }

  await afterWrite();
  return { status: "saved", message: "Saved." };
}

export async function deleteAirport(
  _previous: AirportFormState,
  formData: FormData,
): Promise<AirportFormState> {
  const { token } = await verifySession();
  const code = String(formData.get("code") ?? "");

  try {
    await apiFetch(`/api/admin/airports/${encodeURIComponent(code)}`, {
      method: "DELETE",
      token,
    });
  } catch (error) {
    // Written for the operator (e.g. "on 3 bookings, hide it instead").
    return toFormState(error);
  }

  await afterWrite();
  return { status: "saved", message: `${code} deleted.` };
}

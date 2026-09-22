"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/admin/dal";
import { ApiRequestError, apiFetch } from "@/lib/api/client";

import { revalidatePublicFleet } from "./revalidate-web";

export type PricingFormState =
  | { status: "idle" }
  | { status: "error"; message: string; fields?: Record<string, string> }
  | { status: "saved"; message: string };

function toFormState(error: unknown): PricingFormState {
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
 * Dollars as typed by an operator, to integer cents.
 *
 * An empty cell is `null`, which clears the rate — that combination then falls
 * back to a quote. That is different from zero, which would publish a free
 * fare, so the two are kept distinct rather than collapsed with `|| 0`.
 */
function toCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;

  return Math.round(value * 100);
}

export async function saveAirportRates(
  _previous: PricingFormState,
  formData: FormData,
): Promise<PricingFormState> {
  const { token } = await verifySession();

  // Each cell posts as `rate:<AIRPORT>:<vehicleId>`.
  const rates: {
    airportCode: string;
    vehicleId: number;
    priceCents: number | null;
  }[] = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("rate:")) continue;

    const [, airportCode, vehicleId] = key.split(":");
    if (!airportCode || !vehicleId) continue;

    rates.push({
      airportCode,
      vehicleId: Number(vehicleId),
      priceCents: toCents(String(value)),
    });
  }

  if (rates.length === 0) {
    return { status: "error", message: "Nothing to save." };
  }

  try {
    await apiFetch("/api/admin/rates", { method: "PUT", token, body: { rates } });
  } catch (error) {
    return toFormState(error);
  }

  revalidatePath("/rates");
  // The booking form reads the published rates, so the site needs to know.
  await revalidatePublicFleet();

  return {
    status: "saved",
    message: "Rates saved. The booking form is quoting them now.",
  };
}

/**
 * The regional reference card. Unlike `saveAirportRates`, nothing here is read
 * by the booking form or `decideFare` — it exists so staff pricing a quote by
 * hand have the client's own numbers in front of them, so no revalidation of
 * the public site is needed.
 */
export async function saveZoneRates(
  _previous: PricingFormState,
  formData: FormData,
): Promise<PricingFormState> {
  const { token } = await verifySession();

  // Each cell posts as `zone-rate:<AIRPORT>:<zoneKey>:<vehicleId>`.
  const rates: {
    airportCode: string;
    zoneKey: string;
    vehicleId: number;
    priceCents: number | null;
  }[] = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("zone-rate:")) continue;

    const [, airportCode, zoneKey, vehicleId] = key.split(":");
    if (!airportCode || !zoneKey || !vehicleId) continue;

    rates.push({
      airportCode,
      zoneKey,
      vehicleId: Number(vehicleId),
      priceCents: toCents(String(value)),
    });
  }

  if (rates.length === 0) {
    return { status: "error", message: "Nothing to save." };
  }

  try {
    await apiFetch("/api/admin/zone-rates", { method: "PUT", token, body: { rates } });
  } catch (error) {
    return toFormState(error);
  }

  revalidatePath("/rates");

  return { status: "saved", message: "Reference rates saved." };
}

export async function sendQuote(
  _previous: PricingFormState,
  formData: FormData,
): Promise<PricingFormState> {
  const { token } = await verifySession();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) {
    return { status: "error", message: "Unknown booking." };
  }

  const totalCents = toCents(String(formData.get("total") ?? ""));
  if (totalCents === null) {
    return {
      status: "error",
      message: "Enter the fare you are quoting.",
      fields: { total: "Enter an amount in dollars." },
    };
  }

  try {
    await apiFetch(`/api/admin/bookings/${id}/quote`, {
      method: "POST",
      token,
      body: { totalCents, note: String(formData.get("note") ?? "").trim() || null },
    });
  } catch (error) {
    return toFormState(error);
  }

  revalidatePath(`/bookings/${id}`);
  revalidatePath("/bookings");
  revalidatePath("/");

  return {
    status: "saved",
    message:
      "Quote recorded. The customer can see it on the tracking page — call or email them to confirm.",
  };
}

"use server";

import { headers } from "next/headers";

import { ApiRequestError, apiFetch } from "@/lib/api/client";
import type { TrackedBooking } from "@/lib/api/types";

import { newYorkToIso } from "./new-york-time";

export type BookingFormState =
  | { status: "idle" }
  | { status: "success"; reference: string }
  | {
      status: "error";
      message: string;
      /** Field-level messages, keyed by the API's field name. */
      fields?: Record<string, string>;
      /**
       * What the customer typed, keyed by input name. React blanks a form's
       * uncontrolled fields once its action resolves, and a booking form that
       * empties itself on a rejected phone number loses the booking.
       */
      values: Record<string, string>;
    };

/**
 * The customer's own IP, so the API's rate limiter sees them rather than this
 * server — otherwise every visitor shares one bucket and the first busy hour
 * locks the booking form for everyone.
 */
async function callerIp(): Promise<string | undefined> {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || undefined;
}

export async function submitBooking(
  _previous: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const text = (key: string) => String(formData.get(key) ?? "").trim();

  // Echoed back on any failure so the customer never retypes the form.
  const values = Object.fromEntries(
    [
      "pickup",
      "destination",
      "date",
      "time",
      "flight",
      "passengers",
      "bags",
      "name",
      "phone",
      "email",
      "notes",
    ].map((key) => [key, text(key)]),
  );

  const pickupAt = newYorkToIso(text("date"), text("time"));
  if (!pickupAt) {
    return {
      status: "error",
      message: "Check the date and time.",
      fields: { pickupAt: "Enter a date and a time." },
      values,
    };
  }

  const flightNumber = text("flight");
  const tripType = text("tripType");

  try {
    const result = await apiFetch<{ reference: string }>("/api/bookings", {
      method: "POST",
      forwardedFor: await callerIp(),
      body: {
        tripType,
        pickup: text("pickup"),
        destination: text("destination"),
        pickupAt,
        passengers: Number(text("passengers") || 1),
        bags: Number(text("bags") || 0),
        vehicleClass: text("vehicle"),
        // Only meaningful on an airport run; the field is disabled otherwise.
        flightNumber: tripType === "airport" && flightNumber ? flightNumber : null,
        customerName: text("name"),
        customerEmail: text("email"),
        customerPhone: text("phone"),
        notes: text("notes") || null,
        quotedTotalCents: Number(text("quotedTotalCents")) || null,
      },
    });

    return { status: "success", reference: result.reference };
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return {
        status: "error",
        message: error.failure.message,
        fields: error.failure.fields,
        values,
      };
    }
    throw error;
  }
}

export type TrackState =
  | { status: "idle" }
  | { status: "found"; booking: TrackedBooking }
  /** `reference` is echoed back for the same reason the booking form echoes. */
  | { status: "error"; message: string; reference: string };

export async function trackBooking(
  _previous: TrackState,
  formData: FormData,
): Promise<TrackState> {
  const reference = String(formData.get("reference") ?? "")
    .trim()
    .toUpperCase();

  if (!reference) {
    return {
      status: "error",
      message: "Enter your booking reference.",
      reference,
    };
  }

  try {
    const booking = await apiFetch<TrackedBooking>(
      `/api/track/${encodeURIComponent(reference)}`,
      { forwardedFor: await callerIp() },
    );

    return { status: "found", booking };
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return { status: "error", message: error.failure.message, reference };
    }
    throw error;
  }
}

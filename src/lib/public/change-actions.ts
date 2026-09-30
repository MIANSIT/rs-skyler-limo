"use server";

import { headers } from "next/headers";

import { ApiRequestError, apiFetch } from "@/lib/api/client";
import type {
  ChangeableBooking,
  ChangeableQuote,
  FieldChange,
  ProposedFare,
} from "@/lib/api/types";

import { newYorkToIso } from "./new-york-time";

/**
 * Customers changing their own booking or quote request from /track.
 *
 * One action and one state, stepped: start → code → edit → (confirm) → saved.
 * `reference` and `phone` ride along as hidden fields on every step, exactly
 * as the lookup used them. The token from a correct code lives in the state;
 * the API re-checks all three on every call, so nothing here is trusted.
 */

type Values = Record<string, string>;

export type ChangeState =
  | { step: "start"; error?: string }
  | {
      step: "code";
      maskedEmail: string;
      expiresInMinutes: number;
      resendAfterSeconds: number;
      /** When the code was sent, for the resend countdown. */
      sentAt: number;
      error?: string;
      notice?: string;
    }
  | {
      step: "edit";
      token: string;
      details: ChangeableBooking | ChangeableQuote;
      /** What the customer typed, restored after a rejected save. */
      values?: Values;
      error?: string;
      fields?: Record<string, string>;
      /** Bumped per rejected save so the form remounts with `values`. */
      attempt: number;
    }
  | {
      step: "confirm-fare";
      token: string;
      details: ChangeableBooking;
      values: Values;
      fare: ProposedFare;
      /** `totalCents` includes `taxCents`, as on every price the API returns. */
      previous: { pricingMode: "fixed" | "quote"; totalCents: number | null; taxCents: number };
      error?: string;
    }
  | {
      step: "confirm-price-reset";
      token: string;
      details: ChangeableQuote;
      values: Values;
      agreedPriceCents: number;
      error?: string;
    }
  | {
      step: "saved";
      kind: "booking" | "quote";
      changes: FieldChange[];
      status: string;
      statusChanged: boolean;
      phoneChanged: boolean;
    };

async function callerIp(): Promise<string | undefined> {
  const list = await headers();
  return list.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
}

const BOOKING_FIELDS = [
  "date", "time", "pickup", "destination", "pickupPlaceId", "destinationPlaceId",
  "placesSessionToken", "passengers", "bags", "childSeats", "vehicle", "airline",
  "flight", "notes", "name", "customerPhone",
];
const QUOTE_FIELDS = ["eventDate", "passengers", "company", "name", "customerPhone", "details"];

function readValues(formData: FormData, keys: string[]): Values {
  return Object.fromEntries(keys.map((key) => [key, String(formData.get(key) ?? "").trim()]));
}

function bookingBody(values: Values, pickupAt: string) {
  return {
    pickupAt,
    pickup: values.pickup,
    destination: values.destination,
    pickupPlaceId: values.pickupPlaceId || null,
    destinationPlaceId: values.destinationPlaceId || null,
    placesSessionToken: values.placesSessionToken || null,
    passengers: Number(values.passengers || 1),
    bags: Number(values.bags || 0),
    childSeats: Number(values.childSeats || 0),
    vehicleClass: values.vehicle,
    airline: values.airline || null,
    flightNumber: values.flight || null,
    notes: values.notes || null,
    customerName: values.name,
    customerPhone: values.customerPhone,
  };
}

function quoteBody(values: Values) {
  return {
    eventDate: values.eventDate || null,
    passengers: values.passengers ? Number(values.passengers) : null,
    company: values.company || null,
    customerName: values.name,
    customerPhone: values.customerPhone,
    details: values.details,
  };
}

type SaveResponse =
  | { outcome: "saved"; reference: string; status: string; statusChanged: boolean; changes: FieldChange[] }
  | {
      outcome: "confirm-fare";
      fare: ProposedFare;
      previous: { pricingMode: "fixed" | "quote"; totalCents: number | null; taxCents: number };
    }
  | { outcome: "confirm-price-reset"; agreedPriceCents: number };

export async function changeStep(previous: ChangeState, formData: FormData): Promise<ChangeState> {
  const intent = String(formData.get("intent") ?? "");
  const reference = String(formData.get("reference") ?? "").trim().toUpperCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const forwardedFor = await callerIp();

  /* ---- Leave the flow ---- */
  if (intent === "cancel") return { step: "start" };

  /* ---- Email a code (first time, or again) ---- */
  if (intent === "send-code") {
    try {
      const sent = await apiFetch<{ maskedEmail: string; expiresInMinutes: number; resendAfterSeconds: number }>(
        "/api/change/code",
        { method: "POST", forwardedFor, body: { reference, phone } },
      );
      return {
        step: "code",
        ...sent,
        sentAt: Date.now(),
        notice: previous.step === "code" ? "We have sent a new code. Only the newest one works." : undefined,
      };
    } catch (error) {
      if (!(error instanceof ApiRequestError)) throw error;
      // A refused resend keeps the customer on the code screen.
      return previous.step === "code"
        ? { ...previous, error: error.failure.message, notice: undefined }
        : { step: "start", error: error.failure.message };
    }
  }

  /* ---- Check the code ---- */
  if (intent === "verify" && previous.step === "code") {
    const code = String(formData.get("code") ?? "").replace(/\D/g, "");
    if (code.length !== 6) {
      return { ...previous, error: "Enter the 6-digit code from the email.", notice: undefined };
    }
    try {
      const verified = await apiFetch<{ token: string; details: ChangeableBooking | ChangeableQuote }>(
        "/api/change/verify",
        { method: "POST", forwardedFor, body: { reference, phone, code } },
      );
      return { step: "edit", token: verified.token, details: verified.details, attempt: 0 };
    } catch (error) {
      if (!(error instanceof ApiRequestError)) throw error;
      return { ...previous, error: error.failure.message, notice: undefined };
    }
  }

  /* ---- Back from a confirmation to the form, keeping what was typed ---- */
  if (intent === "back" && (previous.step === "confirm-fare" || previous.step === "confirm-price-reset")) {
    return { step: "edit", token: previous.token, details: previous.details, values: previous.values, attempt: 1 };
  }

  /* ---- Save (from the form, or after confirming) ---- */
  const confirming = intent === "confirm" && (previous.step === "confirm-fare" || previous.step === "confirm-price-reset");
  if ((intent === "save" && previous.step === "edit") || confirming) {
    const state = previous as Extract<ChangeState, { token: string }>;
    const details = state.details;
    const values =
      confirming && "values" in state && state.values
        ? state.values
        : readValues(formData, details.kind === "booking" ? BOOKING_FIELDS : QUOTE_FIELDS);
    const attempt = (state.step === "edit" ? state.attempt : 0) + 1;
    const backToForm = (message: string, fields?: Record<string, string>): ChangeState => ({
      step: "edit",
      token: state.token,
      details,
      values,
      error: message,
      fields,
      attempt,
    });

    let body: Record<string, unknown>;
    if (details.kind === "booking") {
      const pickupAt = newYorkToIso(values.date ?? "", values.time ?? "");
      if (!pickupAt) return backToForm("Check the date and time.", { pickupAt: "Enter a date and a time." });
      body = {
        ...bookingBody(values, pickupAt),
        ...(confirming && state.step === "confirm-fare"
          ? { acceptedFare: { pricingMode: state.fare.pricingMode, totalCents: state.fare.totalCents } }
          : {}),
      };
    } else {
      body = { ...quoteBody(values), ...(confirming ? { acceptPriceReset: true } : {}) };
    }

    let result: SaveResponse;
    try {
      result = await apiFetch<SaveResponse>(
        details.kind === "booking" ? "/api/change/booking" : "/api/change/quote",
        { method: "POST", forwardedFor, body: { reference, phone, token: state.token, ...body } },
      );
    } catch (error) {
      if (!(error instanceof ApiRequestError)) throw error;
      // The session ran out or was spent: start again rather than show a form
      // that can no longer be saved.
      if (error.failure.status === 401) return { step: "start", error: error.failure.message };
      return backToForm(error.failure.message, error.failure.fields);
    }

    if (result.outcome === "confirm-fare" && details.kind === "booking") {
      return { step: "confirm-fare", token: state.token, details, values, fare: result.fare, previous: result.previous };
    }
    if (result.outcome === "confirm-price-reset" && details.kind === "quote") {
      return { step: "confirm-price-reset", token: state.token, details, values, agreedPriceCents: result.agreedPriceCents };
    }
    if (result.outcome === "saved") {
      return {
        step: "saved",
        kind: details.kind,
        changes: result.changes,
        status: result.status,
        statusChanged: result.statusChanged,
        phoneChanged: result.changes.some((change) => change.label === "Phone"),
      };
    }
  }

  return { step: "start", error: "Something went out of step. Start again." };
}

"use server";

import { headers } from "next/headers";

import { ApiRequestError, apiFetch } from "@/lib/api/client";
import type { PricingMode, TrackedBooking } from "@/lib/api/types";

import { newYorkToIso } from "./new-york-time";

export type BookingFormState =
  | { status: "idle" }
  | {
      status: "success";
      reference: string;
      pricingMode: PricingMode;
      /** Present only on a fixed-fare booking. */
      quotedTotalCents: number | null;
    }
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
      /**
       * Increments on every rejected submission. The form uses it as a React
       * `key` so the subtree remounts and the restored `defaultValue`s take
       * effect — a changed `defaultValue` alone does not move an input that is
       * already mounted.
       */
      attempt: number;
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
      "airline",
      "serviceType",
      "passengers",
      "bags",
      "childSeats",
      "name",
      "phone",
      "email",
      "notes",
    ].map((key) => [key, text(key)]),
  );
  values.terms = formData.get("terms") === "on" ? "on" : "";

  // Bumped once per rejected submission; the form keys off it to remount and
  // pick up the restored values.
  const attempt = (_previous.status === "error" ? _previous.attempt : 0) + 1;

  // Checked here, not only by the `required` attribute on the box. A Server
  // Action is a public endpoint: anything the browser enforces, the server has
  // to enforce again. Consent to the terms is the last thing that should rest
  // on an attribute a caller can simply omit.
  if (formData.get("terms") !== "on") {
    return {
      status: "error",
      message: "Accept the terms to continue.",
      fields: { terms: "Please accept the terms and conditions." },
      values,
      attempt,
    };
  }

  const pickupAt = newYorkToIso(text("date"), text("time"));
  if (!pickupAt) {
    return {
      status: "error",
      message: "Check the date and time.",
      fields: { pickupAt: "Enter a date and a time." },
      values,
      attempt,
    };
  }

  const flightNumber = text("flight");
  const tripType = text("tripType");

  try {
    const isAirport = tripType === "airport";

    /**
     * On an airport run only one end is an address — the other is the airport
     * itself, so it is filled in here rather than asked for twice.
     */
    const airportCode = text("airportCode");
    const airportDirection = text("airportDirection");
    const airportLabel = airportCode ? `${airportCode} Airport` : "Airport";

    const pickup = isAirport
      ? airportDirection === "to-airport"
        ? text("pickup")
        : airportLabel
      : text("pickup");

    const destination = isAirport
      ? airportDirection === "to-airport"
        ? airportLabel
        : text("destination")
      : text("destination");

    const result = await apiFetch<{
      reference: string;
      pricingMode: PricingMode;
      quotedTotalCents: number | null;
    }>("/api/bookings", {
      method: "POST",
      forwardedFor: await callerIp(),
      body: {
        tripType,
        pickup,
        destination,
        pickupAt,
        passengers: Number(text("passengers") || 1),
        bags: Number(text("bags") || 0),
        childSeats: Number(text("childSeats") || 0),
        vehicleClass: text("vehicle"),
        serviceType: text("serviceType") || "personal",
        airline: isAirport && text("airline") ? text("airline") : null,
        flightNumber: isAirport && flightNumber ? flightNumber : null,
        airportCode: isAirport && airportCode ? airportCode : null,
        airportDirection: isAirport && airportDirection ? airportDirection : null,
        // The server re-resolves these; it does not trust a typed address.
        pickupPlaceId: text("pickupPlaceId") || null,
        destinationPlaceId: text("destinationPlaceId") || null,
        statedBorough: text("statedBorough") || null,
        placesSessionToken: text("placesSessionToken") || null,
        customerName: text("name"),
        customerEmail: text("email"),
        customerPhone: text("phone"),
        notes: text("notes") || null,
      },
    });

    return {
      status: "success",
      reference: result.reference,
      pricingMode: result.pricingMode,
      quotedTotalCents: result.quotedTotalCents,
    };
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return {
        status: "error",
        message: error.failure.message,
        fields: error.failure.fields,
        values,
        attempt,
      };
    }
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* Quote requests                                                             */
/* -------------------------------------------------------------------------- */

export type QuoteFormState =
  | { status: "idle" }
  | { status: "success"; reference: string }
  | {
      status: "error";
      message: string;
      fields?: Record<string, string>;
      /** Echoed back for the same reason the booking form echoes: see above. */
      values: Record<string, string>;
      attempt: number;
    };

/**
 * The public end of the quote pipeline.
 *
 * `POST /api/quotes`, the `quotes` table and the dashboard's Quotes screens all
 * existed before this did — the back half was finished and nothing on the site
 * ever called it. Every "request a quote" surface now routes through here.
 */
export async function submitQuote(
  _previous: QuoteFormState,
  formData: FormData,
): Promise<QuoteFormState> {
  const text = (key: string) => String(formData.get(key) ?? "").trim();

  const values = Object.fromEntries(
    [
      "serviceType",
      "eventDate",
      "passengers",
      "company",
      "name",
      "phone",
      "email",
      "details",
    ].map((key) => [key, text(key)]),
  );

  const attempt = (_previous.status === "error" ? _previous.attempt : 0) + 1;

  const passengers = text("passengers");

  try {
    const result = await apiFetch<{ reference: string; status: string }>(
      "/api/quotes",
      {
        method: "POST",
        forwardedFor: await callerIp(),
        body: {
          serviceType: text("serviceType") || "other",
          // Empty strings would fail the API's date and integer parsing, so an
          // untouched optional field is sent as an absent one.
          eventDate: text("eventDate") || null,
          passengers: passengers ? Number(passengers) : null,
          company: text("company") || null,
          customerName: text("name"),
          customerEmail: text("email"),
          customerPhone: text("phone"),
          details: text("details"),
        },
      },
    );

    return { status: "success", reference: result.reference };
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return {
        status: "error",
        message: error.failure.message,
        fields: error.failure.fields,
        values,
        attempt,
      };
    }
    throw error;
  }
}

export type TrackState =
  | { status: "idle" }
  | { status: "found"; booking: TrackedBooking }
  /** Both values are echoed for the same reason the booking form echoes. */
  | { status: "error"; message: string; reference: string; phone: string };

export async function trackBooking(
  _previous: TrackState,
  formData: FormData,
): Promise<TrackState> {
  const reference = String(formData.get("reference") ?? "")
    .trim()
    .toUpperCase();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!reference || !phone) {
    return {
      status: "error",
      message: "Enter your reference and the phone number on the booking.",
      reference,
      phone,
    };
  }

  try {
    const booking = await apiFetch<TrackedBooking>("/api/track", {
      method: "POST",
      forwardedFor: await callerIp(),
      body: { reference, phone },
    });

    return { status: "found", booking };
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return { status: "error", message: error.failure.message, reference, phone };
    }
    throw error;
  }
}

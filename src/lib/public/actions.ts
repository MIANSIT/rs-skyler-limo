"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ApiRequestError, apiFetch } from "@/lib/api/client";
import type {
  PaymentMethod,
  PricingMode,
  TrackedBooking,
  TrackedQuote,
} from "@/lib/api/types";

import { newYorkToIso } from "./new-york-time";

export type BookingFormState =
  | { status: "idle" }
  | {
      status: "success";
      reference: string;
      pricingMode: PricingMode;
      /** Present only on a fixed-fare booking. Sales tax included. */
      quotedTotalCents: number | null;
      /** The sales tax inside it. */
      taxCents: number;
      paymentMethod: PaymentMethod;
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

/**
 * The anti-spam fields every public form carries (see `FormGuard`). Passed on to
 * the API untouched: this layer neither judges them nor can be trusted to.
 */
function guardFields(formData: FormData) {
  return {
    formToken: String(formData.get("formToken") ?? ""),
    website: String(formData.get("website") ?? ""),
  };
}

/** Asked for by a form when it loads, so the API can tell how long it was open. */
export async function issueFormToken(): Promise<string> {
  const { token } = await apiFetch<{ token: string }>("/api/form-token", {
    forwardedFor: await callerIp(),
  });
  return token;
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
      "serviceTypeOther",
      "paymentMethod",
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

  // "Other" asks the customer to say what for. There is no column for it, so
  // it leads the notes — which the office reads on the booking and in email.
  const serviceType = text("serviceType") || "personal";
  const purpose = serviceType === "other" ? text("serviceTypeOther").slice(0, 120) : "";
  const notes = [purpose && `Purpose: ${purpose}`, text("notes")]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 5000);

  // Set when the API opened a Stripe payment page for this booking. The
  // redirect happens after the try: `redirect` works by throwing, and the
  // catch below would otherwise swallow it.
  let checkoutUrl: string | null = null;

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
      // Null for a fixed fare: the booking is created only once it is paid.
      reference: string | null;
      pricingMode: PricingMode;
      quotedTotalCents: number | null;
      taxCents: number;
      checkoutUrl: string | null;
    }>("/api/bookings", {
      method: "POST",
      forwardedFor: await callerIp(),
      body: {
        tripType,
        ...guardFields(formData),
        pickup,
        destination,
        pickupAt,
        passengers: Number(text("passengers") || 1),
        bags: Number(text("bags") || 0),
        childSeats: Number(text("childSeats") || 0),
        vehicleClass: text("vehicle"),
        serviceType,
        paymentMethod: "card",
        airline: isAirport && text("airline") ? text("airline") : null,
        flightNumber: isAirport && flightNumber ? flightNumber : null,
        airportCode: isAirport && airportCode ? airportCode : null,
        airportDirection: isAirport && airportDirection ? airportDirection : null,
        // The server re-resolves these; it does not trust a typed address.
        pickupPlaceId: text("pickupPlaceId") || null,
        destinationPlaceId: text("destinationPlaceId") || null,
        placesSessionToken: text("placesSessionToken") || null,
        customerName: text("name"),
        customerEmail: text("email"),
        customerPhone: text("phone"),
        notes: notes || null,
      },
    });

    checkoutUrl = result.checkoutUrl;

    if (!checkoutUrl && result.reference) {
      return {
        status: "success",
        reference: result.reference,
        pricingMode: result.pricingMode,
        quotedTotalCents: result.quotedTotalCents,
        taxCents: result.taxCents,
        paymentMethod: "card",
      };
    }
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

  // Only a Stripe-hosted page is ever a redirect target from here.
  if (!checkoutUrl?.startsWith("https://checkout.stripe.com/")) {
    throw new Error("Unexpected payment URL from the API.");
  }
  redirect(checkoutUrl);
}

/* -------------------------------------------------------------------------- */
/* Quote requests                                                            */
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
      "serviceTypeOther",
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

  // As on a booking: "Other" says what for, and it leads the details.
  const serviceType = text("serviceType") || "other";
  const purpose = serviceType === "other" ? text("serviceTypeOther").slice(0, 120) : "";
  const details = [purpose && `Purpose: ${purpose}`, text("details")]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 5000);

  try {
    const result = await apiFetch<{ reference: string; status: string }>(
      "/api/quotes",
      {
        method: "POST",
        forwardedFor: await callerIp(),
        body: {
          serviceType,
        ...guardFields(formData),
          // Empty strings would fail the API's date and integer parsing, so an
          // untouched optional field is sent as an absent one.
          eventDate: text("eventDate") || null,
          passengers: passengers ? Number(passengers) : null,
          company: text("company") || null,
          customerName: text("name"),
          customerEmail: text("email"),
          customerPhone: text("phone"),
          details,
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
  /** `phone` is kept so "pay by card" can repeat the same two-factor check. */
  | { status: "found"; booking: TrackedBooking; phone: string }
  | { status: "found-quote"; quote: TrackedQuote; phone: string }
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
    const found = await apiFetch<TrackedBooking | TrackedQuote>("/api/track", {
      method: "POST",
      forwardedFor: await callerIp(),
      body: { reference, phone },
    });

    return found.kind === "quote"
      ? { status: "found-quote", quote: found, phone }
      : { status: "found", booking: found, phone };
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return { status: "error", message: error.failure.message, reference, phone };
    }
    throw error;
  }
}

/**
 * "Pay by card" from the tracking page. Asks the API for a Stripe payment page
 * with the same reference and phone the lookup used, then sends the customer
 * there. Returns only on failure.
 */
export async function payBooking(
  _previous: string | null,
  formData: FormData,
): Promise<string | null> {
  const reference = String(formData.get("reference") ?? "").trim().toUpperCase();
  const phone = String(formData.get("phone") ?? "").trim();

  let url: string;
  try {
    ({ url } = await apiFetch<{ url: string }>("/api/payments/checkout", {
      method: "POST",
      forwardedFor: await callerIp(),
      body: { reference, phone },
    }));
  } catch (error) {
    if (error instanceof ApiRequestError) return error.failure.message;
    throw error;
  }

  if (!url.startsWith("https://checkout.stripe.com/")) {
    return "Card payment is not available right now. Email us to pay.";
  }
  redirect(url);
}

/**
 * "Pay securely" on a payment-link page. The API re-checks the signed token
 * before opening a Stripe page for the booking's stored fare; the browser
 * sends nothing about the amount. Returns only on failure.
 */
export async function payWithLink(
  _previous: string | null,
  formData: FormData,
): Promise<string | null> {
  const reference = String(formData.get("reference") ?? "").trim().toUpperCase();
  const token = String(formData.get("token") ?? "").trim();

  let url: string;
  try {
    ({ url } = await apiFetch<{ url: string }>("/api/payments/link/checkout", {
      method: "POST",
      forwardedFor: await callerIp(),
      body: { reference, token },
    }));
  } catch (error) {
    if (error instanceof ApiRequestError) return error.failure.message;
    throw error;
  }

  if (!url.startsWith("https://checkout.stripe.com/")) {
    return "Card payment is not available right now. Email us to pay.";
  }
  redirect(url);
}

/* -------------------------------------------------------------------------- */
/* Reviews                                                                    */
/* -------------------------------------------------------------------------- */

export type ReviewFormState =
  | { status: "idle" }
  | {
      status: "success";
      /** Google's review form, when the business has a Place ID configured. */
      googleReviewUrl: string | null;
    }
  | {
      status: "error";
      message: string;
      fields?: Record<string, string>;
      /** Echoed back so a rejected review is never retyped. */
      values: Record<string, string>;
      attempt: number;
    };

export async function submitReview(
  _previous: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const text = (key: string) => String(formData.get(key) ?? "").trim();

  const values = Object.fromEntries(
    ["reference", "phone", "rating", "comment", "displayName"].map((key) => [
      key,
      text(key),
    ]),
  );
  const attempt = (_previous.status === "error" ? _previous.attempt : 0) + 1;

  try {
    const result = await apiFetch<{ googleReviewUrl: string | null }>(
      "/api/reviews",
      {
        method: "POST",
        forwardedFor: await callerIp(),
        body: {
          reference: text("reference").toUpperCase(),
          phone: text("phone"),
          rating: text("rating") || 0,
        ...guardFields(formData),
          comment: text("comment"),
          displayName: text("displayName") || null,
        },
      },
    );

    return { status: "success", googleReviewUrl: result.googleReviewUrl };
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

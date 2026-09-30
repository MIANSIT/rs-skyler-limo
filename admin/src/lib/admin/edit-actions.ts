"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { verifySession } from "@/lib/admin/dal";
import { newYorkToIso } from "@/lib/admin/new-york-time";
import { ApiRequestError, apiFetch } from "@/lib/api/client";

/**
 * Saving the booking and quote edit pages, and setting a quote's agreed price.
 *
 * The API decides what is valid; these only turn form fields into its shape.
 * A field left blank becomes `null` (cleared) where the API allows it, and a
 * money field is typed in dollars and sent in cents — the API never sees a
 * float.
 */

export type EditFormState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      /** Keyed by the API's field names, which are also the inputs' names. */
      fields?: Record<string, string>;
    };

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

/** Blank → null, so a cleared field is saved as cleared. */
const optional = (formData: FormData, key: string) => text(formData, key) || null;

/** "125" or "125.50" → 12550. Blank → null. Anything else → NaN, refused. */
function dollarsToCents(raw: string): number | null {
  if (raw === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(raw.replace(/[$,\s]/g, ""))) return Number.NaN;
  return Math.round(Number(raw.replace(/[$,\s]/g, "")) * 100);
}

function failure(error: unknown): EditFormState {
  if (error instanceof ApiRequestError) {
    return { status: "error", message: error.failure.message, fields: error.failure.fields };
  }
  throw error;
}

/* -------------------------------------------------------------------------- */
/* Bookings                                                                   */
/* -------------------------------------------------------------------------- */

export async function updateBookingDetails(
  _previous: EditFormState,
  formData: FormData,
): Promise<EditFormState> {
  const { token } = await verifySession();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) return { status: "error", message: "Unknown booking." };

  const pickupAt = newYorkToIso(text(formData, "pickupDate"), text(formData, "pickupTime"));
  if (!pickupAt) {
    return { status: "error", message: "Check the pick-up date and time.", fields: { pickupAt: "Enter a date and a time." } };
  }

  const fare = dollarsToCents(text(formData, "fare"));
  if (Number.isNaN(fare)) {
    return { status: "error", message: "Check the fare.", fields: { quotedTotalCents: "Enter an amount like 125 or 125.50." } };
  }

  const tripType = text(formData, "tripType");
  const isAirport = tripType === "airport";

  try {
    await apiFetch(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      token,
      body: {
        customerName: text(formData, "customerName"),
        customerEmail: text(formData, "customerEmail"),
        customerPhone: text(formData, "customerPhone"),
        tripType,
        pickup: text(formData, "pickup"),
        destination: text(formData, "destination"),
        pickupAt,
        passengers: Number(text(formData, "passengers") || 1),
        bags: Number(text(formData, "bags") || 0),
        childSeats: Number(text(formData, "childSeats") || 0),
        vehicleClass: text(formData, "vehicleClass"),
        serviceType: text(formData, "serviceType"),
        // An airport is only meaningful on an airport trip; switching the trip
        // type away clears it rather than leaving a stale code behind.
        airportCode: isAirport ? optional(formData, "airportCode") : null,
        airportDirection: isAirport ? optional(formData, "airportDirection") : null,
        airline: optional(formData, "airline"),
        flightNumber: optional(formData, "flightNumber"),
        customerNotes: optional(formData, "customerNotes"),
        quotedTotalCents: fare,
        paymentMethod: text(formData, "paymentMethod"),
        paymentStatus: text(formData, "paymentStatus"),
        ...(text(formData, "note") ? { note: text(formData, "note") } : {}),
      },
    });
  } catch (error) {
    return failure(error);
  }

  revalidatePath(`/bookings/${id}`);
  revalidatePath("/bookings");
  revalidatePath("/");
  redirect(`/bookings/${id}`);
}

/* -------------------------------------------------------------------------- */
/* Quote requests                                                             */
/* -------------------------------------------------------------------------- */

export async function updateQuoteDetails(
  _previous: EditFormState,
  formData: FormData,
): Promise<EditFormState> {
  const { token } = await verifySession();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) return { status: "error", message: "Unknown quote request." };

  const passengers = text(formData, "passengers");

  try {
    await apiFetch(`/api/admin/quotes/${id}`, {
      method: "PATCH",
      token,
      body: {
        serviceType: text(formData, "serviceType"),
        eventDate: optional(formData, "eventDate"),
        passengers: passengers ? Number(passengers) : null,
        company: optional(formData, "company"),
        customerName: text(formData, "customerName"),
        customerEmail: text(formData, "customerEmail"),
        customerPhone: text(formData, "customerPhone"),
        details: text(formData, "details"),
        ...(text(formData, "note") ? { note: text(formData, "note") } : {}),
      },
    });
  } catch (error) {
    return failure(error);
  }

  revalidatePath(`/quotes/${id}`);
  revalidatePath("/quotes");
  redirect(`/quotes/${id}`);
}

export type PriceFormState = EditFormState | { status: "saved"; message: string };

/**
 * Sets (or clears) the price agreed with the customer.
 *
 * Setting a price on a request still at `new` or `pending` moves it to
 * `quoted` — that is what having a price means. With the box ticked the
 * customer is emailed the price and their tracking link.
 */
export async function setQuotePrice(
  _previous: PriceFormState,
  formData: FormData,
): Promise<PriceFormState> {
  const { token } = await verifySession();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) return { status: "error", message: "Unknown quote request." };

  const cents = dollarsToCents(text(formData, "price"));
  if (Number.isNaN(cents)) {
    return { status: "error", message: "Enter an amount like 450 or 450.00.", fields: { agreedPriceCents: "Enter an amount like 450 or 450.00." } };
  }

  const status = text(formData, "currentStatus");
  const moveToQuoted = cents !== null && (status === "new" || status === "pending");
  const notify = formData.get("notify") === "on" && cents !== null;
  const method = text(formData, "paymentMethod");

  try {
    await apiFetch(`/api/admin/quotes/${id}`, {
      method: "PATCH",
      token,
      body: {
        agreedPriceCents: cents,
        ...(method === "card" || method === "cash" ? { paymentMethod: method } : {}),
        ...(moveToQuoted ? { status: "quoted" } : {}),
        notifyCustomer: notify,
      },
    });
  } catch (error) {
    return failure(error);
  }

  revalidatePath(`/quotes/${id}`);
  revalidatePath("/quotes");

  return {
    status: "saved",
    message:
      cents === null
        ? "Price cleared."
        : notify
          ? method === "card"
            ? "Price saved and emailed with a Stripe payment link."
            : "Price saved and emailed to the customer."
          : "Price saved. The customer was not emailed.",
  };
}

/* -------------------------------------------------------------------------- */
/* Payment links                                                              */
/* -------------------------------------------------------------------------- */

export type PaymentLinkState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "ready"; url: string; expiresAt: string; sent: boolean };

/**
 * Makes a signed payment link for a booking and, when the operator pressed
 * "Email it", sends it to the customer too. The link is returned either way so
 * it can be copied into a text or WhatsApp message.
 */
export async function createPaymentLink(
  _previous: PaymentLinkState,
  formData: FormData,
): Promise<PaymentLinkState> {
  const { token } = await verifySession();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) return { status: "error", message: "Unknown booking." };

  const send = formData.get("intent") === "send";
  // Bookings and quote requests share the control; `kind` picks the route.
  const kind = formData.get("kind") === "quote" ? "quotes" : "bookings";

  try {
    const result = await apiFetch<{ url: string; expiresAt: string; sent: boolean }>(
      `/api/admin/${kind}/${id}/payment-link`,
      { method: "POST", token, body: { send } },
    );
    revalidatePath(`/${kind}/${id}`);
    return { status: "ready", ...result };
  } catch (error) {
    if (error instanceof ApiRequestError) return { status: "error", message: error.failure.message };
    throw error;
  }
}

/**
 * A quote request's payment buttons — Mark paid / unpaid and switch method —
 * one field per submit, as on a booking.
 */
export async function updateQuotePayment(
  _previous: EditFormState,
  formData: FormData,
): Promise<EditFormState> {
  const { token } = await verifySession();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) return { status: "error", message: "Unknown quote request." };

  const paymentMethod = text(formData, "paymentMethod");
  const paymentStatus = text(formData, "paymentStatus");
  const body: Record<string, string> = {};
  if (paymentMethod === "card" || paymentMethod === "cash") body.paymentMethod = paymentMethod;
  if (paymentStatus === "paid" || paymentStatus === "unpaid") body.paymentStatus = paymentStatus;
  if (Object.keys(body).length === 0) return { status: "error", message: "Nothing to change." };

  try {
    await apiFetch(`/api/admin/quotes/${id}`, { method: "PATCH", token, body });
  } catch (error) {
    return failure(error);
  }

  revalidatePath(`/quotes/${id}`);
  revalidatePath("/quotes");
  return { status: "idle" };
}

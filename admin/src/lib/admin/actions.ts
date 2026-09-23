"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { verifySession } from "@/lib/admin/dal";
import {
  clearSessionCookie,
  getSessionToken,
  setSessionCookie,
} from "@/lib/admin/session";
import { ApiRequestError, apiFetch } from "@/lib/api/client";
import type { AdminUser, BookingStatus, QuoteStatus } from "@/lib/api/types";

export type FormState = { error?: string } | undefined;

/**
 * React resets a form's uncontrolled fields once its action resolves, so a
 * rejected sign-in would otherwise blank the email and make the operator type
 * it again. The address is echoed back and re-applied as a `defaultValue`.
 * The password is deliberately not echoed.
 */
export type LoginState = { error?: string; email?: string } | undefined;

export async function signIn(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password.", email };
  }

  let session: { token: string; expiresAt: string; user: AdminUser };

  try {
    session = await apiFetch<{
      token: string;
      expiresAt: string;
      user: AdminUser;
    }>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      // The API already declines to say whether it was the address or the
      // password that was wrong; pass its wording straight through.
      return { error: error.failure.message, email };
    }
    throw error;
  }

  await setSessionCookie(session.token, session.expiresAt);

  // Outside the try: `redirect` works by throwing, and catching it here would
  // swallow the navigation.
  redirect("/");
}

export async function signOut() {
  const token = await getSessionToken();

  if (token) {
    // Delete the row server-side so the token is dead even if a copy escaped,
    // but never block the sign-out on the API being reachable.
    await apiFetch("/api/auth/logout", { method: "POST", token }).catch(
      () => {},
    );
  }

  await clearSessionCookie();
  redirect("/login");
}

export async function updateBookingStatus(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { token } = await verifySession();

  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "") as BookingStatus;
  const note = String(formData.get("note") ?? "").trim();

  if (!Number.isInteger(id) || id < 1) return { error: "Unknown booking." };

  try {
    await apiFetch(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      token,
      body: {
        status,
        ...(note ? { note } : {}),
        // The box on the status form. Unticked, the change is silent.
        notifyCustomer: formData.get("notify") === "on",
      },
    });
  } catch (error) {
    if (error instanceof ApiRequestError) return { error: error.failure.message };
    throw error;
  }

  revalidatePath(`/bookings/${id}`);
  revalidatePath("/bookings");
  revalidatePath("/");

  return undefined;
}

/**
 * Payment method and paid/unpaid, one field per submit — the panel's buttons
 * each send exactly the change they name. `paid_at` is stamped by the API.
 */
export async function updateBookingPayment(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { token } = await verifySession();

  const id = Number(formData.get("id"));
  const paymentMethod = String(formData.get("paymentMethod") ?? "");
  const paymentStatus = String(formData.get("paymentStatus") ?? "");

  if (!Number.isInteger(id) || id < 1) return { error: "Unknown booking." };

  const body: Record<string, string> = {};
  if (paymentMethod === "card" || paymentMethod === "cash") {
    body.paymentMethod = paymentMethod;
  }
  if (paymentStatus === "paid" || paymentStatus === "unpaid") {
    body.paymentStatus = paymentStatus;
  }
  if (Object.keys(body).length === 0) return { error: "Nothing to change." };

  try {
    await apiFetch(`/api/admin/bookings/${id}`, { method: "PATCH", token, body });
  } catch (error) {
    if (error instanceof ApiRequestError) return { error: error.failure.message };
    throw error;
  }

  revalidatePath(`/bookings/${id}`);
  revalidatePath("/bookings");

  return undefined;
}

export async function addBookingNote(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { token } = await verifySession();

  const id = Number(formData.get("id"));
  const note = String(formData.get("note") ?? "").trim();

  if (!Number.isInteger(id) || id < 1) return { error: "Unknown booking." };
  if (!note) return { error: "Write a note first." };

  try {
    await apiFetch(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      token,
      body: { note },
    });
  } catch (error) {
    if (error instanceof ApiRequestError) return { error: error.failure.message };
    throw error;
  }

  revalidatePath(`/bookings/${id}`);
  return undefined;
}

export async function updateQuoteStatus(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { token } = await verifySession();

  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "") as QuoteStatus;
  const note = String(formData.get("note") ?? "").trim();

  if (!Number.isInteger(id) || id < 1) return { error: "Unknown quote." };

  try {
    await apiFetch(`/api/admin/quotes/${id}`, {
      method: "PATCH",
      token,
      body: {
        status,
        ...(note ? { note } : {}),
        // The box on the status form. Unticked, the change is silent.
        notifyCustomer: formData.get("notify") === "on",
      },
    });
  } catch (error) {
    if (error instanceof ApiRequestError) return { error: error.failure.message };
    throw error;
  }

  revalidatePath(`/quotes/${id}`);
  revalidatePath("/quotes");
  revalidatePath("/");

  return undefined;
}

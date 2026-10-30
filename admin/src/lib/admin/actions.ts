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
  revalidatePath("/today");

  return undefined;
}

/**
 * A New booking or quote request becomes Pending the first time an operator
 * opens it, so New means "nobody has looked". Called from a client effect after
 * the page is on screen — never from the page render, which Next also runs when
 * it prefetches a link that has only scrolled into view. Silent to the customer,
 * and logged under the operator's name. Only ever moves `new`; a booking that
 * moved on meanwhile is left alone by the status check in the API's own history.
 */
export async function markOpened(kind: "booking" | "quote", id: number): Promise<void> {
  const { token } = await verifySession();
  if (!Number.isInteger(id) || id < 1) return;

  try {
    const current = await apiFetch<{ booking?: { status: string }; quote?: { status: string } }>(
      `/api/admin/${kind === "booking" ? "bookings" : "quotes"}/${id}`,
      { token },
    );
    if ((current.booking ?? current.quote)?.status !== "new") return;

    await apiFetch(`/api/admin/${kind === "booking" ? "bookings" : "quotes"}/${id}`, {
      method: "PATCH",
      token,
      body: { status: "pending", note: "Opened by an operator.", notifyCustomer: false },
    });
  } catch (error) {
    if (error instanceof ApiRequestError) return;
    throw error;
  }

  revalidatePath(`/${kind === "booking" ? "bookings" : "quotes"}/${id}`);
  revalidatePath(kind === "booking" ? "/bookings" : "/quotes");
  revalidatePath("/");
  revalidatePath("/today");
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
  revalidatePath("/today");

  return undefined;
}

/**
 * "Mark as reviewed" on a booking or quote the customer changed. Clears the
 * tag everywhere; the change itself stays in the history.
 */
export async function markChangeReviewed(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { token } = await verifySession();

  const id = Number(formData.get("id"));
  const kind = formData.get("kind") === "quote" ? "quote" : "booking";
  if (!Number.isInteger(id) || id < 1) return { error: `Unknown ${kind}.` };

  try {
    await apiFetch(`/api/admin/${kind === "quote" ? "quotes" : "bookings"}/${id}/change-reviewed`, {
      method: "POST",
      token,
    });
  } catch (error) {
    if (error instanceof ApiRequestError) return { error: error.failure.message };
    throw error;
  }

  const base = kind === "quote" ? "/quotes" : "/bookings";
  revalidatePath(`${base}/${id}`);
  revalidatePath(base);
  revalidatePath("/");
  revalidatePath("/today");
  return undefined;
}

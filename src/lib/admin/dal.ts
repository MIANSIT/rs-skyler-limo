import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { ApiRequestError, apiFetch } from "@/lib/api/client";
import type {
  ActivityEntry,
  AdminUser,
  Booking,
  DashboardStats,
  Paginated,
  Quote,
} from "@/lib/api/types";

import { getSessionToken } from "./session";

/**
 * Every read of admin data goes through here, and every function starts by
 * verifying the session. The check lives next to the data rather than in the
 * layout: a layout does not re-render on navigation and does not stop its
 * children rendering, so a check there would not actually gate anything.
 *
 * `cache` memoises within a single render pass, so a page that shows the
 * operator's name and their bookings verifies once, not twice.
 */
export const verifySession = cache(async (): Promise<{
  token: string;
  user: AdminUser;
}> => {
  const token = await getSessionToken();
  if (!token) redirect("/admin/login");

  try {
    const { user } = await apiFetch<{ user: AdminUser }>("/api/auth/me", {
      token,
    });
    return { token, user };
  } catch (error) {
    if (error instanceof ApiRequestError && error.failure.status === 401) {
      // Expired or revoked. Send them back to sign in rather than showing a
      // dashboard-shaped error page.
      redirect("/admin/login?expired=1");
    }
    throw error;
  }
});

export async function getStats(): Promise<DashboardStats> {
  const { token } = await verifySession();
  return apiFetch<DashboardStats>("/api/admin/stats", { token });
}

export type BookingFilters = {
  status?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
};

function toQueryString(filters: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getBookings(
  filters: BookingFilters = {},
): Promise<Paginated<"bookings", Booking>> {
  const { token } = await verifySession();
  return apiFetch<Paginated<"bookings", Booking>>(
    `/api/admin/bookings${toQueryString(filters)}`,
    { token },
  );
}

export async function getBooking(
  id: number,
): Promise<{ booking: Booking; activity: ActivityEntry[] } | null> {
  const { token } = await verifySession();

  try {
    return await apiFetch<{ booking: Booking; activity: ActivityEntry[] }>(
      `/api/admin/bookings/${id}`,
      { token },
    );
  } catch (error) {
    if (error instanceof ApiRequestError && error.failure.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getQuotes(
  filters: { status?: string; q?: string; page?: number } = {},
): Promise<Paginated<"quotes", Quote>> {
  const { token } = await verifySession();
  return apiFetch<Paginated<"quotes", Quote>>(
    `/api/admin/quotes${toQueryString(filters)}`,
    { token },
  );
}

export async function getQuote(
  id: number,
): Promise<{ quote: Quote; activity: ActivityEntry[] } | null> {
  const { token } = await verifySession();

  try {
    return await apiFetch<{ quote: Quote; activity: ActivityEntry[] }>(
      `/api/admin/quotes/${id}`,
      { token },
    );
  } catch (error) {
    if (error instanceof ApiRequestError && error.failure.status === 404) {
      return null;
    }
    throw error;
  }
}

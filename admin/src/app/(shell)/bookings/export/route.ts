import type { NextRequest } from "next/server";

import { verifySession } from "@/lib/admin/dal";
import { apiFetchFile } from "@/lib/api/client";
import { bookingStatuses } from "@/lib/api/types";

/**
 * Downloads the bookings list as an Excel workbook, with whatever filter the
 * operator has applied on the list page.
 *
 * The session is checked here, in the data layer, like every other read — the
 * proxy's cookie check alone would let an expired session through. The API
 * builds the file; this only passes it on with a dated filename.
 */
export async function GET(request: NextRequest) {
  const { token } = await verifySession();

  const incoming = request.nextUrl.searchParams;
  const params = new URLSearchParams();

  // Only the filters the list itself uses, and only well-formed ones.
  const status = incoming.get("status");
  if (status && bookingStatuses.includes(status as never)) params.set("status", status);
  const query = incoming.get("q")?.trim();
  if (query) params.set("q", query.slice(0, 120));
  for (const key of ["from", "to"] as const) {
    const value = incoming.get(key);
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) params.set(key, value);
  }

  const suffix = params.size > 0 ? `?${params}` : "";
  const { bytes, contentType } = await apiFetchFile(`/api/admin/bookings/export${suffix}`, token);

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());

  return new Response(bytes, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="rsskyler-bookings-${today}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

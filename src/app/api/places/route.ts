import type { NextRequest } from "next/server";

import { apiFetch } from "@/lib/api/client";
import type { PlaceSuggestion } from "@/lib/api/types";

/**
 * Thin pass-through to the API's Places proxy.
 *
 * The browser cannot reach the API directly — it listens on localhost only —
 * so the autocomplete needs a same-origin endpoint. Nothing is added here: the
 * Google key lives on the API, and the rate limiting sits there too.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const session = request.nextUrl.searchParams.get("session") ?? "";

  if (q.trim().length < 3 || !session) {
    return Response.json({ suggestions: [] });
  }

  try {
    const data = await apiFetch<{ suggestions: PlaceSuggestion[] }>(
      `/api/places/autocomplete?q=${encodeURIComponent(q)}&session=${encodeURIComponent(session)}`,
    );
    return Response.json(data);
  } catch {
    // A lookup outage must not break the form; the customer types the address.
    return Response.json({ suggestions: [] });
  }
}

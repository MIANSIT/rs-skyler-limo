import type { NextRequest } from "next/server";

import { apiFetch } from "@/lib/api/client";

/**
 * Thin pass-through to the API's "is this address inside the city" check, for
 * the same reason `/api/places` exists: the browser cannot reach the API.
 *
 * Any failure answers `null` — "we could not tell" — which the form shows as a
 * quote, the same answer the server would give on submission.
 */
export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("placeId") ?? "";
  const session = request.nextUrl.searchParams.get("session") ?? "";

  if (!placeId || !session) {
    return Response.json({ isNewYorkCity: null });
  }

  try {
    const data = await apiFetch<{ isNewYorkCity: boolean | null }>(
      `/api/places/resolve?placeId=${encodeURIComponent(placeId)}&session=${encodeURIComponent(session)}`,
    );
    return Response.json(data);
  } catch {
    return Response.json({ isNewYorkCity: null });
  }
}

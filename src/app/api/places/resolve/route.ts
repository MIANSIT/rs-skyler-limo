import type { NextRequest } from "next/server";

import { apiFetch } from "@/lib/api/client";

/**
 * Thin pass-through to the API's "where is this address" check, for the same
 * reason `/api/places` exists: the browser cannot reach the API.
 *
 * `isManhattan` is what the fare preview turns on; `isNewYorkCity` only shapes
 * the wording. Any failure answers `null` for both — "we could not tell" —
 * which the form shows as a quote, the same answer the server would give on
 * submission.
 */
export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("placeId") ?? "";
  const session = request.nextUrl.searchParams.get("session") ?? "";

  if (!placeId || !session) {
    return Response.json({ isNewYorkCity: null, isManhattan: null });
  }

  try {
    const data = await apiFetch<{
      isNewYorkCity: boolean | null;
      isManhattan: boolean | null;
    }>(
      `/api/places/resolve?placeId=${encodeURIComponent(placeId)}&session=${encodeURIComponent(session)}`,
    );
    return Response.json(data);
  } catch {
    return Response.json({ isNewYorkCity: null, isManhattan: null });
  }
}

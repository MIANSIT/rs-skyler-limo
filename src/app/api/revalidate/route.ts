import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * Lets the admin app drop this site's cached data after an edit.
 *
 * The dashboard is a separate deployment on a separate origin, so it cannot
 * call `revalidateTag` here directly. This is the seam. It is a write endpoint
 * on a public host, so it authenticates with a shared secret and accepts only a
 * fixed set of tags — never an arbitrary string from the caller, which would
 * let anyone who guessed the secret invalidate the entire site at will.
 */
const ALLOWED_TAGS = new Set(["fleet"]);

function secretMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET;

  // With no secret configured the endpoint is closed, not open.
  if (!expected) {
    return Response.json(
      { error: "Revalidation is not configured." },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token || !secretMatches(token, expected)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const tag = (body as { tag?: unknown } | null)?.tag;

  if (typeof tag !== "string" || !ALLOWED_TAGS.has(tag)) {
    return Response.json({ error: "Unknown tag." }, { status: 400 });
  }

  // `{ expire: 0 }` rather than the usual `"max"`: the operator who just saved
  // is about to reload the public page to check their work, and
  // stale-while-revalidate would show them the old fleet and look like a bug.
  // The next request blocks on a fresh fetch instead.
  revalidateTag(tag, { expire: 0 });

  return Response.json({ revalidated: tag });
}

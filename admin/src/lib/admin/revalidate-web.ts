import "server-only";

/**
 * Tells the public site to drop its cached fleet.
 *
 * The two apps are separate deployments on separate origins, so
 * `revalidateTag` cannot reach across — this app's cache is not that app's
 * cache. The public site exposes a small webhook guarded by a shared secret,
 * and this is the only caller.
 *
 * Deliberately non-fatal. If the website cannot be reached the edit is already
 * saved in the database; the page will pick it up on its next natural
 * revalidation. Failing the operator's save because a cache ping timed out
 * would be the wrong trade.
 */
export async function revalidatePublicFleet(): Promise<void> {
  const url = process.env.WEB_REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;

  if (!url || !secret) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "WEB_REVALIDATE_URL or REVALIDATE_SECRET is unset — the public fleet page will not refresh until its cache expires.",
      );
    }
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ tag: "fleet" }),
      cache: "no-store",
      // A slow website must not hold up the dashboard.
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      console.warn(`Fleet revalidation returned ${response.status}.`);
    }
  } catch (error) {
    console.warn("Fleet revalidation failed:", error);
  }
}

/** Same as `revalidatePublicFleet`, for the hero slider's own cache tag. */
export async function revalidatePublicHero(): Promise<void> {
  const url = process.env.WEB_REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;

  if (!url || !secret) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "WEB_REVALIDATE_URL or REVALIDATE_SECRET is unset — the public hero will not refresh until its cache expires.",
      );
    }
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ tag: "hero" }),
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      console.warn(`Hero revalidation returned ${response.status}.`);
    }
  } catch (error) {
    console.warn("Hero revalidation failed:", error);
  }
}

/** Same as `revalidatePublicFleet`, for the approved-reviews cache tag. */
export async function revalidatePublicReviews(): Promise<void> {
  const url = process.env.WEB_REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;

  if (!url || !secret) return;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ tag: "reviews" }),
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      console.warn(`Reviews revalidation returned ${response.status}.`);
    }
  } catch (error) {
    console.warn("Reviews revalidation failed:", error);
  }
}

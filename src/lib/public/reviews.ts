import "server-only";

import { unstable_cache } from "next/cache";

import { apiFetch } from "@/lib/api/client";
import type { ReviewsResponse } from "@/lib/api/types";

/**
 * Approved reviews, cached under the `reviews` tag.
 *
 * The admin app clears the tag when an operator approves or hides one, so a
 * review appears within seconds of approval without a database read per visit.
 */
export const getReviews = unstable_cache(
  async (): Promise<ReviewsResponse> => apiFetch<ReviewsResponse>("/api/reviews"),
  ["reviews"],
  { tags: ["reviews"], revalidate: 600 },
);

/** Empty when the API is unreachable, so the home page still renders. */
export async function getReviewsSafely(): Promise<ReviewsResponse> {
  try {
    return await getReviews();
  } catch (error) {
    console.error("Could not load reviews:", error);
    return { reviews: [], count: 0, average: null, googleReviewUrl: null };
  }
}

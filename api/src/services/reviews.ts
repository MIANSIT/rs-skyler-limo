import { env } from "../env.js";
import { execute, query, queryOne, type RowDataPacket } from "../db.js";
import { ApiError } from "../lib/http.js";
import { samePhone } from "../lib/phone.js";
import { isReference } from "../lib/reference.js";
import { getBookingByReference } from "./bookings.js";

export type ReviewStatus = "pending" | "approved" | "hidden";

export type PublicReview = {
  id: number;
  rating: number;
  comment: string;
  displayName: string;
  createdAt: string;
};

export type AdminReview = PublicReview & {
  status: ReviewStatus;
  bookingReference: string;
};

type Row = RowDataPacket & {
  id: number;
  rating: number;
  comment: string;
  display_name: string;
  status: ReviewStatus;
  created_at: Date;
  booking_reference?: string;
};

/**
 * Google's own review form for the business, or null when no Place ID is
 * configured. Kept server-side so handing the site to the client is one env
 * change, not a code change.
 */
export function googleReviewUrl(): string | null {
  return env.GOOGLE_PLACE_ID
    ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(env.GOOGLE_PLACE_ID)}`
    : null;
}

/** "Jane Smith" becomes "Jane S." A customer's full name is not published by default. */
function shortName(full: string): string {
  const [first = "", ...rest] = full.trim().split(/\s+/);
  const last = rest[rest.length - 1];
  return last ? `${first} ${last[0]!.toUpperCase()}.` : first || "A customer";
}

const toPublic = (row: Row): PublicReview => ({
  id: row.id,
  rating: row.rating,
  comment: row.comment,
  displayName: row.display_name,
  createdAt: row.created_at.toISOString(),
});

/** Approved reviews only, newest first, with the figures the page summarises. */
export async function listApprovedReviews(): Promise<{
  reviews: PublicReview[];
  count: number;
  average: number | null;
}> {
  const rows = await query<Row>(
    `SELECT id, rating, comment, display_name, status, created_at
       FROM reviews WHERE status = 'approved'
      ORDER BY created_at DESC LIMIT 60`,
  );

  const agg = await queryOne<RowDataPacket & { n: number; avg: string | null }>(
    `SELECT COUNT(*) AS n, AVG(rating) AS avg FROM reviews WHERE status = 'approved'`,
  );

  return {
    reviews: rows.map(toPublic),
    count: Number(agg?.n ?? 0),
    average: agg?.avg ? Math.round(Number(agg.avg) * 10) / 10 : null,
  };
}

/**
 * Stores a review from the customer's own booking.
 *
 * The same two factors as `/track`, one error for every way it can fail so the
 * endpoint cannot be used to probe which references exist, and a review only
 * for a completed trip — nobody reviews a ride they have not taken.
 */
export async function createReview(input: {
  reference: string;
  phone: string;
  rating: number;
  comment: string;
  displayName?: string | null;
}): Promise<void> {
  const notFound = () => ApiError.notFound("No booking matches those details.");

  if (!isReference(input.reference.toUpperCase())) throw notFound();

  const booking = await getBookingByReference(input.reference);
  if (!booking || !samePhone(booking.customerPhone, input.phone)) throw notFound();

  if (booking.status !== "completed") {
    throw ApiError.conflict(
      "You can review a trip once it is marked complete. If yours has finished, give us a call and we will update it.",
    );
  }

  const existing = await queryOne<RowDataPacket>(
    `SELECT 1 FROM reviews WHERE booking_id = :id LIMIT 1`,
    { id: booking.id },
  );
  if (existing) {
    throw ApiError.conflict("You have already reviewed this trip. Thank you.");
  }

  await execute(
    `INSERT INTO reviews (booking_id, rating, comment, display_name)
     VALUES (:bookingId, :rating, :comment, :displayName)`,
    {
      bookingId: booking.id,
      rating: input.rating,
      comment: input.comment,
      displayName: input.displayName?.trim() || shortName(booking.customerName),
    },
  );
}

export async function listReviewsForAdmin(
  status?: ReviewStatus,
): Promise<AdminReview[]> {
  const rows = await query<Row>(
    `SELECT r.id, r.rating, r.comment, r.display_name, r.status, r.created_at,
            b.reference AS booking_reference
       FROM reviews r JOIN bookings b ON b.id = r.booking_id
      ${status ? "WHERE r.status = :status" : ""}
      ORDER BY (r.status = 'pending') DESC, r.created_at DESC
      LIMIT 200`,
    status ? { status } : undefined,
  );

  return rows.map((row) => ({
    ...toPublic(row),
    status: row.status,
    bookingReference: row.booking_reference ?? "",
  }));
}

export async function setReviewStatus(
  id: number,
  status: ReviewStatus,
  adminUserId: number,
): Promise<void> {
  const result = await execute(
    `UPDATE reviews SET status = :status, moderated_by = :adminUserId WHERE id = :id`,
    { id, status, adminUserId },
  );
  if (result.affectedRows === 0) {
    throw ApiError.notFound("That review no longer exists.");
  }
}

export async function deleteReview(id: number): Promise<void> {
  const result = await execute(`DELETE FROM reviews WHERE id = :id`, { id });
  if (result.affectedRows === 0) {
    throw ApiError.notFound("That review no longer exists.");
  }
}

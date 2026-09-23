import type { Metadata } from "next";
import Link from "next/link";

import { getReviews } from "@/lib/admin/dal";
import { deleteReview, setReviewStatus } from "@/lib/admin/review-actions";
import type { AdminReview, ReviewStatus } from "@/lib/api/types";
import { clsx } from "@/lib/clsx";

export const metadata: Metadata = { title: "Reviews" };

const FILTERS: { key: ReviewStatus | "all"; label: string }[] = [
  { key: "pending", label: "Waiting" },
  { key: "approved", label: "Published" },
  { key: "hidden", label: "Hidden" },
  { key: "all", label: "All" },
];

const isStatus = (value: string | undefined): value is ReviewStatus =>
  value === "pending" || value === "approved" || value === "hidden";

const buttonBase =
  "rounded-sm px-4 py-2 font-sans text-[14px] font-medium transition-colors";

function ReviewRow({ review }: { review: AdminReview }) {
  const when = new Date(review.createdAt).toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <li className="flex flex-col gap-4 border-b border-midnight/10 p-5 last:border-0 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <p
            role="img"
            aria-label={`${review.rating} out of 5`}
            className="text-[16px] tracking-[0.15em] text-midnight"
          >
            {"★".repeat(review.rating)}
            <span className="text-midnight/20">{"★".repeat(5 - review.rating)}</span>
          </p>
          <span
            className={clsx(
              "rounded-sm border px-2 py-0.5 font-sans text-[12px] font-medium tracking-[0.06em] uppercase",
              review.status === "approved" && "border-green-700/40 text-green-800",
              review.status === "pending" && "border-midnight/30 text-midnight",
              review.status === "hidden" && "border-midnight/15 text-charcoal/60",
            )}
          >
            {review.status === "pending"
              ? "Waiting"
              : review.status === "approved"
                ? "Published"
                : "Hidden"}
          </span>
        </div>

        <p className="mt-3 max-w-2xl text-[15px] leading-[1.7] whitespace-pre-line text-charcoal [overflow-wrap:anywhere]">
          {review.comment}
        </p>

        <p className="mt-3 font-sans text-[13px] text-charcoal/60">
          <span className="font-semibold text-midnight">{review.displayName}</span>
          {" · "}
          <Link
            href={`/bookings?q=${encodeURIComponent(review.bookingReference)}`}
            className="tabular-nums underline underline-offset-4"
          >
            {review.bookingReference}
          </Link>
          {" · "}
          {when}
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-2 lg:justify-end">
        {review.status !== "approved" ? (
          <form action={setReviewStatus}>
            <input type="hidden" name="id" value={review.id} />
            <input type="hidden" name="status" value="approved" />
            <button
              type="submit"
              className={clsx(buttonBase, "bg-midnight text-white hover:bg-midnight/90")}
            >
              Publish
            </button>
          </form>
        ) : null}

        {review.status !== "hidden" ? (
          <form action={setReviewStatus}>
            <input type="hidden" name="id" value={review.id} />
            <input type="hidden" name="status" value="hidden" />
            <button
              type="submit"
              className={clsx(
                buttonBase,
                "border border-midnight/25 text-midnight hover:border-midnight hover:bg-grey",
              )}
            >
              Hide
            </button>
          </form>
        ) : null}

        {/* Two steps without a script: the confirm button only exists once opened. */}
        <details className="group">
          <summary
            className={clsx(
              buttonBase,
              "cursor-pointer list-none border border-red-700/40 text-red-800 hover:border-red-700 hover:bg-red-700/5 [&::-webkit-details-marker]:hidden",
            )}
          >
            Delete
          </summary>
          <form action={deleteReview} className="mt-2 flex flex-col gap-2">
            <input type="hidden" name="id" value={review.id} />
            <p className="max-w-[14rem] font-sans text-[13px] leading-normal text-charcoal/80">
              Permanent. Hiding is reversible.
            </p>
            <button
              type="submit"
              className={clsx(buttonBase, "bg-red-800 text-white hover:bg-red-900")}
            >
              Yes, delete
            </button>
          </form>
        </details>
      </div>
    </li>
  );
}

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const active: ReviewStatus | "all" =
    status === "all" ? "all" : isStatus(status) ? status : "pending";

  const [reviews, everything] = await Promise.all([
    getReviews(active === "all" ? undefined : active),
    getReviews(),
  ]);
  const waiting = everything.filter((review) => review.status === "pending").length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-[34px] leading-tight font-semibold text-midnight">
          Reviews
        </h1>
        <p className="mt-2 max-w-2xl font-sans text-[15px] leading-[1.7] text-charcoal/70">
          Customers leave a review from the website once their trip is marked
          complete. Nothing appears publicly until you publish it. Hide a review
          only for abuse, spam or something untrue, not because it is critical.
        </p>
        <p className="mt-3 font-sans text-[14px] text-charcoal/60">
          <span className="font-semibold text-midnight tabular-nums">{waiting}</span>{" "}
          waiting for you.
        </p>
      </div>

      <nav aria-label="Filter reviews" className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.key}
            href={filter.key === "pending" ? "/reviews" : `/reviews?status=${filter.key}`}
            aria-current={active === filter.key ? "page" : undefined}
            className={clsx(
              "rounded-sm border px-4 py-2 font-sans text-[14px] font-medium transition-colors",
              active === filter.key
                ? "border-midnight bg-midnight text-white"
                : "border-midnight/25 text-midnight hover:border-midnight hover:bg-grey",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      {reviews.length === 0 ? (
        <p className="rounded-sm border border-midnight/10 bg-white px-6 py-10 text-center font-sans text-[15px] text-charcoal/60">
          Nothing here yet.
        </p>
      ) : (
        <ul className="rounded-sm border border-midnight/10 bg-white">
          {reviews.map((review) => (
            <ReviewRow key={review.id} review={review} />
          ))}
        </ul>
      )}
    </div>
  );
}

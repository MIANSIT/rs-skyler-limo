import { formatReference } from "@/lib/admin/reference";
import type { Metadata } from "next";
import Link from "next/link";

import { BookingsTable } from "@/components/admin/bookings-table";
import { ChangedTag } from "@/components/admin/changed-tag";
import { ChangedToggle } from "@/components/admin/changed-toggle";
import { FilterBar } from "@/components/admin/filter-bar";
import { OrderToggle } from "@/components/admin/order-toggle";
import { Pagination } from "@/components/admin/pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { getBookings, getQuotes } from "@/lib/admin/dal";
import {
  formatEventDate,
  formatRelative,
  formatService,
} from "@/lib/admin/format";
import { bookingStatuses, quoteStatuses } from "@/lib/api/types";

export const metadata: Metadata = { title: "Quotes" };

// Workflow order, unfinished work on the left. `action` is New + Pending.
const statusChips = ["action", "new", "pending", "quoted", "won", "lost"] as const;

const sectionHeading =
  "font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase";

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const status = single("status");
  const query = single("q");
  const changed = single("changed") === "1" ? "1" : undefined;
  const pageOf = (key: string) => {
    const page = Number(single(key) ?? 1);
    return Number.isInteger(page) && page > 0 ? page : 1;
  };
  const safePage = pageOf("page");
  const tripsPage = pageOf("tripsPage");
  // The order applies to the trip quotes; event requests are always newest first.
  const sort = single("sort") === "pickup" ? "pickup" : undefined;

  const quoteStatus =
    status === "action" || quoteStatuses.includes(status as never) ? status : undefined;
  // The two lists share one set of filter chips, but their statuses differ
  // (a trip is never "won"). A chip a list does not have simply empties it.
  const tripStatus =
    status === "action" || bookingStatuses.includes(status as never) ? status : undefined;
  const tripsApply = !status || Boolean(tripStatus);
  const requestsApply = !status || Boolean(quoteStatus);

  const [trips, requests] = await Promise.all([
    tripsApply
      ? getBookings({ kind: "quote", sort, status: tripStatus, q: query, changed, page: tripsPage })
      : null,
    requestsApply
      ? getQuotes({ status: quoteStatus, q: query, changed, page: safePage })
      : null,
  ]);

  const quotes = requests?.quotes ?? [];
  const total = (trips?.total ?? 0) + (requests?.total ?? 0);

  const toggleParams = new URLSearchParams();
  if (status) toggleParams.set("status", status);
  if (query) toggleParams.set("q", query);
  if (sort) toggleParams.set("sort", sort);
  if (!changed) toggleParams.set("changed", "1");
  const toggleHref = toggleParams.size > 0 ? `/quotes?${toggleParams}` : "/quotes";

  // Order links keep the status, search and "changed" filter; only the order flips.
  const sortHref = (target?: "pickup") => {
    const next = new URLSearchParams();
    if (status) next.set("status", status);
    if (query) next.set("q", query);
    if (changed) next.set("changed", changed);
    if (target) next.set("sort", target);
    return next.size > 0 ? `/quotes?${next}` : "/quotes";
  };

  const filtered = Boolean(status || query || changed);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-[34px] leading-tight font-semibold text-midnight">
          Quotes
        </h1>
        <p className="font-sans text-[14px] text-charcoal/60 tabular-nums">
          {total} {total === 1 ? "request" : "requests"}
        </p>
      </div>

      <FilterBar
        basePath="/quotes"
        statuses={statusChips}
        activeStatus={status}
        query={query}
        placeholder="Reference, name, company, address"
        keep={{ ...(changed ? { changed } : {}), ...(sort ? { sort } : {}) }}
      />

      <div>
        <ChangedToggle href={toggleHref} active={Boolean(changed)} />
      </div>

      {/* Trips from the booking form that have no published fare. They are
          bookings underneath, so each row opens the booking page. */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <h2 className={sectionHeading}>
            Trip quotes{trips ? ` · ${trips.total}` : ""}
          </h2>
          <OrderToggle
            active={sort ?? "booked"}
            newestHref={sortHref()}
            pickupHref={sortHref("pickup")}
          />
        </div>
        {trips && trips.bookings.length > 0 ? (
          <>
            <BookingsTable bookings={trips.bookings} emptyMessage="" />
            <Pagination
              basePath="/quotes"
              params={params}
              page={tripsPage}
              perPage={trips.perPage}
              total={trips.total}
              pageParam="tripsPage"
            />
          </>
        ) : (
          <p className="rounded-sm border border-midnight/10 bg-white px-6 py-8 text-center font-sans text-[15px] text-charcoal/60">
            {filtered ? "No trip quotes match that filter." : "No trip quotes yet."}
          </p>
        )}
      </section>

      {/* Corporate, wedding, event and hourly enquiries from the quote form. */}
      <section className="flex flex-col gap-4">
        <h2 className={sectionHeading}>
          Event &amp; corporate requests{requests ? ` · ${requests.total}` : ""}
        </h2>
        {quotes.length === 0 ? (
          <p className="rounded-sm border border-midnight/10 bg-white px-6 py-8 text-center font-sans text-[15px] text-charcoal/60">
            {changed && !status && !query
              ? "No customer changes waiting for review."
              : filtered
                ? "No quote requests match that filter."
                : "No quote requests yet."}
          </p>
        ) : (
          <ul className="flex flex-col gap-px overflow-hidden rounded-sm border border-midnight/10 bg-midnight/10">
            {quotes.map((quote) => (
              <li key={quote.id} className="bg-white">
                <Link
                  href={`/quotes/${quote.id}`}
                  className="block px-6 py-5 transition-colors hover:bg-grey"
                >
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="font-sans text-[14px] font-semibold text-midnight tabular-nums">
                      {formatReference(quote.reference)}
                    </span>
                    <StatusBadge status={quote.status} />
                    {quote.customerChangePending ? <ChangedTag /> : null}
                    <span className="font-sans text-[15px] text-midnight">
                      {quote.customerName}
                      {quote.company ? (
                        <span className="text-charcoal/60"> · {quote.company}</span>
                      ) : null}
                    </span>
                    <span className="ml-auto font-sans text-[13px] text-charcoal/50">
                      {formatRelative(quote.createdAt)}
                    </span>
                  </div>

                  <p className="mt-2 font-sans text-[14px] text-charcoal/70">
                    {formatService(quote.serviceType)}
                    {quote.eventDate
                      ? ` · ${formatEventDate(quote.eventDate)}`
                      : ""}
                    {quote.passengers ? ` · ${quote.passengers} passengers` : ""}
                  </p>

                  <p className="mt-1 line-clamp-2 font-sans text-[14px] text-charcoal/60">
                    {quote.details}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {requests ? (
          <Pagination
            basePath="/quotes"
            params={params}
            page={safePage}
            perPage={requests.perPage}
            total={requests.total}
          />
        ) : null}
      </section>
    </div>
  );
}

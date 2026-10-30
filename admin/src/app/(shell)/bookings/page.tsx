import type { Metadata } from "next";

import { BookingsTable } from "@/components/admin/bookings-table";
import { ChangedToggle } from "@/components/admin/changed-toggle";
import { FilterBar } from "@/components/admin/filter-bar";
import { OrderToggle } from "@/components/admin/order-toggle";
import { Pagination } from "@/components/admin/pagination";
import { getBookings } from "@/lib/admin/dal";

export const metadata: Metadata = { title: "Bookings" };

// Workflow order, unfinished work on the left. `action` is New + Pending.
const statusChips = ["action", "new", "pending", "confirmed", "completed", "cancelled"] as const;
const validStatus = (value?: string) => Boolean(value && (statusChips as readonly string[]).includes(value));

export default async function BookingsPage({
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
  const page = Number(single("page") ?? 1);

  // Bookings are fixed-fare trips plus quotes that have been confirmed. A trip
  // still being quoted lives on the Quotes page, whichever form it came from.
  const exportParams = new URLSearchParams({ kind: "booking" });
  if (status && validStatus(status)) exportParams.set("status", status);
  if (query) exportParams.set("q", query);
  if (changed) exportParams.set("changed", changed);

  // The toggle keeps the status and search; only `changed` flips.
  const toggleParams = new URLSearchParams(exportParams);
  if (changed) toggleParams.delete("changed");
  else toggleParams.set("changed", "1");
  toggleParams.delete("kind");
  const sort = single("sort") === "pickup" ? "pickup" : undefined;
  if (sort) toggleParams.set("sort", sort);
  const toggleHref = toggleParams.size > 0 ? `/bookings?${toggleParams}` : "/bookings";
  const exportQuery = `?${exportParams}`;

  // Sort links keep the status, search and "changed" filter; only the order flips.
  const sortHref = (target?: "pickup") => {
    const next = new URLSearchParams(toggleParams);
    next.delete("sort");
    next.delete("changed");
    if (changed) next.set("changed", changed);
    if (target) next.set("sort", target);
    return next.size > 0 ? `/bookings?${next}` : "/bookings";
  };

  const { bookings, total, perPage } = await getBookings({
    kind: "booking",
    sort,
    // Anything not a known status is dropped rather than passed to the API.
    status: validStatus(status) ? status : undefined,
    q: query,
    changed,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-[34px] leading-tight font-semibold text-midnight">
          Bookings
        </h1>
        <div className="flex flex-wrap items-center gap-4">
          <p className="font-sans text-[14px] text-charcoal/60 tabular-nums">
            {total} {total === 1 ? "request" : "requests"}
          </p>
          {/* A plain link, not <Link>: it is a file download, not a page. It
              carries the current filter, so the file matches the screen. */}
          <a
            href={`/bookings/export${exportQuery}`}
            className="rounded-sm border border-midnight/25 bg-white px-4 py-2 font-sans text-[14px] font-medium text-midnight transition-colors hover:border-midnight hover:bg-grey"
          >
            Export to Excel
          </a>
        </div>
      </div>

      <FilterBar
        basePath="/bookings"
        statuses={statusChips}
        activeStatus={status}
        query={query}
        placeholder="Reference, name, phone, address"
        keep={{ ...(changed ? { changed } : {}), ...(sort ? { sort } : {}) }}
      />

      <div className="flex flex-wrap items-center gap-3">
        <ChangedToggle href={toggleHref} active={Boolean(changed)} />
        <OrderToggle
          active={sort ?? "booked"}
          newestHref={sortHref()}
          pickupHref={sortHref("pickup")}
        />
      </div>

      <BookingsTable
        bookings={bookings}
        emptyMessage={
          changed && !status && !query
            ? "No customer changes waiting for review."
            : status || query || changed
              ? "No bookings match that filter."
              : "No bookings yet."
        }
      />

      <Pagination
        basePath="/bookings"
        params={params}
        page={Number.isInteger(page) && page > 0 ? page : 1}
        perPage={perPage}
        total={total}
      />
    </div>
  );
}

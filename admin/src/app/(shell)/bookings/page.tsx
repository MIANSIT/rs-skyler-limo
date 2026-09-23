import type { Metadata } from "next";

import { BookingsTable } from "@/components/admin/bookings-table";
import { FilterBar } from "@/components/admin/filter-bar";
import { Pagination } from "@/components/admin/pagination";
import { getBookings } from "@/lib/admin/dal";
import { bookingStatuses } from "@/lib/api/types";

export const metadata: Metadata = { title: "Bookings" };

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
  const page = Number(single("page") ?? 1);

  const exportParams = new URLSearchParams();
  if (status && bookingStatuses.includes(status as never)) exportParams.set("status", status);
  if (query) exportParams.set("q", query);
  const exportQuery = exportParams.size > 0 ? `?${exportParams}` : "";

  const { bookings, total, perPage } = await getBookings({
    // Anything not a known status is dropped rather than passed to the API.
    status: bookingStatuses.includes(status as never) ? status : undefined,
    q: query,
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
        statuses={bookingStatuses}
        activeStatus={status}
        query={query}
        placeholder="Reference, name, phone, address"
      />

      <BookingsTable
        bookings={bookings}
        emptyMessage={
          status || query
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

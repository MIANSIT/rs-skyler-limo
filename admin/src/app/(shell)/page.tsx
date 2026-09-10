import Link from "next/link";

import { BookingsTable } from "@/components/admin/bookings-table";
import { StatCard } from "@/components/admin/stat-card";
import { getBookings, getQuotes, getStats, verifySession } from "@/lib/admin/dal";
import {
  formatEventDate,
  formatRelative,
  formatService,
  greeting,
} from "@/lib/admin/format";
import { StatusBadge } from "@/components/admin/status-badge";

export default async function DashboardPage() {
  const { user } = await verifySession();

  // Independent reads; run them together rather than in series.
  const [stats, incoming, quotes] = await Promise.all([
    getStats(),
    getBookings({ status: "new", page: 1 }),
    getQuotes({ status: "new", page: 1 }),
  ]);

  const firstName = user.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-display text-[34px] leading-tight font-semibold text-midnight">
          Good {greeting()}, {firstName}.
        </h1>
        <p className="mt-2 font-sans text-[15px] text-charcoal/70">
          {stats.bookings.new === 0
            ? "Nothing new is waiting. Every request has been picked up."
            : `${stats.bookings.new} ${
                stats.bookings.new === 1 ? "request needs" : "requests need"
              } an answer.`}
        </p>
      </div>

      <div className="grid gap-px overflow-hidden rounded-sm border border-midnight/10 bg-midnight/10 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="New requests" value={stats.bookings.new} emphasis />
        <StatCard label="Pickups today" value={stats.bookings.today} />
        <StatCard label="Next seven days" value={stats.bookings.next7Days} />
        <StatCard label="Quote requests" value={stats.quotes.new} />
      </div>

      <section>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-[24px] font-semibold text-midnight">
            Waiting on you
          </h2>
          <Link
            href="/bookings"
            className="font-sans text-[14px] font-medium text-midnight underline-offset-4 hover:underline"
          >
            All bookings
          </Link>
        </div>

        <div className="mt-4">
          <BookingsTable
            bookings={incoming.bookings.slice(0, 8)}
            emptyMessage="No new booking requests."
          />
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-[24px] font-semibold text-midnight">
            New quote requests
          </h2>
          <Link
            href="/quotes"
            className="font-sans text-[14px] font-medium text-midnight underline-offset-4 hover:underline"
          >
            All quotes
          </Link>
        </div>

        {quotes.quotes.length === 0 ? (
          <p className="mt-4 rounded-sm border border-midnight/10 bg-white px-6 py-8 text-center font-sans text-[15px] text-charcoal/60">
            No new quote requests.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-px overflow-hidden rounded-sm border border-midnight/10 bg-midnight/10">
            {quotes.quotes.slice(0, 5).map((quote) => (
              <li key={quote.id} className="bg-white">
                <Link
                  href={`/quotes/${quote.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-grey"
                >
                  <StatusBadge status={quote.status} />
                  <span className="font-sans text-[15px] font-medium text-midnight">
                    {quote.customerName}
                  </span>
                  <span className="font-sans text-[14px] text-charcoal/70">
                    {formatService(quote.serviceType)}
                    {quote.eventDate
                      ? ` · ${formatEventDate(quote.eventDate)}`
                      : ""}
                  </span>
                  <span className="ml-auto font-sans text-[13px] text-charcoal/50">
                    {formatRelative(quote.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

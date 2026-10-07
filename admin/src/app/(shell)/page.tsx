import type { Metadata } from "next";

import { BreakdownList } from "@/components/admin/breakdown-list";
import { PeriodPicker } from "@/components/admin/period-picker";
import { SalesTaxPanel } from "@/components/admin/sales-tax-panel";
import { StatCard } from "@/components/admin/stat-card";
import { VolumeChart } from "@/components/admin/volume-chart";
import { getReport } from "@/lib/admin/dal";
import {
  formatMoney,
  formatShortDate,
  formatTrip,
  formatVehicle,
} from "@/lib/admin/format";
import { resolveReportRange } from "@/lib/admin/report-range";
import { bookingStatuses, quoteStatuses } from "@/lib/api/types";

export const metadata: Metadata = { title: "Reports" };

const statusLabels: Record<string, string> = {
  new: "New",
  pending: "Pending",
  quoted: "Quoted",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  won: "Won",
  lost: "Lost",
};

function plural(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

/** `Sep 1 – Sep 30, 2026`, `Sep 30, 2026`, or `Dec 1, 2025 – Jan 5, 2026`. */
function describeDates(from: string, to: string): string {
  const fromYear = from.slice(0, 4);
  const toYear = to.slice(0, 4);
  if (from === to) return `${formatShortDate(to)}, ${toYear}`;
  if (fromYear === toYear) return `${formatShortDate(from)} – ${formatShortDate(to)}, ${toYear}`;
  return `${formatShortDate(from)}, ${fromYear} – ${formatShortDate(to)}, ${toYear}`;
}

/**
 * The landing page: orders placed in a period, what they are worth, what has
 * been collected. The operator's to-do list is "Today" at /today, kept
 * separate so a revenue total does not compete with the requests that need an
 * answer.
 *
 * Every figure counts orders by the date they were *placed* — see `Report` in
 * `api/src/services/reports.ts` for why one date and why that one.
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const range = resolveReportRange({
    range: single("range"),
    from: single("from"),
    to: single("to"),
  });
  const report = await getReport({ from: range.from, to: range.to });

  const { value } = report;
  const totalOrders = report.bookings.total + report.quotes.total;
  const confirmedOrders =
    report.bookings.byStatus.confirmed +
    report.bookings.byStatus.completed +
    report.quotes.byStatus.won;
  const awaiting =
    report.bookings.byStatus.new +
    report.bookings.byStatus.pending +
    report.bookings.byStatus.quoted +
    report.quotes.byStatus.new +
    report.quotes.byStatus.pending +
    report.quotes.byStatus.quoted;

  // The bookings and quotes lists filter by pickup date, not by the date an
  // order was placed, so a status row only links through when the counts would
  // match what opens: all time.
  const linkThrough = range.key === "all";

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="font-display text-[34px] leading-tight font-semibold text-midnight">
            Reports
          </h1>
          <p className="mt-2 font-sans text-[15px] text-charcoal/70 tabular-nums">
            Orders placed {range.key === "all" ? "since" : ""}{" "}
            {range.key === "all"
              ? `${formatShortDate(report.range.from)}, ${report.range.from.slice(0, 4)}`
              : describeDates(report.range.from, report.range.to)}
            . Committed means confirmed or completed bookings and won quote
            requests. New York time.
          </p>
        </div>
        <PeriodPicker range={range} />
      </div>

      <SalesTaxPanel
        tax={report.salesTax}
        dates={
          range.key === "all"
            ? `since ${formatShortDate(report.range.from)}, ${report.range.from.slice(0, 4)}`
            : describeDates(report.range.from, report.range.to)
        }
      />

      <section>
        <h2 className="font-display text-[24px] font-semibold text-midnight">Orders</h2>
        <div className="mt-4 grid gap-px overflow-hidden rounded-sm border border-midnight/10 bg-midnight/10 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total orders"
            value={totalOrders}
            hint={`${plural(report.bookings.total, "booking")} · ${plural(report.quotes.total, "quote request")}`}
          />
          <StatCard
            label="Confirmed orders"
            value={confirmedOrders}
            hint={`${report.bookings.byStatus.completed} completed · ${report.quotes.byStatus.won} quotes won`}
          />
          <StatCard
            label="Awaiting a yes"
            value={awaiting}
            hint={value.unpricedCount > 0 ? `${value.unpricedCount} still to price` : "All priced"}
          />
          <StatCard
            label="Cancelled or lost"
            value={report.bookings.byStatus.cancelled + report.quotes.byStatus.lost}
            hint={`${report.bookings.byStatus.cancelled} cancelled · ${report.quotes.byStatus.lost} quotes lost`}
          />
        </div>
      </section>

      <section>
        <h2 className="font-display text-[24px] font-semibold text-midnight">Value</h2>
        <div className="mt-4 grid gap-px overflow-hidden rounded-sm border border-midnight/10 bg-midnight/10 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Committed value"
            value={formatMoney(value.committedCents)}
            hint={`Across ${plural(value.committedCount, "order")}, tax included`}
          />
          <StatCard
            label="Collected"
            value={formatMoney(value.collectedCents)}
            hint="Marked paid, card or cash"
          />
          <StatCard
            label="Outstanding"
            value={formatMoney(value.outstandingCents)}
            hint="Committed, not yet paid"
          />
          <StatCard
            label="In the pipeline"
            value={formatMoney(value.pipelineCents)}
            hint="Priced, awaiting a yes"
          />
          <StatCard
            label="Average fare"
            value={value.averageBookingCents === null ? "—" : formatMoney(value.averageBookingCents)}
            hint="Per committed booking"
          />
          <StatCard
            label="Awaiting a price"
            value={value.unpricedCount}
            hint="Open orders nobody has priced"
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="rounded-sm border border-midnight/10 bg-white p-6 lg:col-span-3">
          <h2 className="font-display text-[22px] font-semibold text-midnight">
            Orders placed
          </h2>
          <p className="mt-1 font-sans text-[13px] text-charcoal/70 tabular-nums">
            {plural(totalOrders, "order")}, by {report.range.bucket}
          </p>
          {report.series.length > 1 && totalOrders > 0 ? (
            <VolumeChart points={report.series} bucket={report.range.bucket} />
          ) : (
            <p className="py-10 text-center font-sans text-[15px] text-charcoal/60">
              {totalOrders === 0
                ? "No orders placed in this period."
                : "Pick a longer period to see a trend."}
            </p>
          )}
        </section>

        <section className="rounded-sm border border-midnight/10 bg-white p-6 lg:col-span-2">
          <h2 className="font-display text-[22px] font-semibold text-midnight">
            Bookings by status
          </h2>
          <div className="mt-3">
            <BreakdownList
              emptyMessage="No bookings in this period."
              rows={
                report.bookings.total === 0
                  ? []
                  : bookingStatuses.map((status) => ({
                      key: status,
                      label: statusLabels[status],
                      count: report.bookings.byStatus[status],
                      href: linkThrough ? `/bookings?status=${status}` : undefined,
                    }))
              }
            />
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-sm border border-midnight/10 bg-white p-6">
          <h2 className="font-display text-[22px] font-semibold text-midnight">Quote requests</h2>
          <div className="mt-3">
            <BreakdownList
              emptyMessage="No quote requests in this period."
              rows={
                report.quotes.total === 0
                  ? []
                  : quoteStatuses.map((status) => ({
                      key: status,
                      label: statusLabels[status],
                      count: report.quotes.byStatus[status],
                      href: linkThrough ? `/quotes?status=${status}` : undefined,
                    }))
              }
            />
          </div>
        </section>

        <section className="rounded-sm border border-midnight/10 bg-white p-6">
          <h2 className="font-display text-[22px] font-semibold text-midnight">By trip</h2>
          <p className="mt-1 font-sans text-[13px] text-charcoal/70">Committed bookings</p>
          <div className="mt-2">
            <BreakdownList
              emptyMessage="No committed bookings in this period."
              rows={report.byTrip.map((row) => ({
                key: row.key,
                label: formatTrip(row.key),
                count: row.count,
                valueCents: row.valueCents,
              }))}
            />
          </div>
        </section>

        <section className="rounded-sm border border-midnight/10 bg-white p-6">
          <h2 className="font-display text-[22px] font-semibold text-midnight">By vehicle</h2>
          <p className="mt-1 font-sans text-[13px] text-charcoal/70">Committed bookings</p>
          <div className="mt-2">
            <BreakdownList
              emptyMessage="No committed bookings in this period."
              rows={report.byVehicle.map((row) => ({
                key: row.key,
                label: formatVehicle(row.key),
                count: row.count,
                valueCents: row.valueCents,
              }))}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

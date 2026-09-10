import type { Metadata } from "next";
import Link from "next/link";

import { FilterBar } from "@/components/admin/filter-bar";
import { Pagination } from "@/components/admin/pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { getQuotes } from "@/lib/admin/dal";
import {
  formatEventDate,
  formatRelative,
  formatService,
} from "@/lib/admin/format";
import { quoteStatuses } from "@/lib/api/types";

export const metadata: Metadata = { title: "Quotes" };

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
  const page = Number(single("page") ?? 1);
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;

  const { quotes, total, perPage } = await getQuotes({
    status: quoteStatuses.includes(status as never) ? status : undefined,
    q: query,
    page: safePage,
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-[34px] leading-tight font-semibold text-midnight">
          Quote requests
        </h1>
        <p className="font-sans text-[14px] text-charcoal/60 tabular-nums">
          {total} {total === 1 ? "request" : "requests"}
        </p>
      </div>

      <FilterBar
        basePath="/quotes"
        statuses={quoteStatuses}
        activeStatus={status}
        query={query}
        placeholder="Reference, name, company"
      />

      {quotes.length === 0 ? (
        <p className="rounded-sm border border-midnight/10 bg-white px-6 py-8 text-center font-sans text-[15px] text-charcoal/60">
          {status || query
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
                    {quote.reference}
                  </span>
                  <StatusBadge status={quote.status} />
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

      <Pagination
        basePath="/quotes"
        params={params}
        page={safePage}
        perPage={perPage}
        total={total}
      />
    </div>
  );
}

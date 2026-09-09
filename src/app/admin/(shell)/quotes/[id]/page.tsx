import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActivityTrail } from "@/components/admin/activity-trail";
import { DetailRow } from "@/components/admin/detail-row";
import { QuoteActions } from "@/components/admin/quote-actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { getQuote } from "@/lib/admin/dal";
import { formatDay, formatEventDate, formatService } from "@/lib/admin/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getQuote(Number(id));

  return { title: result ? result.quote.reference : "Quote" };
}

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);

  if (!Number.isInteger(numericId) || numericId < 1) notFound();

  const result = await getQuote(numericId);
  if (!result) notFound();

  const { quote, activity } = result;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/admin/quotes"
          className="font-sans text-[14px] text-charcoal/60 underline-offset-4 hover:text-midnight hover:underline"
        >
          ← All quotes
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <h1 className="font-display text-[34px] leading-none font-semibold text-midnight tabular-nums">
            {quote.reference}
          </h1>
          <StatusBadge status={quote.status} />
        </div>

        <p className="mt-3 font-sans text-[15px] text-charcoal/70">
          {formatService(quote.serviceType)} · requested{" "}
          {formatDay(quote.createdAt)} · {quote.source}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-8">
          <section className="rounded-sm border border-midnight/10 bg-white">
            <h2 className="border-b border-midnight/10 px-6 py-4 font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase">
              The request
            </h2>
            <dl className="divide-y divide-midnight/8">
              <DetailRow
                label="Service"
                value={formatService(quote.serviceType)}
              />
              {quote.eventDate ? (
                <DetailRow
                  label="Date"
                  value={formatEventDate(quote.eventDate)}
                  numeric
                />
              ) : null}
              {quote.passengers ? (
                <DetailRow
                  label="Passengers"
                  value={String(quote.passengers)}
                  numeric
                />
              ) : null}
              {quote.company ? (
                <DetailRow label="Company" value={quote.company} />
              ) : null}
            </dl>

            <div className="border-t border-midnight/10 px-6 py-5">
              <p className="font-sans text-[13px] font-medium tracking-[0.06em] text-charcoal/60 uppercase">
                In their words
              </p>
              <p className="mt-2 font-sans text-[15px] whitespace-pre-line text-midnight">
                {quote.details}
              </p>
            </div>
          </section>

          <section className="rounded-sm border border-midnight/10 bg-white">
            <h2 className="border-b border-midnight/10 px-6 py-4 font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase">
              The customer
            </h2>
            <dl className="divide-y divide-midnight/8">
              <DetailRow label="Name" value={quote.customerName} />
              <DetailRow
                label="Phone"
                value={quote.customerPhone}
                href={`tel:${quote.customerPhone.replace(/[^\d+]/g, "")}`}
                numeric
              />
              <DetailRow
                label="Email"
                value={quote.customerEmail}
                href={`mailto:${quote.customerEmail}`}
              />
            </dl>
          </section>

          <ActivityTrail entries={activity} />
        </div>

        <QuoteActions
          id={quote.id}
          status={quote.status}
          phone={quote.customerPhone}
          email={quote.customerEmail}
        />
      </div>
    </div>
  );
}

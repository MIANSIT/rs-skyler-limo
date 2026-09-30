import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { QuoteEditForm } from "@/components/admin/quote-edit-form";
import { getQuote } from "@/lib/admin/dal";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getQuote(Number(id));
  return { title: result ? `Edit ${result.quote.reference}` : "Edit quote" };
}

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) notFound();

  const result = await getQuote(numericId);
  if (!result) notFound();

  const { quote } = result;

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <div>
        <Link
          href={`/quotes/${quote.id}`}
          className="font-sans text-[14px] text-charcoal/60 underline-offset-4 hover:text-midnight hover:underline"
        >
          ← {quote.reference}
        </Link>
        <h1 className="font-display mt-4 text-[34px] leading-none font-semibold text-midnight">
          Edit quote request
        </h1>
        <p className="mt-3 max-w-2xl font-sans text-[15px] leading-[1.7] text-charcoal/70">
          Corrects the request. The agreed price and the status are set on the
          request page, where the customer can be emailed.
        </p>
      </div>

      <QuoteEditForm quote={quote} />
    </div>
  );
}

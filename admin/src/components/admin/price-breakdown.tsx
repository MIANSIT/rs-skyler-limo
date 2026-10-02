import { formatMoney } from "@/lib/admin/format";
import { formatRate } from "@/lib/admin/tax";

/**
 * A priced order's total, large, with what it is made of beneath it: the price
 * before tax and the sales tax. An order priced before tax existed (0%, no
 * tax) shows the total alone.
 */
export function PriceBreakdown({
  totalCents,
  taxCents,
  taxRate,
  label = "Fare",
}: {
  totalCents: number;
  taxCents: number;
  taxRate: number;
  label?: string;
}) {
  const taxed = taxCents > 0 || taxRate > 0;

  return (
    <div className="mt-3">
      <p className="font-display text-[34px] leading-none font-semibold text-midnight tabular-nums">
        {formatMoney(totalCents)}
      </p>
      {taxed ? (
        <dl className="mt-3 grid max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1 font-sans text-[14px] text-charcoal tabular-nums">
          <dt className="text-charcoal/70">{label} before tax</dt>
          <dd className="text-right">{formatMoney(totalCents - taxCents)}</dd>
          <dt className="text-charcoal/70">Sales tax ({formatRate(taxRate)})</dt>
          <dd className="text-right">{formatMoney(taxCents)}</dd>
          <dt className="border-t border-midnight/10 pt-1 font-semibold text-midnight">Total</dt>
          <dd className="border-t border-midnight/10 pt-1 text-right font-semibold text-midnight">
            {formatMoney(totalCents)}
          </dd>
        </dl>
      ) : (
        <p className="mt-2 font-sans text-[13px] text-charcoal/60">No sales tax on this order.</p>
      )}
    </div>
  );
}

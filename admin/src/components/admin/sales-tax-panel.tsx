import { formatMoney } from "@/lib/admin/format";
import type { Report } from "@/lib/api/types";

/**
 * The one number the office needs at tax time: the sales tax to pay the state
 * for the chosen dates. Nothing to add up — it is the tax inside every payment
 * received in the period, card or cash, whenever that trip was booked.
 *
 * Counted by payment date on purpose, unlike the rest of Reports (by order
 * date): tax is owed on money received. A gold rule marks it as the page's
 * headline figure; the numerals stay midnight, never gold text on white.
 */
export function SalesTaxPanel({
  tax,
  dates,
}: {
  tax: Report["salesTax"];
  /** The period in words: `Sep 1 – Sep 30, 2026`. */
  dates: string;
}) {
  return (
    <section
      aria-labelledby="sales-tax-heading"
      className="rounded-sm border border-midnight/10 border-t-2 border-t-gold bg-white p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2
            id="sales-tax-heading"
            className="font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/70 uppercase"
          >
            Sales tax to pay the government
          </h2>
          <p className="font-display mt-2 text-[44px] leading-none font-semibold text-midnight tabular-nums">
            {formatMoney(tax.dueCents)}
          </p>
          <p className="mt-3 max-w-xl font-sans text-[14px] leading-[1.7] text-charcoal/80 tabular-nums">
            {tax.paidOrders === 0
              ? `No payments received ${dates}, so no sales tax is due for these dates.`
              : `Collected from customers in ${tax.paidOrders} ${
                  tax.paidOrders === 1 ? "payment" : "payments"
                } received ${dates}, card and cash. This is the amount to send to New York State for these dates.`}
          </p>
        </div>

        <dl className="grid grid-cols-[auto_auto] gap-x-8 gap-y-2 font-sans text-[14px] tabular-nums">
          <dt className="text-charcoal/70">Taxable sales (before tax)</dt>
          <dd className="text-right font-semibold text-midnight">
            {formatMoney(tax.taxableSalesCents)}
          </dd>
          <dt className="text-charcoal/70">Sales tax collected</dt>
          <dd className="text-right font-semibold text-midnight">{formatMoney(tax.dueCents)}</dd>
          <dt className="text-charcoal/70">Total received</dt>
          <dd className="text-right font-semibold text-midnight">
            {formatMoney(tax.taxableSalesCents + tax.dueCents)}
          </dd>
        </dl>
      </div>

      {tax.notYetCollectedCents > 0 ? (
        <p className="mt-5 border-t border-midnight/10 pt-4 font-sans text-[13px] leading-[1.7] text-charcoal/70 tabular-nums">
          Not in the figure above: {formatMoney(tax.notYetCollectedCents)} more tax on confirmed
          orders from these dates that are not paid yet. It becomes due once they are paid.
        </p>
      ) : null}
    </section>
  );
}

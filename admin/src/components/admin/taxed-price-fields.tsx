"use client";

import { useState } from "react";

import { formatMoney } from "@/lib/admin/format";
import { formatRate, withTax } from "@/lib/admin/tax";

const control =
  "w-full rounded-sm border border-midnight/20 bg-white px-3 py-2.5 font-sans text-[15px] text-midnight tabular-nums focus:border-midnight focus:outline-none";

const labelClass =
  "font-sans text-[13px] font-medium tracking-[0.06em] text-charcoal/70 uppercase";

/** "125" or "125.50" → 12550; anything else → null, so the preview just waits. */
function toCents(raw: string): number | null {
  const clean = raw.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}

/**
 * The price before tax, the tax rate, and the total they make — worked out as
 * the operator types, so the figure the customer will see is never a surprise.
 *
 * The operator always types the price *before* tax. The rate starts at this
 * order's own rate (from Settings when the order came in) and can be changed
 * for this order alone, e.g. 0 for a tax-exempt client. The API works the tax
 * out again on save; this preview uses the same arithmetic.
 */
export function TaxedPriceFields({
  idPrefix,
  priceName,
  rateName = "taxRate",
  priceLabel,
  defaultPriceCents,
  defaultRate,
  required = false,
  priceError,
  rateError,
  priceHint,
}: {
  idPrefix: string;
  priceName: string;
  rateName?: string;
  priceLabel: string;
  defaultPriceCents: number | null;
  defaultRate: number;
  required?: boolean;
  priceError?: string;
  rateError?: string;
  priceHint?: string;
}) {
  const [price, setPrice] = useState(
    defaultPriceCents === null ? "" : (defaultPriceCents / 100).toFixed(2),
  );
  const [rate, setRate] = useState(String(defaultRate));

  const cents = toCents(price);
  const rateNumber = Number(rate);
  const rateValid = rate.trim() !== "" && Number.isFinite(rateNumber) && rateNumber >= 0 && rateNumber <= 25;
  const taxed = cents !== null && rateValid ? withTax(cents, rateNumber) : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,8rem)]">
        <div className="flex flex-col gap-2">
          <label htmlFor={`${idPrefix}-price`} className={labelClass}>
            {priceLabel}
          </label>
          <div className="flex items-center gap-1.5">
            <span aria-hidden className="font-sans text-[15px] text-charcoal/50">
              $
            </span>
            <input
              id={`${idPrefix}-price`}
              name={priceName}
              inputMode="decimal"
              required={required}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="100.00"
              aria-describedby={`${idPrefix}-total`}
              className={control}
            />
          </div>
          {priceError ? <p className="font-sans text-[13px] text-red-800">{priceError}</p> : null}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={`${idPrefix}-rate`} className={labelClass}>
            Tax rate
          </label>
          <div className="flex items-center gap-1.5">
            <input
              id={`${idPrefix}-rate`}
              name={rateName}
              inputMode="decimal"
              required
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              className={control}
            />
            <span aria-hidden className="font-sans text-[15px] text-charcoal/50">
              %
            </span>
          </div>
          {rateError ? <p className="font-sans text-[13px] text-red-800">{rateError}</p> : null}
        </div>
      </div>

      <p
        id={`${idPrefix}-total`}
        aria-live="polite"
        className="font-sans text-[14px] text-charcoal tabular-nums"
      >
        {taxed ? (
          <>
            {formatMoney(taxed.subtotalCents)} + {formatRate(taxed.taxRate)} tax{" "}
            {formatMoney(taxed.taxCents)} ={" "}
            <span className="font-semibold text-midnight">{formatMoney(taxed.totalCents)} total</span>
          </>
        ) : !rateValid ? (
          <span className="text-red-800">Enter a tax rate from 0 to 25.</span>
        ) : (
          <span className="text-charcoal/60">Enter a price to see the total with tax.</span>
        )}
      </p>
      {priceHint ? <p className="font-sans text-[13px] text-charcoal/60">{priceHint}</p> : null}
    </div>
  );
}

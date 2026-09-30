"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { setQuotePrice, type PriceFormState } from "@/lib/admin/edit-actions";
import { formatMoney, formatPickup } from "@/lib/admin/format";
import type { Quote } from "@/lib/api/types";

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  // Outlined: the page's gold action is the status step beside it.
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm border border-midnight bg-white px-5 py-2.5 font-sans text-[14px] font-semibold text-midnight transition-colors hover:bg-grey disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

/**
 * The price agreed with the customer.
 *
 * Saving a price on a request at `new` or `pending` moves it to `quoted`. With
 * the box ticked the customer is emailed the figure and their tracking link,
 * and the tracking page shows it from then on. Clearing the field removes it.
 */
export function QuotePricePanel({ quote }: { quote: Quote }) {
  const [state, formAction] = useActionState<PriceFormState, FormData>(setQuotePrice, {
    status: "idle",
  });

  const priced = quote.agreedPriceCents !== null;

  return (
    <section className="rounded-sm border border-midnight/10 bg-white p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase">
          Agreed price
        </h2>
        {priced && quote.pricedAt ? (
          <p className="font-sans text-[13px] text-charcoal/60">Set {formatPickup(quote.pricedAt)}</p>
        ) : null}
      </div>

      {priced ? (
        <p className="font-display mt-3 text-[34px] leading-none font-semibold text-midnight tabular-nums">
          {formatMoney(quote.agreedPriceCents)}
        </p>
      ) : (
        <p className="mt-2 max-w-2xl font-sans text-[14px] leading-[1.7] text-charcoal/80">
          No price yet. Enter the figure agreed with the customer.
        </p>
      )}

      {/* Once paid, the figure is what the customer was charged; changing it
          here would leave the record disagreeing with Stripe. */}
      {quote.paymentStatus === "paid" ? (
        <p className="mt-4 max-w-2xl font-sans text-[14px] leading-normal text-charcoal/80">
          Paid, so the price is locked. To change what the customer paid, refund
          in the Stripe Dashboard and mark the payment unpaid first.
        </p>
      ) : (
      <form action={formAction} className="mt-5 flex flex-col gap-4">
        <input type="hidden" name="id" value={quote.id} />
        <input type="hidden" name="currentStatus" value={quote.status} />

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="price"
              className="font-sans text-[13px] font-medium tracking-[0.06em] text-charcoal/70 uppercase"
            >
              {priced ? "Change price (USD)" : "Price (USD)"}
            </label>
            <input
              id="price"
              name="price"
              inputMode="decimal"
              placeholder="450"
              defaultValue={priced ? (quote.agreedPriceCents! / 100).toFixed(2) : ""}
              className="w-40 rounded-sm border border-midnight/20 bg-white px-4 py-2.5 font-sans text-[15px] text-midnight tabular-nums focus:border-midnight focus:outline-none"
            />
          </div>
          <SaveButton label={priced ? "Update price" : "Save price"} />
        </div>

        {/* How the agreed price will be paid. Card means the customer gets a
            signed Stripe payment link; cash means the chauffeur collects. */}
        <fieldset className="flex flex-col gap-2">
          <legend className="font-sans text-[13px] font-medium tracking-[0.06em] text-charcoal/70 uppercase">
            Payment
          </legend>
          <div className="mt-1 flex flex-wrap gap-5">
            {[
              { value: "card", label: "Card (Stripe payment link)" },
              { value: "cash", label: "Cash on delivery" },
            ].map((option) => (
              <label key={option.value} className="flex items-center gap-2 font-sans text-[14px] text-charcoal">
                <input
                  type="radio"
                  name="paymentMethod"
                  value={option.value}
                  defaultChecked={(quote.paymentMethod ?? "card") === option.value}
                  className="h-4 w-4 accent-midnight"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex items-start gap-2.5 font-sans text-[14px] leading-normal text-charcoal">
          <input type="checkbox" name="notify" defaultChecked className="mt-0.5 h-4 w-4 shrink-0 accent-midnight" />
          Email the customer the price — with a Stripe payment link when paying by card
        </label>

        {state.status === "error" ? (
          <p role="alert" className="font-sans text-[13px] text-red-800">
            {state.message}
          </p>
        ) : state.status === "saved" ? (
          <p role="status" className="font-sans text-[13px] text-green-800">
            {state.message}
          </p>
        ) : null}
      </form>
      )}
    </section>
  );
}

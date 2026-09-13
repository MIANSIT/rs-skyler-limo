"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { sendQuote, type PricingFormState } from "@/lib/admin/pricing-actions";
import type { Booking } from "@/lib/api/types";
import { formatMoney, formatPickup } from "@/lib/admin/format";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-gold px-6 py-3 font-sans text-[15px] font-semibold text-midnight transition-colors hover:bg-gold/90 disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

/**
 * Where a request that has no published fare gets one.
 *
 * Only rendered for `quote` bookings. A `fixed` booking already carries the
 * fare the customer was shown and agreed to, and re-pricing it here would mean
 * changing a number they have in writing.
 */
export function QuotePanel({ booking }: { booking: Booking }) {
  const [state, formAction] = useActionState<PricingFormState, FormData>(
    sendQuote,
    { status: "idle" },
  );

  const alreadyQuoted = booking.quotedTotalCents !== null;

  return (
    <section className="rounded-sm border border-midnight/10 bg-white p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase">
          {alreadyQuoted ? "Quoted fare" : "Price this request"}
        </h2>

        {alreadyQuoted && booking.quotedAt ? (
          <p className="font-sans text-[13px] text-charcoal/60">
            Quoted {formatPickup(booking.quotedAt)}
          </p>
        ) : null}
      </div>

      {alreadyQuoted ? (
        <p className="font-display mt-3 text-[34px] leading-none font-semibold text-midnight tabular-nums">
          {formatMoney(booking.quotedTotalCents!)}
        </p>
      ) : (
        <p className="mt-2 max-w-2xl font-sans text-[14px] leading-[1.7] text-charcoal/80">
          This trip has no published fare, so the customer has not been given a
          price. Enter one and it appears on their tracking page immediately —
          then call or email them to confirm it.
        </p>
      )}

      {alreadyQuoted && booking.quoteNote ? (
        <p className="mt-3 max-w-2xl border-l-2 border-gold pl-4 font-sans text-[15px] leading-[1.7] text-charcoal">
          {booking.quoteNote}
        </p>
      ) : null}

      <form action={formAction} className="mt-6 flex flex-col gap-5">
        <input type="hidden" name="id" value={booking.id} />

        <div className="grid gap-5 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="quote-total"
              className="font-sans text-[13px] font-medium tracking-[0.06em] text-charcoal/70 uppercase"
            >
              Fare (USD)
            </label>
            <div className="flex items-center gap-1.5">
              <span aria-hidden className="font-sans text-[15px] text-charcoal/50">
                $
              </span>
              <input
                id="quote-total"
                name="total"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                required
                defaultValue={
                  alreadyQuoted
                    ? Math.round(booking.quotedTotalCents! / 100)
                    : undefined
                }
                className="w-full rounded-sm border border-midnight/20 bg-white px-3 py-2.5 font-sans text-[15px] text-midnight tabular-nums focus:border-midnight focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="quote-note"
              className="font-sans text-[13px] font-medium tracking-[0.06em] text-charcoal/70 uppercase"
            >
              What it covers
            </label>
            <input
              id="quote-note"
              name="note"
              maxLength={2000}
              defaultValue={booking.quoteNote ?? ""}
              placeholder="Includes tolls and an hour of wait time."
              className="w-full rounded-sm border border-midnight/20 bg-white px-4 py-2.5 font-sans text-[15px] text-midnight placeholder:text-charcoal/40 focus:border-midnight focus:outline-none"
            />
            <p className="font-sans text-[13px] text-charcoal/60">
              The customer reads this next to the number, so write it for them.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-5">
          <SubmitButton label={alreadyQuoted ? "Update the quote" : "Send the quote"} />

          {state.status === "saved" ? (
            <p
              role="status"
              className="max-w-md font-sans text-[14px] leading-[1.6] text-green-800"
            >
              {state.message}
            </p>
          ) : null}

          {state.status === "error" ? (
            <p
              role="alert"
              className="border-l-2 border-red-700 bg-red-700/5 px-4 py-2.5 font-sans text-[14px] text-red-800"
            >
              {state.message}
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}

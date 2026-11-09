"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { recordRefund, type RefundFormState } from "@/lib/admin/edit-actions";
import { formatMoney, formatRelative } from "@/lib/admin/format";
import type { RefundsPayload } from "@/lib/api/types";

/**
 * Money sent back to a customer, recorded here after it has been sent.
 *
 * This page never moves money: the refund is made in the Stripe Dashboard (or in
 * cash), and this records what the operator did so the order, Reports and the
 * sales-tax figure agree with the bank. The amount is what Stripe refunded, sales
 * tax inside it. The tax part is suggested in proportion to what was paid and is
 * the operator's to change, down to nothing — keeping the tax on a partial
 * refund is a decision for the business, not for this form. Outlined buttons
 * only: the page's one gold action is the status step.
 */

const field =
  "w-full rounded-sm border border-midnight/20 bg-white px-3 py-2 font-sans text-[14px] text-midnight";
const label = "font-sans text-[13px] font-medium text-charcoal/70";

const toDollars = (cents: number) => (cents / 100).toFixed(2);

/** "12.50" → 1250. Anything that is not a plain amount counts as nothing. */
function toCents(raw: string): number {
  const value = Number(raw.replace(/[$,\s]/g, ""));
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : 0;
}

function RecordButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm border border-midnight/25 bg-white px-4 py-2 font-sans text-[14px] font-medium text-midnight transition-colors hover:border-midnight hover:bg-grey disabled:opacity-60"
    >
      {pending ? "Recording…" : "Record refund"}
    </button>
  );
}

function RefundForm({
  kind,
  id,
  summary,
}: {
  kind: "booking" | "quote";
  id: number;
  summary: RefundsPayload["summary"];
}) {
  const [state, action] = useActionState<RefundFormState, FormData>(recordRefund, { status: "idle" });

  // A full refund is the common case, so the form starts there. The tax part is
  // the same share of the amount as the tax was of what was paid, capped at the
  // tax still to return; typing in the tax box switches that suggestion off.
  const [amount, setAmount] = useState(toDollars(summary.remainingCents));
  const [tax, setTax] = useState(toDollars(summary.remainingTaxCents));
  const [taxEdited, setTaxEdited] = useState(false);

  const suggestTax = (typedAmount: string) => {
    const cents = toCents(typedAmount);
    const share =
      summary.paidCents > 0 ? Math.round((cents * summary.paidTaxCents) / summary.paidCents) : 0;
    return toDollars(Math.min(share, summary.remainingTaxCents, cents));
  };

  return (
    <form action={action} className="flex flex-col gap-4 border-t border-midnight/10 px-6 py-5">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />

      <p className="max-w-2xl font-sans text-[14px] leading-normal text-charcoal/80">
        Refund the customer in the Stripe Dashboard first, then record it here. Nothing on this page
        sends money to their card.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={label}>Amount refunded in Stripe ($)</span>
          <input
            name="amount"
            inputMode="decimal"
            required
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              if (!taxEdited) setTax(suggestTax(event.target.value));
            }}
            className={field}
          />
          <span className="font-sans text-[12px] text-charcoal/60 tabular-nums">
            Up to {formatMoney(summary.remainingCents)}, sales tax included.
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={label}>Of that, sales tax ($)</span>
          <input
            name="tax"
            inputMode="decimal"
            value={tax}
            onChange={(event) => {
              setTax(event.target.value);
              setTaxEdited(true);
            }}
            className={field}
          />
          <span className="font-sans text-[12px] text-charcoal/60 tabular-nums">
            Your call: set 0 to keep the tax. At most {formatMoney(summary.remainingTaxCents)} left.
          </span>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={label}>Note (optional)</span>
        <input
          name="note"
          maxLength={500}
          placeholder="e.g. Cancelled by the customer 24 hours before pickup"
          className={field}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <RecordButton />
        {state.status === "error" ? (
          <p role="alert" className="font-sans text-[13px] text-red-800">
            {state.message}
          </p>
        ) : null}
        {state.status === "saved" ? (
          <p role="status" className="font-sans text-[13px] text-green-800">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

export function RefundPanel({
  kind,
  id,
  data,
}: {
  kind: "booking" | "quote";
  id: number;
  data: RefundsPayload;
}) {
  const { summary, refunds } = data;

  // Nothing was paid and nothing was returned: there is nothing to show.
  if (summary.paidCents === 0 && refunds.length === 0) return null;

  const net = summary.paidCents - summary.refundedCents;

  return (
    <section className="rounded-sm border border-midnight/10 bg-white">
      <h2 className="border-b border-midnight/10 px-6 py-4 font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase">
        Refunds
      </h2>

      <dl className="grid gap-1 px-6 py-4 font-sans text-[15px] tabular-nums">
        <div className="flex justify-between">
          <dt className="text-charcoal/70">Paid by the customer</dt>
          <dd className="text-midnight">{formatMoney(summary.paidCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-charcoal/70">Refunded</dt>
          <dd className="text-midnight">
            {summary.refundedCents > 0 ? `−${formatMoney(summary.refundedCents)}` : formatMoney(0)}
          </dd>
        </div>
        <div className="flex justify-between font-semibold">
          <dt className="text-midnight">Kept</dt>
          <dd className="text-midnight">{formatMoney(net)}</dd>
        </div>
      </dl>

      {refunds.length > 0 ? (
        <ul className="divide-y divide-midnight/8 border-t border-midnight/10">
          {refunds.map((refund) => (
            <li key={refund.id} className="px-6 py-3 font-sans text-[14px]">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="font-medium text-midnight tabular-nums">
                  {formatMoney(refund.amountCents)} refunded
                  <span className="ml-2 font-normal text-charcoal/60">
                    {refund.taxCents > 0
                      ? `incl. ${formatMoney(refund.taxCents)} sales tax`
                      : "no sales tax returned"}
                  </span>
                </span>
                <span className="text-[13px] text-charcoal/50">
                  {refund.recordedBy ?? "System"} · {formatRelative(refund.createdAt)}
                </span>
              </div>
              {refund.note ? <p className="mt-1 text-charcoal/80">{refund.note}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}

      {summary.remainingCents > 0 ? (
        // Remounts after each recorded refund so the fields restart from what is left.
        <RefundForm
          key={`${refunds.length}-${summary.remainingCents}`}
          kind={kind}
          id={id}
          summary={summary}
        />
      ) : (
        <p className="border-t border-midnight/10 px-6 py-4 font-sans text-[14px] text-charcoal/70">
          Everything the customer paid has been refunded.
        </p>
      )}
    </section>
  );
}

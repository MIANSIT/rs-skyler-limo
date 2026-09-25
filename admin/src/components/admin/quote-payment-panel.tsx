"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { DetailRow } from "@/components/admin/detail-row";
import { PaymentLinkBox } from "@/components/admin/payment-panel";
import { updateQuotePayment, type EditFormState } from "@/lib/admin/edit-actions";
import { formatPayment, formatPickup } from "@/lib/admin/format";
import type { Quote } from "@/lib/api/types";

function PaymentButton({
  name,
  value,
  children,
}: {
  name: "paymentMethod" | "paymentStatus";
  value: string;
  children: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className="rounded-sm border border-midnight/25 bg-white px-4 py-2 font-sans text-[14px] font-medium text-midnight transition-colors hover:border-midnight hover:bg-grey disabled:opacity-60"
    >
      {children}
    </button>
  );
}

/**
 * How a quote request's agreed price will be paid, and whether it is in — the
 * quote-request counterpart of a booking's Payment panel. Only shown once a
 * price is agreed: before that there is nothing to pay.
 *
 * A Stripe payment marks itself paid; cash on the day is recorded here.
 */
export function QuotePaymentPanel({ quote }: { quote: Quote }) {
  const [state, action] = useActionState<EditFormState, FormData>(updateQuotePayment, {
    status: "idle",
  });

  const paid = quote.paymentStatus === "paid";
  const cash = quote.paymentMethod === "cash";

  return (
    <section className="rounded-sm border border-midnight/10 bg-white">
      <h2 className="border-b border-midnight/10 px-6 py-4 font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase">
        Payment
      </h2>
      <dl className="divide-y divide-midnight/8">
        <DetailRow
          label="Method"
          value={quote.paymentMethod ? formatPayment(quote.paymentMethod) : "Not chosen yet"}
        />
        <DetailRow
          label="Status"
          value={
            paid && quote.paidAt
              ? `Paid · recorded ${formatPickup(quote.paidAt)}`
              : cash
                ? "Unpaid — collected on the day"
                : "Unpaid"
          }
        />
        {quote.stripePaymentIntentId ? (
          <DetailRow label="Stripe payment" value={quote.stripePaymentIntentId} numeric />
        ) : null}
      </dl>

      <form action={action} className="flex flex-wrap gap-2.5 border-t border-midnight/10 px-6 py-4">
        <input type="hidden" name="id" value={quote.id} />
        <PaymentButton name="paymentStatus" value={paid ? "unpaid" : "paid"}>
          {paid ? "Mark unpaid" : "Mark paid"}
        </PaymentButton>
        {!paid ? (
          <PaymentButton name="paymentMethod" value={cash ? "card" : "cash"}>
            {cash ? "Switch to card" : "Switch to cash on delivery"}
          </PaymentButton>
        ) : null}
        {state.status === "error" ? (
          <p role="alert" className="w-full border-l-2 border-red-700 bg-red-700/5 px-3 py-2 font-sans text-[13px] text-red-800">
            {state.message}
          </p>
        ) : null}
      </form>

      {!paid && quote.paymentMethod === "card" && quote.status !== "lost" ? (
        <PaymentLinkBox kind="quote" id={quote.id} email={quote.customerEmail} />
      ) : null}
    </section>
  );
}

"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { DetailRow } from "@/components/admin/detail-row";
import { updateBookingPayment, type FormState } from "@/lib/admin/actions";
import { formatPayment, formatPickup } from "@/lib/admin/format";
import type { Booking } from "@/lib/api/types";

/**
 * How the customer chose to pay, and whether the money is in.
 *
 * A card payment through Stripe marks itself paid. Cash on delivery, or a card
 * taken over the phone, is recorded here by an operator. Both buttons are
 * outlined: the page's one gold action belongs to the booking's next status
 * step.
 */
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

export function PaymentPanel({ booking }: { booking: Booking }) {
  const [state, action] = useActionState<FormState, FormData>(
    updateBookingPayment,
    undefined,
  );

  const paid = booking.paymentStatus === "paid";
  const cash = booking.paymentMethod === "cash";

  return (
    <section className="rounded-sm border border-midnight/10 bg-white">
      <h2 className="border-b border-midnight/10 px-6 py-4 font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase">
        Payment
      </h2>
      <dl className="divide-y divide-midnight/8">
        <DetailRow label="Method" value={formatPayment(booking.paymentMethod)} />
        <DetailRow
          label="Status"
          value={
            paid && booking.paidAt
              ? `Paid · recorded ${formatPickup(booking.paidAt)}`
              : cash
                ? "Unpaid — the chauffeur collects at the end of the trip"
                : "Unpaid"
          }
        />
        {booking.stripePaymentIntentId ? (
          <DetailRow label="Stripe payment" value={booking.stripePaymentIntentId} numeric />
        ) : null}
      </dl>

      <form
        action={action}
        className="flex flex-wrap gap-2.5 border-t border-midnight/10 px-6 py-4"
      >
        <input type="hidden" name="id" value={booking.id} />
        <PaymentButton name="paymentStatus" value={paid ? "unpaid" : "paid"}>
          {paid ? "Mark unpaid" : "Mark paid"}
        </PaymentButton>
        {/* Changing the method after the money is in would rewrite how it was
            paid, so it is only offered while unpaid. */}
        {!paid ? (
          <PaymentButton name="paymentMethod" value={cash ? "card" : "cash"}>
            {cash ? "Switch to card" : "Switch to cash on delivery"}
          </PaymentButton>
        ) : null}

        {state?.error ? (
          <p
            role="alert"
            className="w-full border-l-2 border-red-700 bg-red-700/5 px-3 py-2 font-sans text-[13px] text-red-800"
          >
            {state.error}
          </p>
        ) : null}
      </form>
    </section>
  );
}

"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { DetailRow } from "@/components/admin/detail-row";
import { updateBookingPayment, type FormState } from "@/lib/admin/actions";
import { createPaymentLink, type PaymentLinkState } from "@/lib/admin/edit-actions";
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

function LinkButton({ intent, children }: { intent: "send" | "copy"; children: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      disabled={pending}
      className="rounded-sm border border-midnight/25 bg-white px-4 py-2 font-sans text-[14px] font-medium text-midnight transition-colors hover:border-midnight hover:bg-grey disabled:opacity-60"
    >
      {children}
    </button>
  );
}

/**
 * A signed Stripe payment link for this booking: emailed to the customer, or
 * shown here to paste into a text or WhatsApp message. The link opens a page
 * with the booking and one "Pay securely" button — no reference or phone to
 * type. It is tied to this price, so after a price change send a new one.
 */
export function PaymentLinkBox({
  kind,
  id,
  email,
}: {
  kind: "booking" | "quote";
  id: number;
  email: string;
}) {
  const [state, action] = useActionState<PaymentLinkState, FormData>(createPaymentLink, {
    status: "idle",
  });
  const [copied, setCopied] = useState(false);

  return (
    <div className="border-t border-midnight/10 px-6 py-5">
      <h3 className="font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/70 uppercase">
        Payment link
      </h3>
      <p className="mt-2 max-w-2xl font-sans text-[14px] leading-normal text-charcoal/80">
        The customer opens it, sees this {kind === "quote" ? "request" : "booking"} and pays by card on Stripe. Valid for 7 days, and only for the current price.
      </p>

      <form action={action} className="mt-4 flex flex-wrap gap-2.5">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="kind" value={kind} />
        <LinkButton intent="send">{`Email link to ${email}`}</LinkButton>
        <LinkButton intent="copy">Get link to copy</LinkButton>
      </form>

      {state.status === "error" ? (
        <p role="alert" className="mt-3 border-l-2 border-red-700 bg-red-700/5 px-3 py-2 font-sans text-[13px] text-red-800">
          {state.message}
        </p>
      ) : null}

      {state.status === "ready" ? (
        <div className="mt-4 flex flex-col gap-2">
          <p role="status" className="font-sans text-[13px] text-green-800">
            {state.sent ? "Emailed to the customer. " : ""}
            Valid until {new Date(state.expiresAt).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "long", day: "numeric" })}.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <label htmlFor="payment-link-url" className="sr-only">
              Payment link
            </label>
            <input
              id="payment-link-url"
              readOnly
              value={state.url}
              onFocus={(event) => event.currentTarget.select()}
              className="min-w-0 flex-1 rounded-sm border border-midnight/20 bg-grey px-3 py-2 font-mono text-[13px] text-midnight"
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(state.url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  // Clipboard refused (insecure context); the field is still selectable.
                }
              }}
              className="rounded-sm border border-midnight bg-white px-4 py-2 font-sans text-[14px] font-semibold text-midnight hover:bg-grey"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
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

      {/* Only where a link can actually be paid: card, priced, unpaid, live. */}
      {!paid && !cash && booking.quotedTotalCents !== null && booking.status !== "cancelled" ? (
        <PaymentLinkBox kind="booking" id={booking.id} email={booking.customerEmail} />
      ) : null}
    </section>
  );
}

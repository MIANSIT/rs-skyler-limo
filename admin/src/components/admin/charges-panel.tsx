"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { addBookingCharge, changeBookingCharge } from "@/lib/admin/charge-actions";
import { formatMoney, formatRate } from "@/lib/admin/format";
import { withTax } from "@/lib/admin/tax";
import type { Booking, Charge } from "@/lib/api/types";

/**
 * Extra charges on a booking, and what is still owing.
 *
 * The trip fare is shown first with whether it is paid, then each extra charge
 * the same way, then the totals — so a customer who paid in full by card shows
 * the fare as paid and only the new charges as not paid. An operator adds a
 * charge as a title and an amount, or by the minute for waiting time. The
 * payment link below covers whatever is unpaid.
 */

const PRESETS = ["Airport waiting time", "Extra drop-off", "Extra stop", "Late-night surcharge"];

const button =
  "rounded-sm border border-midnight/25 bg-white px-3 py-1.5 font-sans text-[13px] font-medium text-midnight transition-colors hover:border-midnight hover:bg-grey disabled:opacity-60";

function Submit({ children, ...rest }: React.ComponentProps<"button">) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={button} {...rest}>
      {children}
    </button>
  );
}

function Badge({ paid }: { paid: boolean }) {
  return (
    <span
      className={
        paid
          ? "rounded-sm bg-green-700/10 px-2 py-0.5 font-sans text-[12px] font-semibold text-green-800"
          : "rounded-sm bg-red-700/10 px-2 py-0.5 font-sans text-[12px] font-semibold text-red-800"
      }
    >
      {paid ? "Paid" : "Not paid"}
    </span>
  );
}

function ChargeRow({ bookingId, charge }: { bookingId: number; charge: Charge }) {
  const [state, action] = useActionState(changeBookingCharge, undefined);
  const paid = Boolean(charge.paidAt);

  return (
    <li className="px-6 py-3">
      <form action={action} className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <input type="hidden" name="id" value={bookingId} />
        <input type="hidden" name="chargeId" value={charge.id} />
        <span className="min-w-0 flex-1 font-sans text-[15px] text-midnight">{charge.title}</span>
        <span className="font-sans text-[15px] text-midnight tabular-nums">
          {formatMoney(charge.amountCents)}
          {charge.taxCents > 0 ? (
            <span className="ml-1.5 text-[12px] text-charcoal/60">
              incl. {formatMoney(charge.taxCents)} tax
            </span>
          ) : null}
        </span>
        <Badge paid={paid} />
        <Submit name="intent" value={paid ? "unpaid" : "paid"}>
          {paid ? "Mark unpaid" : "Mark paid"}
        </Submit>
        {/* A paid charge has had money taken against it, so it stays. */}
        {!paid ? (
          <Submit name="intent" value="remove">
            Remove
          </Submit>
        ) : null}
        {state?.error ? (
          <p role="alert" className="w-full font-sans text-[13px] text-red-800">
            {state.error}
          </p>
        ) : null}
      </form>
    </li>
  );
}

function AddCharge({ bookingId, taxRate }: { bookingId: number; taxRate: number }) {
  const [state, action] = useActionState(addBookingCharge, undefined);
  const [byMinute, setByMinute] = useState(false);
  const [minutes, setMinutes] = useState("");
  const [rate, setRate] = useState("");
  const [amount, setAmount] = useState("");

  const calculated =
    Number(minutes) > 0 && Number(rate) > 0 ? (Number(minutes) * Number(rate)).toFixed(2) : "";
  // A preview only: the API adds this booking's rate itself.
  const typed = Math.round(Number(byMinute ? calculated : amount) * 100);
  const preview = Number.isFinite(typed) && typed > 0 ? withTax(typed, taxRate) : null;
  const field =
    "w-full rounded-sm border border-midnight/20 bg-white px-3 py-2 font-sans text-[14px] text-midnight";
  const label = "font-sans text-[13px] font-medium text-charcoal/70";

  return (
    <form
      action={action}
      className="flex flex-col gap-4 border-t border-midnight/10 px-6 py-5"
    >
      <input type="hidden" name="id" value={bookingId} />

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <label className="flex flex-col gap-1.5">
          <span className={label}>Charge for</span>
          <input
            name="title"
            list="charge-presets"
            required
            maxLength={160}
            placeholder="e.g. Airport waiting time, 30 min"
            className={field}
          />
          <datalist id="charge-presets">
            {PRESETS.map((preset) => (
              <option key={preset} value={preset} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={label}>Amount before tax ($)</span>
          <input
            name="amount"
            inputMode="decimal"
            required
            value={byMinute ? calculated : amount}
            readOnly={byMinute}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="25.00"
            className={field}
          />
        </label>
      </div>

      {preview ? (
        <p className="font-sans text-[13px] text-charcoal/70 tabular-nums">
          {formatMoney(preview.subtotalCents)} + {formatMoney(preview.taxCents)} sales tax (
          {formatRate(taxRate)}) = <strong>{formatMoney(preview.totalCents)}</strong> charged
        </p>
      ) : null}

      <label className="flex items-center gap-2 font-sans text-[14px] text-charcoal/80">
        <input
          type="checkbox"
          checked={byMinute}
          onChange={(event) => setByMinute(event.target.checked)}
        />
        Charge by the minute (waiting time, delay)
      </label>

      {byMinute ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={label}>Minutes</span>
            <input
              inputMode="numeric"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              placeholder="30"
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Rate per minute ($)</span>
            <input
              inputMode="decimal"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              placeholder="1.00"
              className={field}
            />
          </label>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Submit>Add charge</Submit>
        {state?.error ? (
          <p role="alert" className="font-sans text-[13px] text-red-800">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}

export function ChargesPanel({ booking, charges }: { booking: Booking; charges: Charge[] }) {
  const farePaid = booking.paymentStatus === "paid";
  const fare = booking.quotedTotalCents ?? 0;
  const unpaidCharges = charges.filter((c) => !c.paidAt);

  const total = fare + charges.reduce((sum, c) => sum + c.amountCents, 0);
  const paid =
    (farePaid ? fare : 0) +
    charges.filter((c) => c.paidAt).reduce((sum, c) => sum + c.amountCents, 0);
  const owing = total - paid;
  const tax = (booking.quotedTotalCents !== null ? booking.taxCents : 0) +
    charges.reduce((sum, c) => sum + c.taxCents, 0);

  return (
    <section className="rounded-sm border border-midnight/10 bg-white">
      <h2 className="border-b border-midnight/10 px-6 py-4 font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase">
        Extra charges
      </h2>

      <ul className="divide-y divide-midnight/8">
        {booking.quotedTotalCents !== null ? (
          <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
            <span className="min-w-0 flex-1 font-sans text-[15px] text-midnight">
              Trip fare{booking.taxCents > 0 ? " (tax included)" : ""}
            </span>
            <span className="font-sans text-[15px] text-midnight tabular-nums">
              {formatMoney(fare)}
            </span>
            <Badge paid={farePaid} />
          </li>
        ) : null}
        {charges.map((charge) => (
          <ChargeRow key={charge.id} bookingId={booking.id} charge={charge} />
        ))}
        {charges.length === 0 ? (
          <li className="px-6 py-3 font-sans text-[14px] text-charcoal/70">
            No extra charges yet. Add one for waiting time, an extra drop-off or anything else
            that came up on the trip.
          </li>
        ) : null}
      </ul>

      {charges.length > 0 ? (
        <dl className="grid gap-1 border-t border-midnight/10 px-6 py-4 font-sans text-[15px] tabular-nums">
          <div className="flex justify-between">
            <dt className="text-charcoal/70">Before tax</dt>
            <dd className="text-midnight">{formatMoney(total - tax)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal/70">Sales tax ({formatRate(booking.taxRate)})</dt>
            <dd className="text-midnight">{formatMoney(tax)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal/70">Total</dt>
            <dd className="text-midnight">{formatMoney(total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-charcoal/70">Paid</dt>
            <dd className="text-midnight">{formatMoney(paid)}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt className="text-midnight">Not paid</dt>
            <dd className={owing > 0 ? "text-red-800" : "text-green-800"}>{formatMoney(owing)}</dd>
          </div>
          {unpaidCharges.length > 0 ? (
            <p className="mt-2 font-sans text-[13px] font-normal text-charcoal/70">
              The payment link below collects the unpaid amount.
            </p>
          ) : null}
        </dl>
      ) : null}

      <AddCharge bookingId={booking.id} taxRate={booking.taxRate} />
    </section>
  );
}

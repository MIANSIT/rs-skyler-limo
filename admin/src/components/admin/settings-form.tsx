"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { formatMoney } from "@/lib/admin/format";
import { saveSettings, type SettingsFormState } from "@/lib/admin/settings-actions";
import { withTax } from "@/lib/admin/tax";

function SaveButton() {
  const { pending } = useFormStatus();
  // The one gold action on this page: midnight text on gold, per the brand.
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-gold px-6 py-3 font-sans text-[15px] font-semibold text-midnight transition-colors hover:bg-gold/90 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save tax rate"}
    </button>
  );
}

export function SettingsForm({ taxRate }: { taxRate: number }) {
  const [state, formAction] = useActionState<SettingsFormState, FormData>(saveSettings, {
    status: "idle",
  });
  const [rate, setRate] = useState(String(taxRate));

  const rateNumber = Number(rate);
  const valid = rate.trim() !== "" && Number.isFinite(rateNumber) && rateNumber >= 0 && rateNumber <= 25;
  const example = valid ? withTax(10000, rateNumber) : null;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="taxRate"
          className="font-sans text-[13px] font-medium tracking-[0.06em] text-charcoal/70 uppercase"
        >
          Sales tax for new orders
        </label>
        <div className="flex items-center gap-1.5">
          <input
            id="taxRate"
            name="taxRate"
            inputMode="decimal"
            required
            value={rate}
            onChange={(event) => setRate(event.target.value)}
            aria-describedby="taxRate-example"
            className="w-32 rounded-sm border border-midnight/20 bg-white px-3 py-2.5 font-sans text-[15px] text-midnight tabular-nums focus:border-midnight focus:outline-none"
          />
          <span aria-hidden className="font-sans text-[15px] text-charcoal/50">
            %
          </span>
        </div>
        <p id="taxRate-example" className="font-sans text-[14px] text-charcoal tabular-nums">
          {example
            ? `A $100 fare becomes ${formatMoney(example.totalCents)} (${formatMoney(example.taxCents)} tax).`
            : "Enter a percentage from 0 to 25, with up to three decimals."}
        </p>
        {state.status === "error" && state.fields?.taxRate ? (
          <p className="font-sans text-[13px] text-red-800">{state.fields.taxRate}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-5">
        <SaveButton />
        {state.status === "saved" ? (
          <p role="status" className="max-w-md font-sans text-[14px] leading-[1.6] text-green-800">
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
  );
}

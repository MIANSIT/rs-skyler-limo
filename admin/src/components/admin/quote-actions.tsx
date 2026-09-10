"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { updateQuoteStatus, type FormState } from "@/lib/admin/actions";
import type { QuoteStatus } from "@/lib/api/types";

/** As on a booking: one gold action, and it is the obvious next move. */
const nextStep: Partial<
  Record<QuoteStatus, { status: QuoteStatus; label: string }>
> = {
  new: { status: "quoted", label: "Mark as quoted" },
  pending: { status: "quoted", label: "Mark as quoted" },
  quoted: { status: "won", label: "Mark as won" },
};

const secondarySteps: Record<QuoteStatus, QuoteStatus[]> = {
  new: ["pending", "lost"],
  pending: ["lost"],
  quoted: ["lost", "pending"],
  won: ["quoted"],
  lost: ["new", "quoted"],
};

const stepLabels: Record<QuoteStatus, string> = {
  new: "Reopen as new",
  quoted: "Mark as quoted",
  won: "Mark as won",
  lost: "Mark as lost",
  pending: "Hold as pending",
};

function StatusButton({
  status,
  label,
  variant,
}: {
  status: QuoteStatus;
  label: string;
  variant: "cta" | "outline";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="status"
      value={status}
      disabled={pending}
      className={
        variant === "cta"
          ? "w-full rounded-sm bg-gold px-5 py-3 font-sans text-[15px] font-semibold text-midnight transition-colors hover:bg-gold/90 disabled:opacity-60"
          : "w-full rounded-sm border border-midnight/25 bg-white px-5 py-2.5 font-sans text-[14px] font-medium text-midnight transition-colors hover:border-midnight hover:bg-grey disabled:opacity-60"
      }
    >
      {label}
    </button>
  );
}

export function QuoteActions({
  id,
  status,
  phone,
  email,
}: {
  id: number;
  status: QuoteStatus;
  phone: string;
  email: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    updateQuoteStatus,
    undefined,
  );

  const primary = nextStep[status];

  return (
    <aside className="flex flex-col gap-6 lg:sticky lg:top-8 lg:self-start">
      <div className="rounded-sm border border-midnight/10 bg-white p-6">
        <h2 className="font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase">
          Next step
        </h2>

        <form action={formAction} className="mt-4 flex flex-col gap-2.5">
          <input type="hidden" name="id" value={id} />

          <label htmlFor="quote-note" className="sr-only">
            Note for the record
          </label>
          <textarea
            id="quote-note"
            name="note"
            rows={2}
            placeholder="Optional note for the record"
            className="w-full resize-y rounded-sm border border-midnight/20 bg-white px-3 py-2 font-sans text-[14px] text-midnight placeholder:text-charcoal/40 focus:border-midnight focus:outline-none"
          />

          {primary ? (
            <StatusButton
              status={primary.status}
              label={primary.label}
              variant="cta"
            />
          ) : null}

          {secondarySteps[status].map((step) => (
            <StatusButton
              key={step}
              status={step}
              label={stepLabels[step]}
              variant="outline"
            />
          ))}

          {state?.error ? (
            <p
              role="alert"
              className="border-l-2 border-red-700 bg-red-700/5 px-3 py-2 font-sans text-[13px] text-red-800"
            >
              {state.error}
            </p>
          ) : null}
        </form>
      </div>

      <div className="rounded-sm border border-midnight/10 bg-white p-6">
        <h2 className="font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase">
          Reach the customer
        </h2>

        <div className="mt-4 flex flex-col gap-2.5">
          <a
            href={`tel:${phone.replace(/[^\d+]/g, "")}`}
            className="block w-full rounded-sm border border-midnight bg-white px-5 py-2.5 text-center font-sans text-[14px] font-semibold text-midnight tabular-nums transition-colors hover:bg-grey"
          >
            {phone}
          </a>
          <a
            href={`mailto:${email}`}
            className="block w-full truncate rounded-sm border border-midnight/25 bg-white px-5 py-2.5 text-center font-sans text-[14px] font-medium text-midnight transition-colors hover:border-midnight hover:bg-grey"
          >
            {email}
          </a>
        </div>
      </div>
    </aside>
  );
}

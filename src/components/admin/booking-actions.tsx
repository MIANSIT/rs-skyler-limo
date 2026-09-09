"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  addBookingNote,
  updateBookingStatus,
  type FormState,
} from "@/lib/admin/actions";
import type { BookingStatus } from "@/lib/api/types";

/**
 * The single next step for a request in each state. Whatever this returns is
 * the view's one gold action — everything else on the screen stays outlined,
 * so the page always answers "what do I do now" without being asked.
 */
const nextStep: Partial<
  Record<BookingStatus, { status: BookingStatus; label: string }>
> = {
  new: { status: "confirmed", label: "Confirm booking" },
  pending: { status: "confirmed", label: "Confirm booking" },
  confirmed: { status: "completed", label: "Mark completed" },
};

const secondarySteps: Record<BookingStatus, BookingStatus[]> = {
  new: ["pending", "cancelled"],
  pending: ["cancelled"],
  confirmed: ["pending", "cancelled"],
  completed: ["confirmed"],
  cancelled: ["new", "confirmed"],
};

const stepLabels: Record<BookingStatus, string> = {
  new: "Reopen as new",
  confirmed: "Confirm",
  completed: "Mark completed",
  cancelled: "Cancel booking",
  pending: "Hold as pending",
};

function StatusButton({
  status,
  label,
  variant,
}: {
  status: BookingStatus;
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

function NoteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-sm border border-midnight bg-white px-5 py-2.5 font-sans text-[14px] font-semibold text-midnight transition-colors hover:bg-grey disabled:opacity-60"
    >
      {pending ? "Saving…" : "Add note"}
    </button>
  );
}

export function BookingActions({
  id,
  status,
  phone,
}: {
  id: number;
  status: BookingStatus;
  phone: string;
}) {
  const [statusState, statusAction] = useActionState<FormState, FormData>(
    updateBookingStatus,
    undefined,
  );
  const [noteState, noteAction] = useActionState<FormState, FormData>(
    addBookingNote,
    undefined,
  );

  const primary = nextStep[status];

  return (
    <aside className="flex flex-col gap-6 lg:sticky lg:top-8 lg:self-start">
      <div className="rounded-sm border border-midnight/10 bg-white p-6">
        <h2 className="font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase">
          Next step
        </h2>

        <form action={statusAction} className="mt-4 flex flex-col gap-2.5">
          <input type="hidden" name="id" value={id} />

          {/* Recorded against the status change so the history reads as one
              event rather than a change and an unexplained note. */}
          <label htmlFor="status-note" className="sr-only">
            Note for the record
          </label>
          <textarea
            id="status-note"
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

          {statusState?.error ? (
            <p
              role="alert"
              className="border-l-2 border-red-700 bg-red-700/5 px-3 py-2 font-sans text-[13px] text-red-800"
            >
              {statusState.error}
            </p>
          ) : null}
        </form>
      </div>

      <div className="rounded-sm border border-midnight/10 bg-white p-6">
        <h2 className="font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase">
          Reach the customer
        </h2>

        <a
          href={`tel:${phone.replace(/[^\d+]/g, "")}`}
          className="mt-4 block w-full rounded-sm border border-midnight bg-white px-5 py-2.5 text-center font-sans text-[14px] font-semibold text-midnight tabular-nums transition-colors hover:bg-grey"
        >
          {phone}
        </a>
      </div>

      <div className="rounded-sm border border-midnight/10 bg-white p-6">
        <h2 className="font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase">
          Leave a note
        </h2>

        <form action={noteAction} className="mt-4 flex flex-col gap-2.5">
          <input type="hidden" name="id" value={id} />
          <label htmlFor="note" className="sr-only">
            Note
          </label>
          <textarea
            id="note"
            name="note"
            rows={3}
            required
            placeholder="Customer called about the flight time…"
            className="w-full resize-y rounded-sm border border-midnight/20 bg-white px-3 py-2 font-sans text-[14px] text-midnight placeholder:text-charcoal/40 focus:border-midnight focus:outline-none"
          />
          <NoteButton />

          {noteState?.error ? (
            <p
              role="alert"
              className="border-l-2 border-red-700 bg-red-700/5 px-3 py-2 font-sans text-[13px] text-red-800"
            >
              {noteState.error}
            </p>
          ) : null}
        </form>
      </div>
    </aside>
  );
}

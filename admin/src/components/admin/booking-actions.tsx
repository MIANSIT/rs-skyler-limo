"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { ConfirmDialog, type ConfirmTone } from "@/components/admin/confirm-dialog";
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
  // A quoted trip is waiting on the customer to accept the fare; confirming is
  // still the move once they do.
  quoted: { status: "confirmed", label: "Confirm booking" },
  pending: { status: "confirmed", label: "Confirm booking" },
  confirmed: { status: "completed", label: "Mark completed" },
};

const secondarySteps: Record<BookingStatus, BookingStatus[]> = {
  new: ["pending", "cancelled"],
  quoted: ["pending", "cancelled"],
  // Pending is where an opened booking waits; it goes on to Confirm or Cancel.
  pending: ["cancelled"],
  confirmed: ["pending", "cancelled"],
  completed: ["confirmed"],
  // One way back, to Pending (not New, which means "nobody has opened it", and
  // not straight to Confirmed): an operator reviews it, then confirms.
  cancelled: ["pending"],
};

const stepLabels: Record<BookingStatus, string> = {
  new: "Reopen as new",
  quoted: "Back to quoted",
  confirmed: "Confirm",
  completed: "Mark completed",
  cancelled: "Cancel booking",
  pending: "Hold as pending",
};

/**
 * The moves that are hard to take back or that tell the customer something.
 * Anything not listed (hold as pending, reopen) goes straight through.
 */
const CONFIRM_COPY: Partial<
  Record<
    BookingStatus,
    { title: string; body: string; action: string; cancel: string; tone: ConfirmTone }
  >
> = {
  confirmed: {
    title: "Confirm this booking?",
    body: "It will be marked Confirmed and counted as a booking.",
    action: "Confirm booking",
    cancel: "Go back",
    tone: "primary",
  },
  completed: {
    title: "Mark this trip as completed?",
    body: "Use this once the trip has been driven.",
    action: "Mark completed",
    cancel: "Go back",
    tone: "primary",
  },
  cancelled: {
    title: "Cancel this booking?",
    body: "It will be marked Cancelled. You can reopen it later if this was a mistake.",
    action: "Cancel booking",
    cancel: "Keep booking",
    tone: "danger",
  },
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Whether the customer will be emailed, read from the tick box when the
  // dialog opens, since that box is easy to miss.
  const [asking, setAsking] = useState<{ emails: boolean } | null>(null);
  const copy = CONFIRM_COPY[status];

  return (
    <>
      <button
        ref={buttonRef}
        type="submit"
        name="status"
        value={status}
        disabled={pending}
        onClick={(event) => {
          if (!copy) return;
          event.preventDefault();
          const notify = event.currentTarget.form?.elements.namedItem("notify");
          setAsking({ emails: notify instanceof HTMLInputElement && notify.checked });
        }}
        className={
          variant === "cta"
            ? "w-full rounded-sm bg-gold px-5 py-3 font-sans text-[15px] font-semibold text-midnight transition-colors hover:bg-gold/90 disabled:opacity-60"
            : "w-full rounded-sm border border-midnight/25 bg-white px-5 py-2.5 font-sans text-[14px] font-medium text-midnight transition-colors hover:border-midnight hover:bg-grey disabled:opacity-60"
        }
      >
        {label}
      </button>

      {copy ? (
        <ConfirmDialog
          open={asking !== null}
          title={copy.title}
          body={copy.body}
          note={
            asking?.emails
              ? "The customer will be emailed about this change."
              : "The customer will not be emailed."
          }
          confirmLabel={copy.action}
          cancelLabel={copy.cancel}
          tone={copy.tone}
          onCancel={() => setAsking(null)}
          onConfirm={() => {
            setAsking(null);
            // `requestSubmit` with the button as submitter sends its name and
            // value exactly as a real click would, without re-running onClick.
            const button = buttonRef.current;
            button?.form?.requestSubmit(button);
          }}
        />
      ) : null}
    </>
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
            placeholder="Optional note for the record — never emailed"
            className="w-full resize-y rounded-sm border border-midnight/20 bg-white px-3 py-2 font-sans text-[14px] text-midnight placeholder:text-charcoal/40 focus:border-midnight focus:outline-none"
          />

          {/* Ticked by default: a customer should hear when their booking is
              confirmed, cancelled or finished. Untick to correct a mistake
              quietly. Statuses that tell the customer nothing never email. */}
          <label className="flex items-start gap-2.5 font-sans text-[14px] leading-normal text-charcoal">
            <input
              type="checkbox"
              name="notify"
              defaultChecked
              className="mt-0.5 h-4 w-4 shrink-0 accent-midnight"
            />
            Email the customer about this change, with their tracking link
          </label>

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
              label={status === "cancelled" ? "Reopen booking" : stepLabels[step]}
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

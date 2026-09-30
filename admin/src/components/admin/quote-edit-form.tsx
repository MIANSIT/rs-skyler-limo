"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { ErrorBanner, Field, FormSection, control } from "@/components/admin/edit-fields";
import { updateQuoteDetails, type EditFormState } from "@/lib/admin/edit-actions";
import type { Quote } from "@/lib/api/types";

/** Mirrors `serviceTypes` in `api/src/schemas.ts`. */
const SERVICE_TYPES = [
  { value: "corporate", label: "Corporate account" },
  { value: "wedding", label: "Wedding" },
  { value: "event", label: "Event" },
  { value: "hourly", label: "Hourly charter" },
  { value: "other", label: "Something else" },
];

function SaveButton() {
  const { pending } = useFormStatus();

  // The page's one gold action.
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-gold px-6 py-3 font-sans text-[15px] font-semibold text-midnight transition-colors hover:bg-gold/90 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

/**
 * Corrects a quote request — a misheard phone number, a date that moved, the
 * details of what they now want. The price and the status have their own
 * controls on the request page, with the customer email that goes with them.
 * Nothing is emailed from here.
 */
export function QuoteEditForm({ quote }: { quote: Quote }) {
  const [state, formAction] = useActionState<EditFormState, FormData>(
    updateQuoteDetails,
    { status: "idle" },
  );

  const fieldError = (name: string) =>
    state.status === "error" ? state.fields?.[name] : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <input type="hidden" name="id" value={quote.id} />

      <FormSection title="The customer">
        <Field label="Name" id="customerName" error={fieldError("customerName")}>
          <input id="customerName" name="customerName" required maxLength={160} defaultValue={quote.customerName} className={control} />
        </Field>
        <Field label="Phone" id="customerPhone" error={fieldError("customerPhone")} hint="Also what the customer tracks the request with.">
          <input id="customerPhone" name="customerPhone" type="tel" required maxLength={40} defaultValue={quote.customerPhone} className={control} />
        </Field>
        <Field label="Email" id="customerEmail" error={fieldError("customerEmail")}>
          <input id="customerEmail" name="customerEmail" type="email" required maxLength={255} defaultValue={quote.customerEmail} className={control} />
        </Field>
        <Field label="Company" id="company" error={fieldError("company")} hint="Optional.">
          <input id="company" name="company" maxLength={160} defaultValue={quote.company ?? ""} className={control} />
        </Field>
      </FormSection>

      <FormSection title="The request">
        <Field label="Service" id="serviceType" error={fieldError("serviceType")}>
          <select id="serviceType" name="serviceType" defaultValue={quote.serviceType} className={control}>
            {SERVICE_TYPES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Event date" id="eventDate" error={fieldError("eventDate")} hint="Leave blank if not known yet.">
          <input id="eventDate" name="eventDate" type="date" defaultValue={quote.eventDate ?? ""} className={control} />
        </Field>
        <Field label="Passengers" id="passengers" error={fieldError("passengers")} hint="Optional.">
          <input id="passengers" name="passengers" type="number" min={1} max={500} defaultValue={quote.passengers ?? ""} className={control} />
        </Field>
        <div aria-hidden className="hidden sm:block" />
        <Field label="Details" id="details" error={fieldError("details")} className="sm:col-span-2">
          <textarea id="details" name="details" rows={6} required maxLength={5000} defaultValue={quote.details} className={`${control} resize-y`} />
        </Field>
        <Field label="Note for the record" id="note" hint="Why you made this change. Kept in the history, never emailed." className="sm:col-span-2">
          <textarea id="note" name="note" rows={2} maxLength={2000} className={`${control} resize-y`} />
        </Field>
      </FormSection>

      {state.status === "error" ? <ErrorBanner message={state.message} /> : null}

      <div className="flex flex-wrap items-center gap-4">
        <SaveButton />
        <Link
          href={`/quotes/${quote.id}`}
          className="px-2 py-3 font-sans text-[15px] text-charcoal/70 underline-offset-4 hover:text-midnight hover:underline"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

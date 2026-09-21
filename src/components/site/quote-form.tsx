"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { contact } from "@/lib/content";
import { submitQuote, type QuoteFormState } from "@/lib/public/actions";
import {
  pickupProblems,
  shortDay,
  useNewYorkClock,
} from "@/lib/public/use-new-york-clock";

/**
 * The public end of the quote pipeline.
 *
 * `POST /api/quotes` and the dashboard's Quotes screens were built long before
 * anything on the site called them: the corporate page had a `<form>` with no
 * action that silently discarded every submission, and the weddings page ended
 * in a `mailto:` link. This component is the missing half.
 *
 * It is deliberately one component used in three places rather than three
 * near-identical forms. A quote is a quote; only the default service type and
 * the surrounding copy change.
 */

/** Mirrors `serviceTypes` in `api/src/schemas.ts`. Changing one changes both. */
export type QuoteServiceType =
  | "corporate"
  | "wedding"
  | "event"
  | "hourly"
  | "other";

const serviceLabels: Record<QuoteServiceType, string> = {
  corporate: "Corporate account",
  wedding: "Wedding",
  event: "Event",
  hourly: "Hourly charter",
  other: "Something else",
};

const serviceOrder: QuoteServiceType[] = [
  "corporate",
  "wedding",
  "event",
  "hourly",
  "other",
];

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="cta"
      size="lg"
      disabled={pending}
      className="sm:self-start"
    >
      {pending ? "Sending…" : label}
    </Button>
  );
}

export function QuoteForm({
  defaultServiceType = "other",
  /** Hides the service picker when the page itself already decided it. */
  lockService = false,
  /** Shown when the service type is locked, so the customer still sees it. */
  submitLabel = "Request a quote",
  showCompany = true,
  showDate = true,
  detailsLabel = "Tell us about the trip",
  detailsHint = "Dates, pickup and destination, how many people, and anything that would change the price.",
}: {
  defaultServiceType?: QuoteServiceType;
  lockService?: boolean;
  submitLabel?: string;
  showCompany?: boolean;
  showDate?: boolean;
  detailsLabel?: string;
  detailsHint?: string;
}) {
  const [state, formAction] = useActionState<QuoteFormState, FormData>(
    submitQuote,
    { status: "idle" },
  );

  const dateRef = useRef<HTMLInputElement>(null);

  // New York's date, known in the browser only. Empty until then.
  const { today } = useNewYorkClock();

  // Controlled, so the reason a past date is refused is shown as soon as it is
  // chosen. The same message is set on the input so the form will not send.
  const [eventDate, setEventDate] = useState("");
  const dateProblem = pickupProblems(eventDate, "", today, "").date;

  useEffect(() => {
    dateRef.current?.setCustomValidity(dateProblem);
  }, [dateProblem]);

  const fieldError = (name: string) =>
    state.status === "error" ? state.fields?.[name] : undefined;

  /**
   * React blanks an uncontrolled form's fields once its action resolves, so a
   * rejected submission would otherwise wipe everything the customer typed.
   * The `key` on the form below remounts the subtree so these take effect —
   * a changed `defaultValue` alone does not move an already-mounted input.
   */
  const restore = (name: string) =>
    state.status === "error"
      ? { defaultValue: state.values[name] ?? "" }
      : undefined;

  if (state.status === "success") {
    return (
      <div className="border-l-2 border-gold bg-white p-6 md:p-8">
        <p className="font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/70 uppercase">
          Request received
        </p>
        <h3 className="font-display mt-3 text-[26px] leading-tight font-semibold text-midnight">
          Thank you — we have your details.
        </h3>
        <p className="mt-4 max-w-md text-[15px] leading-[1.7] text-charcoal">
          A reservations agent will review the trip and come back to you with a
          price. Your reference is below; quote it if you call before we reach
          you.
        </p>
        <p className="font-display mt-6 text-[30px] leading-none font-semibold text-midnight tabular-nums">
          {state.reference}
        </p>
        <p className="mt-6 text-[15px] text-charcoal">
          Need an answer sooner?{" "}
          <a
            href={contact.phoneHref}
            className="font-medium text-midnight underline underline-offset-4"
          >
            Call {contact.phone}
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form
      key={state.status === "error" ? state.attempt : 0}
      action={formAction}
      className="flex flex-col gap-5"
      noValidate={false}
    >
      {lockService ? (
        <input type="hidden" name="serviceType" value={defaultServiceType} />
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        {lockService ? null : (
          <Field
            label="What is this for"
            id="quote-service"
            className={showCompany ? undefined : "sm:col-span-2"}
            error={fieldError("serviceType")}
          >
            <Select
              id="quote-service"
              name="serviceType"
              defaultValue={
                state.status === "error"
                  ? (state.values.serviceType ?? defaultServiceType)
                  : defaultServiceType
              }
            >
              {serviceOrder.map((value) => (
                <option key={value} value={value}>
                  {serviceLabels[value]}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {showCompany ? (
          <Field label="Company" id="quote-company" hint="Optional.">
            <Input
              id="quote-company"
              name="company"
              autoComplete="organization"
              maxLength={160}
              {...restore("company")}
            />
          </Field>
        ) : null}

        <Field
          label="Name"
          id="quote-name"
          error={fieldError("customerName")}
        >
          <Input
            id="quote-name"
            name="name"
            autoComplete="name"
            required
            maxLength={160}
            {...restore("name")}
          />
        </Field>

        <Field
          label="Phone"
          id="quote-phone"
          hint="The number we should call you back on."
          error={fieldError("customerPhone")}
        >
          <Input
            id="quote-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            {...restore("phone")}
          />
        </Field>

        <Field
          label="Email"
          id="quote-email"
          className={showDate ? undefined : "sm:col-span-2"}
          error={fieldError("customerEmail")}
        >
          <Input
            id="quote-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={255}
            {...restore("email")}
          />
        </Field>

        {showDate ? (
          <Field
            label="Date"
            id="quote-date"
            hint={
              today
                ? `Optional. Today is ${shortDay(today)} in New York.`
                : "Optional if it is not fixed yet."
            }
            error={fieldError("eventDate") ?? (dateProblem || undefined)}
          >
            <Input
              id="quote-date"
              name="eventDate"
              type="date"
              ref={dateRef}
              min={today || undefined}
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
              aria-invalid={dateProblem ? true : undefined}
              aria-describedby={dateProblem ? "quote-date-error" : undefined}
            />
          </Field>
        ) : null}

        <Field
          label="Passengers"
          id="quote-passengers"
          hint="Optional."
          error={fieldError("passengers")}
        >
          <Input
            id="quote-passengers"
            name="passengers"
            type="number"
            min={1}
            max={500}
            inputMode="numeric"
            {...restore("passengers")}
          />
        </Field>
      </div>

      <Field
        label={detailsLabel}
        id="quote-details"
        hint={detailsHint}
        error={fieldError("details")}
      >
        <Textarea
          id="quote-details"
          name="details"
          required
          maxLength={5000}
          {...restore("details")}
        />
      </Field>

      <p className="text-[13px] leading-[1.6] text-charcoal/70">
        We use these details to price your trip and contact you about it. See
        our{" "}
        <Link
          href="/privacy"
          className="font-medium text-midnight underline underline-offset-4"
        >
          privacy policy
        </Link>
        .
      </p>

      <SubmitButton label={submitLabel} />

      {state.status === "error" ? (
        <p
          role="alert"
          className="border-l-2 border-red-700 bg-red-700/5 px-4 py-3 text-[15px] text-red-800"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

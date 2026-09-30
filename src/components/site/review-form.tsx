"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { FormGuard } from "@/components/site/form-guard";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { submitReview, type ReviewFormState } from "@/lib/public/actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="cta" size="lg" disabled={pending} className="sm:self-start">
      {pending ? "Sending…" : "Send my review"}
    </Button>
  );
}

const ratingLabels = ["Poor", "Fair", "Good", "Very good", "Excellent"];

/**
 * Five radio buttons that look like stars. Real inputs, so the keyboard, screen
 * readers and form submission all work without a script. Midnight, not gold: a
 * gold glyph is text on white and fails contrast.
 */
function RatingInput({ defaultValue, error }: { defaultValue: string; error?: string }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/70 uppercase">
        Your rating
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {ratingLabels.map((label, index) => {
          const value = String(index + 1);
          return (
            <label
              key={value}
              className="group relative flex min-h-12 min-w-12 cursor-pointer items-center gap-2 rounded-sm border border-midnight/20 bg-white px-3 py-2 font-sans text-[14px] text-midnight transition-colors hover:border-midnight has-[:checked]:border-midnight has-[:checked]:bg-midnight has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold"
            >
              <input
                type="radio"
                name="rating"
                value={value}
                required
                defaultChecked={defaultValue === value}
                className="sr-only"
              />
              <span aria-hidden>★</span>
              <span className="tabular-nums">{value}</span>
              <span className="hidden sm:inline">· {label}</span>
              <span className="sr-only sm:hidden">{label}</span>
            </label>
          );
        })}
      </div>
      {error ? <p className="text-[13px] text-red-800">{error}</p> : null}
    </fieldset>
  );
}

export function ReviewForm({ initialReference }: { initialReference: string }) {
  const [state, formAction] = useActionState<ReviewFormState, FormData>(
    submitReview,
    { status: "idle" },
  );

  if (state.status === "success") {
    return (
      <div role="status" className="border border-midnight/10 bg-grey p-6 md:p-8">
        <h2 className="font-display text-[26px] leading-snug font-semibold text-midnight">
          Thank you. Your review is in.
        </h2>
        <p className="mt-3 max-w-md text-[15px] leading-[1.7] text-charcoal">
          A member of our team reads each review before it is published, so it
          may take a little while to appear.
        </p>

        {state.googleReviewUrl ? (
          <div className="mt-8 border-t border-midnight/10 pt-6">
            <p className="max-w-md text-[15px] leading-[1.7] text-charcoal">
              If you are happy to, you can also share it on Google. It helps
              other travellers find us, and it is entirely up to you.
            </p>
            <div className="mt-5">
              <ButtonLink
                href={state.googleReviewUrl}
                variant="secondary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Review us on Google
              </ButtonLink>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const values = state.status === "error" ? state.values : {};
  const fields = state.status === "error" ? (state.fields ?? {}) : {};
  const key = state.status === "error" ? state.attempt : 0;

  return (
    <form
      action={formAction}
      key={key}
      className="flex flex-col gap-6 border border-midnight/10 p-6 md:p-8"
    >
      <FormGuard />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Booking reference"
          id="reference"
          hint="From your confirmation, like RS-4K2P9WD."
          error={fields.reference}
        >
          <Input
            id="reference"
            name="reference"
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="RS-4K2P9WD"
            className="font-mono tracking-[0.08em] uppercase"
            defaultValue={values.reference ?? initialReference}
          />
        </Field>

        <Field
          label="Phone number"
          id="phone"
          hint="The number on the booking."
          error={fields.phone}
        >
          <Input
            id="phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="(212) 555-0123"
            defaultValue={values.phone ?? ""}
          />
        </Field>
      </div>

      <RatingInput defaultValue={values.rating ?? ""} error={fields.rating} />

      <Field
        label="Your review"
        id="comment"
        hint="What went well, and anything we could do better."
        error={fields.comment}
      >
        <Textarea
          id="comment"
          name="comment"
          required
          minLength={10}
          maxLength={1500}
          rows={5}
          defaultValue={values.comment ?? ""}
        />
      </Field>

      <Field
        label="Name to show (optional)"
        id="displayName"
        hint="Leave blank and we show your first name and last initial."
        error={fields.displayName}
      >
        <Input
          id="displayName"
          name="displayName"
          maxLength={80}
          autoComplete="off"
          defaultValue={values.displayName ?? ""}
        />
      </Field>

      {state.status === "error" ? (
        <p
          role="alert"
          className="border-l-2 border-red-700 bg-red-700/5 px-4 py-3 text-[14px] leading-[1.6] text-red-800"
        >
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";

import { Alert, Heading, Submit, TextButton } from "@/components/site/change-record";
import { Field, Input } from "@/components/ui/field";
import type { Changeability } from "@/lib/api/types";
import { contact } from "@/lib/content";
import { cancelStep, type CancelState } from "@/lib/public/cancel-actions";

/**
 * "Cancel this booking" on the tracking page, under the change form and on the
 * same deep-midnight ground.
 *
 * It uses the same emailed code as changing: a reference and a phone number are
 * easy to come by, an inbox is not, and cancelling is not something to undo by
 * accident. The API owns the rule (more than 6 hours before pickup, matching the
 * terms); this component only shows what it says. A paid booking is cancelled
 * and the office refunds it by hand, which the confirmation says plainly rather
 * than promising a timing it does not control.
 */
export function CancelRecord({
  kind,
  reference,
  phone,
  status,
  paid,
  cancel,
}: {
  kind: "booking" | "quote";
  reference: string;
  /** The phone number the lookup used; the API checks it again on every step. */
  phone: string;
  status: string;
  paid: boolean;
  cancel: Changeability;
}) {
  const [state, action] = useActionState<CancelState, FormData>(cancelStep, { step: "start" });
  const noun = kind === "booking" ? "booking" : "request";

  // Already cancelled, finished or closed: the lookup above says so, and the
  // change section gives the way forward. Nothing more to offer here.
  const finished = ["cancelled", "completed", "won", "lost"].includes(status);
  if (finished && state.step !== "done") return null;

  if (!cancel.allowed && state.step !== "done") {
    return (
      <p className="mt-6 border-t border-white/15 pt-6 text-[15px] leading-[1.7] text-white/75">
        {cancel.reason}
      </p>
    );
  }

  return (
    <form action={action} className="mt-6 flex flex-col gap-5 border-t border-white/15 pt-6">
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="phone" value={phone} />

      {state.step === "start" ? (
        <>
          <div>
            <Heading>{`Need to cancel your ${noun}?`}</Heading>
            <p className="mt-2 max-w-lg text-[15px] leading-[1.7] text-white/75">
              {kind === "booking"
                ? "Cancelling is free more than 6 hours before pickup. We will email a 6-digit code to the address on the booking so only you can do it."
                : "We will email a 6-digit code to the address on the request so only you can close it."}
            </p>
          </div>
          {state.error ? <Alert>{state.error}</Alert> : null}
          <div>
            <Submit intent="send-code" pendingLabel="Sending the code…">
              {`Cancel this ${noun}`}
            </Submit>
          </div>
        </>
      ) : null}

      {state.step === "code" ? <CodeStep state={state} /> : null}

      {state.step === "confirm" ? (
        <>
          <div>
            <Heading>{`Cancel ${noun} ${reference}?`}</Heading>
            <p className="mt-2 max-w-lg text-[15px] leading-[1.7] text-white/75">
              {kind === "quote"
                ? "This closes your request. You can always send a new one."
                : paid
                  ? "You paid for this booking. Because you are cancelling more than 6 hours before pickup, there is no fee: we will refund what you paid, and a reservations agent will be in touch about it."
                  : "Nothing has been charged, so there is nothing to refund."}
            </p>
            <p className="mt-2 max-w-lg text-[15px] leading-[1.7] text-white/75">
              This cannot be undone online. To travel after all, you would need to book again.
            </p>
          </div>
          {state.error ? <Alert>{state.error}</Alert> : null}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Submit intent="confirm" pendingLabel="Cancelling…">
              {`Yes, cancel my ${noun}`}
            </Submit>
            <TextButton intent="back">{`Keep my ${noun}`}</TextButton>
          </div>
        </>
      ) : null}

      {state.step === "done" ? (
        <div role="status">
          <Heading>
            {state.kind === "booking" ? "Cancelled" : "Closed"}.{" "}
            <span className="whitespace-nowrap tabular-nums">{reference}</span> is{" "}
            {state.kind === "booking" ? "cancelled" : "closed"}.
          </Heading>
          <p className="mt-3 max-w-lg text-[15px] leading-[1.7] text-white/75">
            We have emailed you a confirmation.{" "}
            {state.wasPaid
              ? "Because you had paid, a reservations agent will be in touch about your refund."
              : "Nothing was charged."}{" "}
            Look it up again to see its status.
          </p>
        </div>
      ) : null}
    </form>
  );
}

function CodeStep({ state }: { state: Extract<CancelState, { step: "code" }> }) {
  const [now, setNow] = useState(() => Date.now());

  // A one-second tick for the resend countdown, stopped once it reaches zero.
  const waitUntil = state.sentAt + state.resendAfterSeconds * 1000;
  useEffect(() => {
    if (now >= waitUntil) return;
    const timer = setTimeout(() => setNow(Date.now()), 1000);
    return () => clearTimeout(timer);
  }, [now, waitUntil]);
  const wait = Math.max(0, Math.ceil((waitUntil - now) / 1000));

  return (
    <>
      <div>
        <Heading>Enter the code we emailed you</Heading>
        <p className="mt-2 max-w-lg text-[15px] leading-[1.7] text-white/75">
          We sent a 6-digit code to <span className="font-semibold text-white">{state.maskedEmail}</span>. It works
          for {state.expiresInMinutes} minutes.
        </p>
      </div>

      {state.notice ? (
        <p role="status" className="text-[14px] text-green-300">
          {state.notice}
        </p>
      ) : null}

      <Field tone="dark" label="Code" id="cancel-code" error={state.error}>
        <Input
          tone="dark"
          id="cancel-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          placeholder="123456"
          className="max-w-44 font-mono text-[20px] tracking-[0.3em] tabular-nums"
        />
      </Field>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Submit intent="verify" pendingLabel="Checking…">
          Continue
        </Submit>
        {wait > 0 ? (
          <span className="font-sans text-[14px] text-white/60 tabular-nums">Resend in {wait}s</span>
        ) : (
          <TextButton intent="send-code">Send a new code</TextButton>
        )}
        <TextButton intent="back">Back</TextButton>
      </div>

      <div className="border-l-2 border-white/25 pl-4 text-[14px] leading-[1.7] text-white/75">
        <p className="font-semibold text-white">Didn&rsquo;t get the code?</p>
        <p>
          Check your spam folder. It went to <span className="font-semibold">{state.maskedEmail}</span>. If that
          address is wrong, email us at{" "}
          <a href={`mailto:${contact.email}`} className="text-white underline underline-offset-4">
            {contact.email}
          </a>{" "}
          and we will correct it.
        </p>
      </div>
    </>
  );
}

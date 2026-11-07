"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { StatusBadge } from "@/components/admin/status-badge";
import { requestReview, type ReviewLinkState } from "@/lib/admin/edit-actions";
import type { BookingStatus } from "@/lib/api/types";

function ReviewButton({
  intent,
  locked,
  children,
}: {
  intent: "send" | "copy";
  /** The trip is not completed yet. */
  locked: boolean;
  children: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      disabled={pending || locked}
      className="rounded-sm border border-midnight/25 bg-white px-4 py-2 font-sans text-[14px] font-medium text-midnight transition-colors hover:border-midnight hover:bg-grey disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-midnight/25 disabled:hover:bg-white"
    >
      {pending && intent === "send" ? "Sending…" : children}
    </button>
  );
}

/**
 * Asks the customer of a completed trip to review it: emails the link, or shows
 * it to paste into a text or WhatsApp message. Always shown, but the buttons
 * stay disabled until the booking is Completed, with the current status beside
 * them so it is clear why. The API enforces the same rule, and refuses a second
 * request once the customer has reviewed. Both buttons are outlined — the
 * page's one gold action belongs to the booking's status step.
 */
export function ReviewRequestBox({
  id,
  email,
  status,
}: {
  id: number;
  email: string;
  status: BookingStatus;
}) {
  const locked = status !== "completed";
  const [state, action] = useActionState<ReviewLinkState, FormData>(requestReview, {
    status: "idle",
  });
  const [copied, setCopied] = useState(false);

  return (
    <section className="rounded-sm border border-midnight/10 bg-white">
      <h2 className="border-b border-midnight/10 px-6 py-4 font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase">
        Review
      </h2>
      <div className="px-6 py-5">
        <p className="max-w-2xl font-sans text-[14px] leading-normal text-charcoal/80">
          Ask the customer how the trip went. They enter this booking&rsquo;s reference and phone
          number, and the review waits in Reviews until you publish it. One review per booking.
        </p>

        {locked ? (
          <p
            role="status"
            className="mt-3 flex flex-wrap items-center gap-2 border-l-2 border-gold bg-grey px-3 py-2 font-sans text-[13px] text-charcoal"
          >
            Booking status: <StatusBadge status={status} />
            {status === "cancelled"
              ? "A cancelled trip can't be reviewed."
              : "These buttons switch on once the trip is marked Completed."}
          </p>
        ) : null}

        <form action={action} className="mt-4 flex flex-wrap gap-2.5">
          <input type="hidden" name="id" value={id} />
          <ReviewButton intent="send" locked={locked}>
            {`Email review link to ${email}`}
          </ReviewButton>
          <ReviewButton intent="copy" locked={locked}>
            Get link to copy
          </ReviewButton>
        </form>

        {state.status === "error" ? (
          <p
            role="alert"
            className="mt-3 border-l-2 border-red-700 bg-red-700/5 px-3 py-2 font-sans text-[13px] text-red-800"
          >
            {state.message}
          </p>
        ) : null}

        {state.status === "ready" ? (
          <div className="mt-4 flex flex-col gap-2">
            {state.requested ? (
              state.sent ? (
                <p role="status" className="font-sans text-[13px] text-green-800">
                  Emailed to the customer.
                </p>
              ) : (
                <p
                  role="alert"
                  className="border-l-2 border-red-700 bg-red-700/5 px-3 py-2 font-sans text-[13px] text-red-800"
                >
                  The email did not go out. Mail may be unconfigured or refused it — see the API
                  log. The link below still works.
                </p>
              )
            ) : null}
            <div className="flex flex-wrap gap-2.5">
              <label htmlFor="review-link-url" className="sr-only">
                Review link
              </label>
              <input
                id="review-link-url"
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
    </section>
  );
}

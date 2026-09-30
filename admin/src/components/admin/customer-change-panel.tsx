"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { markChangeReviewed, type FormState } from "@/lib/admin/actions";
import { formatRelative } from "@/lib/admin/format";
import type { ActivityEntry } from "@/lib/api/types";

function ReviewButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm border border-midnight bg-white px-5 py-2.5 font-sans text-[14px] font-semibold text-midnight transition-colors hover:bg-grey disabled:opacity-60"
    >
      {pending ? "Saving…" : "Mark as reviewed"}
    </button>
  );
}

/** "Label: before → after", one per line, as the API writes the history note. */
function parse(note: string | null) {
  return (note ?? "")
    .split("\n")
    .map((line) => {
      const match = /^([^:]+): (.*) → (.*)$/.exec(line);
      return match ? { label: match[1]!, before: match[2]!, after: match[3]! } : null;
    })
    .filter((item): item is { label: string; before: string; after: string } => item !== null);
}

/**
 * What the customer changed since someone last reviewed it, before → after,
 * above everything else on the page. Shown only while the tag is on.
 */
export function CustomerChangePanel({
  kind,
  id,
  activity,
}: {
  kind: "booking" | "quote";
  id: number;
  activity: ActivityEntry[];
}) {
  const [state, action] = useActionState<FormState, FormData>(markChangeReviewed, undefined);

  // Newest first: every customer change up to the last review.
  const unreviewed: ActivityEntry[] = [];
  for (const entry of activity) {
    if (entry.action === "change_reviewed") break;
    if (entry.action === "customer_changed") unreviewed.push(entry);
  }

  return (
    <section className="border-l-2 border-midnight bg-white px-6 py-5">
      <h2 className="font-sans text-[13px] font-semibold tracking-[0.08em] text-midnight uppercase">
        Changed by the customer
      </h2>
      <p className="mt-2 max-w-2xl font-sans text-[15px] leading-[1.7] text-charcoal/80">
        The customer changed this {kind === "quote" ? "quote request" : "booking"} themselves from the tracking page, after confirming the email on it with a
        one-time code. Check the changes, then mark them reviewed.
      </p>

      {unreviewed.map((entry) => (
        <div key={entry.id} className="mt-4">
          <p className="font-sans text-[13px] text-charcoal/60">
            {formatRelative(entry.createdAt)}
            {entry.toStatus ? ` · status ${entry.fromStatus} → ${entry.toStatus}` : ""}
          </p>
          <dl className="mt-2 divide-y divide-midnight/8 rounded-sm border border-midnight/10">
            {parse(entry.note).map((item) => (
              <div key={item.label} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <dt className="font-sans text-[13px] font-medium tracking-[0.06em] text-charcoal/60 uppercase">
                  {item.label}
                </dt>
                <dd className="font-sans text-[14px] break-words tabular-nums">
                  <span className="text-charcoal/60 line-through">{item.before}</span>
                  <span className="text-charcoal/40"> → </span>
                  <span className="font-semibold text-midnight">{item.after}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}

      <form action={action} className="mt-5 flex flex-wrap items-center gap-4">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="kind" value={kind} />
        <ReviewButton />
        {state?.error ? (
          <p role="alert" className="font-sans text-[13px] text-red-800">
            {state.error}
          </p>
        ) : null}
      </form>
    </section>
  );
}

import { clsx } from "@/lib/clsx";

/**
 * "Changed by customer": the booking or request was edited from /track and no
 * operator has reviewed it yet. A solid midnight chip so it stands apart from
 * the outlined status badges — it asks for attention, it is not a state.
 */
export function ChangedTag({ className }: { className?: string }) {
  return (
    <span
      title="The customer changed this from the tracking page. Open it to review."
      className={clsx(
        "inline-flex items-center rounded-sm bg-midnight px-2.5 py-1 font-sans text-[12px] font-medium tracking-[0.06em] whitespace-nowrap text-white uppercase",
        className,
      )}
    >
      Changed by customer
    </span>
  );
}

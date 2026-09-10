import { clsx } from "@/lib/clsx";
import type { BookingStatus, QuoteStatus } from "@/lib/api/types";

/**
 * Badges are not actions, so they do not spend the view's one gold fill. On
 * this white ground gold appears only as a border with midnight text — gold
 * text on white is 2.4:1 and never ships.
 *
 * Green and red are the sanctioned semantic exception to the five colours.
 */
const styles: Record<string, string> = {
  new: "border-gold bg-gold/10 text-midnight",
  confirmed: "border-green-700/40 bg-green-700/8 text-green-800",
  completed: "border-midnight/20 bg-grey text-charcoal",
  cancelled: "border-red-700/40 bg-red-700/8 text-red-800",
  pending: "border-charcoal/30 bg-white text-charcoal",
  quoted: "border-midnight/40 bg-midnight/5 text-midnight",
  won: "border-green-700/40 bg-green-700/8 text-green-800",
  lost: "border-red-700/40 bg-red-700/8 text-red-800",
};

const labels: Record<string, string> = {
  new: "New",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  pending: "Pending",
  quoted: "Quoted",
  won: "Won",
  lost: "Lost",
};

export function StatusBadge({
  status,
  className,
}: {
  status: BookingStatus | QuoteStatus | string;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-sm border px-2.5 py-1 font-sans text-[12px] font-medium tracking-[0.06em] uppercase",
        styles[status] ?? styles.pending,
        className,
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}

import { clsx } from "@/lib/clsx";

import { FIXED_FARE_AREA } from "@/lib/admin/fixed-fare-area";

/**
 * "Fixed fare outside {area}": this booking holds a published fare for an
 * address that today's rule would send through the quote process.
 *
 * Outlined, not solid: unlike `ChangedTag` nothing here is waiting on the
 * operator and nothing is wrong — the price was agreed under the previous rule
 * and still stands. It is context for whoever opens the booking.
 */
export function OutsideAreaTag({ className }: { className?: string }) {
  return (
    <span
      title={`This fixed fare was booked under the previous rule, when published fares covered all five boroughs. Published fares now cover ${FIXED_FARE_AREA} only. The agreed price stands — this is only here so you know why it does not match the current rate card.`}
      className={clsx(
        "inline-flex items-center rounded-sm border border-midnight/30 bg-white px-2.5 py-1 font-sans text-[12px] font-medium tracking-[0.06em] whitespace-nowrap text-charcoal uppercase",
        className,
      )}
    >
      Fixed fare outside {FIXED_FARE_AREA}
    </span>
  );
}

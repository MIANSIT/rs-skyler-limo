import Link from "next/link";

import { clsx } from "@/lib/clsx";
import { reportRanges, type ResolvedRange } from "@/lib/admin/report-range";

/**
 * Presets are links and the custom range is a plain GET form, so the period
 * lives in the URL like every other filter here: bookmarkable, shareable, and
 * the back button behaves. Same chips as `FilterBar`.
 */
export function PeriodPicker({ range }: { range: ResolvedRange }) {
  const chip =
    "rounded-sm border px-3 py-1.5 font-sans text-[13px] font-medium tracking-[0.04em] transition-colors";

  const field =
    "rounded-sm border border-midnight/20 bg-white px-3 py-1.5 font-sans text-[14px] text-midnight tabular-nums focus:border-midnight focus:outline-none";

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Report period" className="flex flex-wrap gap-2">
        {reportRanges.map((option) => (
          <Link
            key={option.key}
            href={`/?range=${option.key}`}
            aria-current={range.key === option.key ? "page" : undefined}
            className={clsx(
              chip,
              range.key === option.key
                ? "border-midnight bg-midnight text-white"
                : "border-midnight/20 bg-white text-charcoal hover:border-midnight/50",
            )}
          >
            {option.label}
          </Link>
        ))}
      </nav>

      {range.key === "custom" ? (
        <form action="/" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="range" value="custom" />
          <label className="flex flex-col gap-1 font-sans text-[12px] font-medium text-charcoal/70">
            From
            <input
              type="date"
              name="from"
              defaultValue={range.from}
              max={range.today}
              required
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1 font-sans text-[12px] font-medium text-charcoal/70">
            To
            <input
              type="date"
              name="to"
              defaultValue={range.to}
              max={range.today}
              required
              className={field}
            />
          </label>
          <button
            type="submit"
            className="rounded-sm border border-midnight bg-white px-4 py-1.5 font-sans text-[13px] font-semibold text-midnight transition-colors hover:bg-grey"
          >
            Show
          </button>
        </form>
      ) : null}
    </div>
  );
}

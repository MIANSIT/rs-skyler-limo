import { clsx } from "@/lib/clsx";
import { formatMoney, formatMonth, formatShortDate } from "@/lib/admin/format";

/**
 * Orders placed per day, or per month over a long period. One series, so the
 * heading names it and there is no legend. Bars are midnight, never gold: this
 * is a reading, not an action.
 *
 * Hover or focus a bar for its period, count and value. The same numbers sit in
 * a visually hidden table for screen readers.
 */
export function VolumeChart({
  points,
  bucket,
}: {
  points: { key: string; count: number; valueCents: number }[];
  bucket: "day" | "month";
}) {
  const max = Math.max(1, ...points.map((point) => point.count));
  const label = bucket === "day" ? formatShortDate : formatMonth;
  const edge = Math.min(3, Math.floor(points.length / 3));

  return (
    <div>
      <div className="relative mt-6 h-40" aria-hidden="true">
        {/* Recessive grid: a top line at the peak and the baseline. */}
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-midnight/10" />
        <span className="absolute -top-2.5 right-0 bg-white pl-2 font-sans text-[12px] text-charcoal/60 tabular-nums">
          {max}
        </span>
        <div className="absolute inset-x-0 bottom-0 border-t border-midnight/20" />

        <div className="absolute inset-0 flex items-end justify-center gap-0.5 pr-8">
          {points.map((point, index) => (
            <div
              key={point.key}
              tabIndex={0}
              className="group relative flex h-full max-w-16 flex-1 flex-col justify-end outline-none"
            >
              <div
                className={clsx(
                  "w-full rounded-t-sm transition-colors",
                  point.count > 0
                    ? "bg-midnight group-hover:bg-midnight/75 group-focus-visible:bg-midnight/75"
                    : "h-0.5 bg-midnight/15",
                )}
                style={point.count > 0 ? { height: `${(point.count / max) * 100}%` } : undefined}
              />
              <div
                className={clsx(
                  "pointer-events-none absolute bottom-full z-10 mb-2 hidden rounded-sm bg-midnight px-3 py-2 font-sans text-[12px] whitespace-nowrap text-white shadow-lg group-hover:block group-focus-visible:block",
                  index >= points.length - edge
                    ? "right-0"
                    : index < edge
                      ? "left-0"
                      : "left-1/2 -translate-x-1/2",
                )}
              >
                <span className="block font-medium">{label(point.key)}</span>
                <span className="block text-white/80 tabular-nums">
                  {point.count} {point.count === 1 ? "order" : "orders"}
                  {point.valueCents > 0 ? ` · ${formatMoney(point.valueCents)} priced` : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Same cells as the bars, so a label sits under its own bar. Every bar
          is labelled when there are few; otherwise first, middle and last. */}
      <div
        className="mt-2 flex justify-center gap-0.5 pr-8 font-sans text-[12px] text-charcoal/60"
        aria-hidden="true"
      >
        {points.map((point, index) => {
          const key =
            index === 0 ||
            index === points.length - 1 ||
            index === Math.floor(points.length / 2);
          const shown = key || points.length <= 8;
          const align =
            points.length <= 8
              ? "text-center"
              : index === 0
                ? "text-left"
                : index === points.length - 1
                  ? "text-right"
                  : "text-center";
          return (
            <span
              key={point.key}
              className={clsx("relative max-w-16 flex-1 overflow-visible whitespace-nowrap", align)}
            >
              {shown ? (
                <span
                  className={clsx(
                    "absolute top-0",
                    // Too many labels for a phone; the in-between ones wait for sm.
                    !key && "hidden sm:block",
                    align === "text-left"
                      ? "left-0"
                      : align === "text-right"
                        ? "right-0"
                        : "left-1/2 -translate-x-1/2",
                  )}
                >
                  {label(point.key)}
                </span>
              ) : null}
            </span>
          );
        })}
      </div>
      <div className="h-4" />

      <table className="sr-only">
        <caption>Orders placed per {bucket}</caption>
        <thead>
          <tr>
            <th scope="col">{bucket === "day" ? "Day" : "Month"}</th>
            <th scope="col">Orders</th>
            <th scope="col">Value priced</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.key}>
              <td>{label(point.key)}</td>
              <td>{point.count}</td>
              <td>{formatMoney(point.valueCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

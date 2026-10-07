import Link from "next/link";

import { formatMoney } from "@/lib/admin/format";

export type BreakdownRow = {
  key: string;
  label: string;
  count: number;
  valueCents?: number;
  href?: string;
};

/**
 * A labelled count with a bar for its share of the largest row. Magnitude only,
 * so every bar is the same midnight; the label and number carry identity, never
 * the colour. Rows with an `href` open the matching filtered list.
 */
export function BreakdownList({
  rows,
  emptyMessage,
}: {
  rows: BreakdownRow[];
  emptyMessage: string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.count));

  if (rows.length === 0) {
    return (
      <p className="py-6 text-center font-sans text-[15px] text-charcoal/60">{emptyMessage}</p>
    );
  }

  return (
    <ul className="flex flex-col">
      {rows.map((row) => {
        const body = (
          <>
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-sans text-[14px] font-medium text-midnight">{row.label}</span>
              <span className="font-sans text-[14px] text-charcoal tabular-nums">
                {row.count}
                {row.valueCents !== undefined && row.valueCents > 0 ? (
                  <span className="text-charcoal/60"> · {formatMoney(row.valueCents)}</span>
                ) : null}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-midnight/8">
              <div
                className="h-full rounded-full bg-midnight"
                style={{ width: row.count > 0 ? `${Math.max(2, (row.count / max) * 100)}%` : 0 }}
              />
            </div>
          </>
        );

        return (
          <li key={row.key}>
            {row.href ? (
              <Link
                href={row.href}
                className="-mx-3 block rounded-sm px-3 py-2.5 transition-colors hover:bg-grey"
              >
                {body}
              </Link>
            ) : (
              <div className="py-2.5">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

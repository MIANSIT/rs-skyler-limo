/**
 * The Reports page's period, as it lives in the URL: `?range=week`, or
 * `?range=custom&from=2026-09-01&to=2026-09-15`. Resolved to inclusive New
 * York dates here and handed to the API as `from`/`to`.
 */
export const reportRanges = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Custom" },
] as const;

export type ReportRangeKey = (typeof reportRanges)[number]["key"];

export const defaultReportRange: ReportRangeKey = "month";

const newYorkDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

function isDate(value: string | undefined): value is string {
  return !!value && isoDate.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function addDays(date: string, days: number): string {
  const [year = 1970, month = 1, day = 1] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Monday of the week `date` falls in — the business week, not Sunday's. */
function mondayOf(date: string): string {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(date, -((weekday + 6) % 7));
}

export type ResolvedRange = {
  key: ReportRangeKey;
  /** Undefined means from the first order. */
  from?: string;
  to: string;
  today: string;
};

export function resolveReportRange(
  params: { range?: string; from?: string; to?: string },
  now = new Date(),
): ResolvedRange {
  const today = newYorkDay.format(now);
  const key = reportRanges.some((range) => range.key === params.range)
    ? (params.range as ReportRangeKey)
    : defaultReportRange;

  switch (key) {
    case "today":
      return { key, from: today, to: today, today };
    case "week":
      return { key, from: mondayOf(today), to: today, today };
    case "month":
      return { key, from: `${today.slice(0, 7)}-01`, to: today, today };
    case "year":
      return { key, from: `${today.slice(0, 4)}-01-01`, to: today, today };
    case "all":
      return { key, to: today, today };
    case "custom": {
      // Anything missing or malformed falls back to this month so far; dates
      // entered the wrong way round are swapped rather than rejected.
      let from = isDate(params.from) ? params.from : `${today.slice(0, 7)}-01`;
      let to = isDate(params.to) ? params.to : today;
      if (from > to) [from, to] = [to, from];
      return { key, from, to, today };
    }
  }
}

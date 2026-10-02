/** Today's date in New York as `YYYY-MM-DD`. Trips happen in New York, not on the server's clock. */
const day = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function todayInNewYork(): string {
  return day.format(new Date());
}

/** The New York calendar date an instant falls on, as `YYYY-MM-DD`. */
export function newYorkDate(instant: Date): string {
  return day.format(instant);
}

const clock = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** How far New York is from UTC at an instant, in milliseconds. */
function offsetAt(instant: number): number {
  const parts = clock.formatToParts(new Date(instant));
  const field = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return (
    Date.UTC(
      field("year"),
      field("month") - 1,
      field("day"),
      field("hour"),
      field("minute"),
      field("second"),
    ) - instant
  );
}

/**
 * The instant that is midnight *in New York* on a `YYYY-MM-DD` date.
 *
 * Computed here rather than in SQL: `CONVERT_TZ` with a named zone needs the
 * MySQL timezone tables loaded, which a stock install does not have, and a
 * fixed offset would be wrong for half the year. Two passes, so a first guess
 * on the wrong side of a daylight-saving change is corrected.
 */
export function newYorkMidnight(date: string): Date {
  const [year = 1970, month = 1, dayOfMonth = 1] = date.split("-").map(Number);
  const midnightUtc = Date.UTC(year, month - 1, dayOfMonth);
  let start = midnightUtc - offsetAt(midnightUtc);
  start = midnightUtc - offsetAt(start);
  return new Date(start);
}

/** `YYYY-MM-DD` plus whole calendar days, with no clock involved. */
export function addDays(date: string, days: number): string {
  const [year = 1970, month = 1, dayOfMonth = 1] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, dayOfMonth + days)).toISOString().slice(0, 10);
}

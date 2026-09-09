/**
 * The booking form collects a date and a time with no zone, and the customer
 * means New York — they are being picked up in New York. Sending the browser's
 * local zone would book a 6 a.m. JFK run for 3 a.m. when the customer happens
 * to be in California the week before they fly.
 */
const TIME_ZONE = "America/New_York";

const parts = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** How far New York is from UTC at a given instant, in milliseconds. */
function offsetAt(instant: number): number {
  const formatted = parts.formatToParts(new Date(instant));
  const field = (type: string) =>
    Number(formatted.find((part) => part.type === type)?.value ?? 0);

  const asUtc = Date.UTC(
    field("year"),
    field("month") - 1,
    field("day"),
    field("hour"),
    field("minute"),
    field("second"),
  );

  return asUtc - instant;
}

/**
 * `2026-09-20` + `14:30` → `2026-09-20T18:30:00.000Z`.
 *
 * Solved rather than looked up: the first pass guesses the offset from the
 * naive instant, the second corrects it for the case where the guess landed on
 * the wrong side of a daylight-saving boundary.
 */
export function newYorkToIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  const naive = Date.parse(`${date}T${time}:00Z`);
  if (Number.isNaN(naive)) return null;

  let instant = naive - offsetAt(naive);
  instant = naive - offsetAt(instant);

  return new Date(instant).toISOString();
}

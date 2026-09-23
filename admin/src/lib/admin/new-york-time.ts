/**
 * New York wall-clock time ⇄ an instant, for the edit forms.
 *
 * A copy of the public site's `src/lib/public/new-york-time.ts` conversion —
 * the two apps deploy separately and share no code, the same arrangement as
 * the brand tokens. An operator edits a pickup in New York time, whatever
 * zone the dashboard happens to be open in.
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

function fields(instant: number) {
  const formatted = parts.formatToParts(new Date(instant));
  const field = (type: string) =>
    formatted.find((part) => part.type === type)?.value ?? "00";
  return {
    year: field("year"),
    month: field("month"),
    day: field("day"),
    hour: field("hour"),
    minute: field("minute"),
    second: field("second"),
  };
}

/** How far New York is from UTC at a given instant, in milliseconds. */
function offsetAt(instant: number): number {
  const f = fields(instant);
  const asUtc = Date.UTC(
    Number(f.year),
    Number(f.month) - 1,
    Number(f.day),
    Number(f.hour),
    Number(f.minute),
    Number(f.second),
  );
  return asUtc - instant;
}

/** `2026-09-20` + `14:30` (New York) → ISO instant, or null if malformed. */
export function newYorkToIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }
  const naive = Date.parse(`${date}T${time}:00Z`);
  if (Number.isNaN(naive)) return null;

  // Two passes: the second corrects a first guess that landed on the wrong
  // side of a daylight-saving change.
  let instant = naive - offsetAt(naive);
  instant = naive - offsetAt(instant);
  return new Date(instant).toISOString();
}

/** ISO instant → the New York date and time a form field shows. */
export function isoToNewYork(iso: string): { date: string; time: string } {
  const f = fields(Date.parse(iso));
  return { date: `${f.year}-${f.month}-${f.day}`, time: `${f.hour}:${f.minute}` };
}

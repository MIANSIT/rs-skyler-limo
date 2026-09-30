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

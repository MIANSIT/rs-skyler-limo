import { useSyncExternalStore } from "react";

import { newYorkToIso, nowInNewYork, todayInNewYork } from "./new-york-time";

/**
 * New York's date and time, for the browser only.
 *
 * The booking and quote pages can be prerendered, so a value read on the server
 * would be frozen at build time and lock the wrong day. `useSyncExternalStore`
 * gives the server an empty string and the browser the real value, so there is
 * no hydration mismatch and no stale date. Empty means "not known yet".
 *
 * It ticks every 15 seconds so a time that passes while the customer is still
 * filling in the form starts to be refused, and midnight rolls the date over.
 */
function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 15_000);
  return () => clearInterval(id);
}

export function useNewYorkClock(): { today: string; now: string } {
  const today = useSyncExternalStore(subscribe, todayInNewYork, () => "");
  const now = useSyncExternalStore(subscribe, nowInNewYork, () => "");
  return { today, now };
}

/** `2026-09-20` as `Sep 20`, for a hint. Pure: it formats the string it is given. */
export function shortDay(isoDay: string): string {
  return new Date(`${isoDay}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
}

export const PAST_DATE = "That date has passed in New York. Choose today or a later date.";
export const PAST_TIME = "That time has passed in New York. Choose a later time today.";

/**
 * Why a pick-up cannot be booked, or empty strings when it can.
 *
 * Pure, so the message can be shown while the customer types and the same
 * strings can set the inputs' own validity. Nothing is reported until the
 * browser's clock is known, and a missing time is left to `required`.
 */
export function pickupProblems(
  date: string,
  time: string,
  today: string,
  now: string,
): { date: string; time: string } {
  if (!today) return { date: "", time: "" };

  if (date !== "" && date < today) return { date: PAST_DATE, time: "" };

  if (date === today && time !== "" && now !== "" && time < now) {
    return { date: "", time: PAST_TIME };
  }

  return { date: "", time: "" };
}

/** `23:29` as `11:29 p.m.`, in the brand's own style. */
export function clockLabel(hhmm: string): string {
  const [h = "0", m = "00"] = hhmm.split(":");
  const hour = Number(h);
  const period = hour >= 12 ? "p.m." : "a.m.";
  return `${hour % 12 === 0 ? 12 : hour % 12}:${m} ${period}`;
}

/**
 * What a New York pick-up is on the customer's own device clock, for a hint.
 *
 * Never sent anywhere: the booking is always stored as New York time. This only
 * lets someone abroad check that the time they chose is the one they meant.
 * Returns an empty string when the device is already on New York time, or the
 * inputs are incomplete, so the hint appears only when it says something new.
 */
export function deviceEquivalent(date: string, time: string): string {
  const iso = newYorkToIso(date, time);
  if (!iso) return "";

  const instant = new Date(iso);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };

  const there = new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZone: "America/New_York",
  }).format(instant);
  const here = new Intl.DateTimeFormat("en-US", options).format(instant);
  if (there === here) return "";

  const parts = new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZoneName: "short",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  const period = get("dayPeriod").toLowerCase().replace(/^([ap])m$/, "$1.m.");

  return `${get("weekday")}, ${get("month")} ${get("day")}, ${get("hour")}:${get("minute")} ${period} ${get("timeZoneName")}`.trim();
}

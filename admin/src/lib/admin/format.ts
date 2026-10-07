/**
 * Every time in this dashboard is New York time, formatted on the server so it
 * cannot differ between the operator's screen and the driver's sheet. A pickup
 * rendered in the viewer's local zone is a car at the kerb an hour early.
 */
const TIME_ZONE = "America/New_York";

const dateTime = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

const dayOnly = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatPickup(iso: string): string {
  return dateTime.format(new Date(iso));
}

export function formatDay(iso: string): string {
  return dayOnly.format(new Date(iso));
}

/** `2026-09-20` — a calendar date with no time, so parse it as one. */
export function formatEventDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return dayOnly.format(new Date(Date.UTC(year, month - 1, day, 12)));
}

/** `$100` for whole dollars, otherwise always two decimals: `$8.80`, never `$8.8`. */
export function formatMoney(cents: number | null): string {
  if (cents === null) return "—";
  const whole = cents % 100 === 0;
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export { formatRate } from "./tax";

/**
 * Cents as a price input's starting value: `95` or `95.50`. Never rounded —
 * a field pre-filled with a rounded figure saves the rounded figure back.
 */
export function centsToInput(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

const shortDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

/** `2026-09-20` → `Sep 20`. A calendar date, so it is read as one. */
export function formatShortDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return shortDate.format(new Date(Date.UTC(year, month - 1, day, 12)));
}

const monthYear = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  year: "numeric",
});

/** `2026-09` → `Sep 2026`. */
export function formatMonth(key: string): string {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return monthYear.format(new Date(Date.UTC(year, month - 1, 15)));
}

const vehicleNames: Record<string, string> = {
  "luxury-sedan": "Luxury Sedan",
  "luxury-suv": "Luxury SUV",
  "premium-suv": "Premium SUV",
  "sprinter-van": "Sprinter Van",
};

export function formatVehicle(slug: string): string {
  return vehicleNames[slug] ?? slug;
}

const tripLabels: Record<string, string> = {
  airport: "Airport",
  "point-to-point": "Point to point",
  hourly: "Hourly",
};

export function formatTrip(type: string): string {
  return tripLabels[type] ?? type;
}

const serviceLabels: Record<string, string> = {
  personal: "Personal",
  corporate: "Corporate",
  wedding: "Wedding",
  event: "Event",
  hourly: "Hourly",
  other: "Other",
};

export function formatService(type: string): string {
  return serviceLabels[type] ?? type;
}

const paymentLabels: Record<string, string> = {
  card: "Card (Stripe)",
  cash: "Cash on delivery",
};

export function formatPayment(method: string): string {
  return paymentLabels[method] ?? method;
}

/**
 * The operator's greeting, on New York's clock rather than the server's — a
 * dispatcher on a night shift should not be wished good morning at 11 p.m.
 */
export function greeting(now = new Date()): "morning" | "afternoon" | "evening" {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      hour: "numeric",
      hourCycle: "h23",
    }).format(now),
  );

  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

/** "4 minutes ago" for the activity trail, where exact stamps add nothing. */
export function formatRelative(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  const relative = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];

  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      return relative.format(-Math.round(seconds / size), unit);
    }
  }

  return "just now";
}

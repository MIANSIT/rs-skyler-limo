import { randomInt } from "node:crypto";

/**
 * Crockford base32 without I, L, O and U — the characters that get misheard or
 * misread when a reference is given over the phone, which is how most of these
 * will travel.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Bookings are a plain five-digit number, shown as `#66465`; the number is
 * stored without the `#`. Quote requests are six digits (`#482915`). Bookings made before this change keep their
 * `RS-XXXXXXX` reference and still resolve.
 *
 * Five digits is guessable, so a reference alone never opens anything: /track
 * also needs the phone number, and payment links carry a signed token.
 */
export function makeBookingReference(): string {
  return String(randomInt(10000, 100000));
}

export function makeQuoteReference(): string {
  return String(randomInt(100000, 1000000));
}

/**
 * Quote requests are six digits, bookings five, so the two never collide and a
 * number alone says which table to look in. `RQ-…` is the older quote form.
 */
export function isQuoteReference(value: string): boolean {
  return /^(\d{6}|RQ-.+)$/.test(value);
}

/**
 * What a customer typed, reduced to the stored form: `#66465` and ` rs-4k2p9wd `
 * both work.
 */
export function normalizeReference(value: string): string {
  return value.trim().replace(/^#/, "").toUpperCase();
}

export function isReference(value: string): boolean {
  return /^(\d{5,6}|R[SQ]-[0-9A-HJKMNP-TV-Z]{7})$/.test(value);
}

/** How a reference is shown to a person: `#66465`; older `RS-…` and `RQ-…` as they are. */
export function formatReference(value: string): string {
  return /^\d+$/.test(value) ? `#${value}` : value;
}

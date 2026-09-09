import { randomInt } from "node:crypto";

/**
 * Crockford base32 without I, L, O and U — the characters that get misheard or
 * misread when a reference is given over the phone, which is how most of these
 * will travel.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * `RS-XXXXXXX` for bookings, `RQ-XXXXXXX` for quotes. Seven random characters
 * from a 32-character alphabet is ~35 bits: not guessable by someone poking at
 * /track, which is the only place a reference is accepted from the public.
 */
export function makeReference(prefix: "RS" | "RQ"): string {
  let body = "";
  for (let i = 0; i < 7; i += 1) {
    body += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `${prefix}-${body}`;
}

export function isReference(value: string): boolean {
  return /^R[SQ]-[0-9A-HJKMNP-TV-Z]{7}$/.test(value);
}

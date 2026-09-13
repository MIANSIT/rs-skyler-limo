/**
 * Comparable form of a phone number.
 *
 * Nobody retypes a number the way they first entered it. `(212) 555-0900`,
 * `212-555-0900`, `+1 212 555 0900` and `2125550900` are one number to a
 * customer, so tracking has to treat them as one too — the alternative is
 * telling somebody their booking does not exist because they included the
 * country code this time.
 *
 * Reduced to the last ten digits, which is the nationally significant number
 * for the US and Canada and strips a `+1` without having to parse it. Shorter
 * inputs are returned whole so they still compare consistently.
 */
export function comparablePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * True when two numbers are the same line.
 *
 * Requires at least seven digits on both sides: a customer typing "555" should
 * not match a booking, and an empty stored number should never match anything.
 */
export function samePhone(a: string, b: string): boolean {
  const left = comparablePhone(a);
  const right = comparablePhone(b);

  return left.length >= 7 && left === right;
}

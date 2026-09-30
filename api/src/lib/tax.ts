/**
 * Sales tax on a fare. Pure arithmetic, no database.
 *
 * Every price an operator types, and every fare `decideFare` works out, is the
 * price *before* tax. Tax is added on top and the stored total is what the
 * customer pays — so Stripe, payment links and reports all read one number and
 * never have to add tax themselves.
 *
 * A rate is a percentage with up to three decimals (8.875 is 8.875%). The sum is
 * done in integer thousandths of a percent, never in float cents, and rounded
 * half-up to the cent once: $135.00 at 8.875% is $11.98125 → $11.98.
 */

export const MAX_TAX_RATE = 25;

export type Taxed = {
  /** The fare before tax. */
  subtotalCents: number;
  taxRate: number;
  taxCents: number;
  /** What the customer pays. */
  totalCents: number;
};

/** A rate as stored: 0–25, at most three decimals. Anything else is refused upstream. */
export function normaliseRate(rate: number): number {
  return Math.round(rate * 1000) / 1000;
}

export function taxOn(subtotalCents: number, rate: number): number {
  const thousandths = Math.round(rate * 1000);
  // subtotal × rate% = subtotal × thousandths / 100 000, rounded half-up.
  return Math.floor((subtotalCents * thousandths + 50_000) / 100_000);
}

export function withTax(subtotalCents: number, rate: number): Taxed {
  const taxRate = normaliseRate(rate);
  const taxCents = taxOn(subtotalCents, taxRate);
  return { subtotalCents, taxRate, taxCents, totalCents: subtotalCents + taxCents };
}

/** `8.875` → `8.875%`, `9` → `9%`. */
export function formatRate(rate: number): string {
  return `${Number(normaliseRate(rate).toFixed(3))}%`;
}

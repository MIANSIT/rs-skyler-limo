/**
 * Sales tax, for the live preview beside a price field.
 *
 * A copy of `api/src/lib/tax.ts` — the apps deploy separately and share no
 * code. The preview is only a preview: the API works the tax out again on
 * save, and that figure is the one stored and charged. Change both together.
 */

export type Taxed = {
  subtotalCents: number;
  taxRate: number;
  taxCents: number;
  totalCents: number;
};

/** Integer thousandths of a percent, rounded half-up to the cent once. */
export function taxOn(subtotalCents: number, rate: number): number {
  const thousandths = Math.round(rate * 1000);
  return Math.floor((subtotalCents * thousandths + 50_000) / 100_000);
}

export function withTax(subtotalCents: number, rate: number): Taxed {
  const taxRate = Math.round(rate * 1000) / 1000;
  const taxCents = taxOn(subtotalCents, taxRate);
  return { subtotalCents, taxRate, taxCents, totalCents: subtotalCents + taxCents };
}

/** `8.875` → `8.875%`, `9` → `9%`. */
export function formatRate(rate: number): string {
  return `${Number((Math.round(rate * 1000) / 1000).toFixed(3))}%`;
}

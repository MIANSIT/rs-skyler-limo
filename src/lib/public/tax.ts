/**
 * Sales tax, for the booking form's fare preview.
 *
 * A copy of `api/src/lib/tax.ts` — the apps share no code. The preview is only
 * a preview: the server adds the tax again on submission, at the rate it holds,
 * and that is the figure stored and charged. Change both together.
 */

export type Taxed = {
  /** The fare before tax. */
  subtotalCents: number;
  taxRate: number;
  taxCents: number;
  totalCents: number;
};

export function withTax(subtotalCents: number, rate: number): Taxed {
  const thousandths = Math.round(rate * 1000);
  const taxCents = Math.floor((subtotalCents * thousandths + 50_000) / 100_000);
  return { subtotalCents, taxRate: thousandths / 1000, taxCents, totalCents: subtotalCents + taxCents };
}

/** `8.875` → `8.875%`. */
export function formatRate(rate: number): string {
  return `${Number((Math.round(rate * 1000) / 1000).toFixed(3))}%`;
}

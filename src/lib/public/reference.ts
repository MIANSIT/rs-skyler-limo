/** How a booking reference is shown to a person: `#66465`; older `RS-…` and `RQ-…` as they are. */
export function formatReference(value: string): string {
  return /^\d+$/.test(value) ? `#${value}` : value;
}

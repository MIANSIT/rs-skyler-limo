type ClassValue = string | false | null | undefined;

/** Joins truthy class names. Small enough not to warrant a dependency. */
export function clsx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}

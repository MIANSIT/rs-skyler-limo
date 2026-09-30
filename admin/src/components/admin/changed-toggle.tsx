import Link from "next/link";

/**
 * The "Changed by customer" filter, as a link that turns itself on and off.
 * Kept apart from the status chips: a changed booking can be in any status.
 */
export function ChangedToggle({ href, active }: { href: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-pressed={active}
      className={
        active
          ? "rounded-sm border border-midnight bg-midnight px-3 py-1.5 font-sans text-[13px] font-medium tracking-[0.04em] text-white"
          : "rounded-sm border border-midnight/20 bg-white px-3 py-1.5 font-sans text-[13px] font-medium tracking-[0.04em] text-charcoal hover:border-midnight/50"
      }
    >
      Changed by customer
    </Link>
  );
}

import Link from "next/link";

const chip = (active: boolean) =>
  active
    ? "rounded-sm border border-midnight bg-midnight px-3 py-1.5 font-sans text-[13px] font-medium tracking-[0.04em] text-white"
    : "rounded-sm border border-midnight/20 bg-white px-3 py-1.5 font-sans text-[13px] font-medium tracking-[0.04em] text-charcoal hover:border-midnight/50";

/**
 * "Order: Newest booked / Soonest pickup". Links, so the choice lives in the URL
 * like every other filter. The caller builds the hrefs so each keeps its own
 * status, search and "changed" filter; only the order flips.
 */
export function OrderToggle({
  active,
  newestHref,
  pickupHref,
}: {
  active: "booked" | "pickup";
  newestHref: string;
  pickupHref: string;
}) {
  return (
    <div className="ml-auto flex flex-wrap items-center gap-3">
      <span className="font-sans text-[13px] text-charcoal/60">Order</span>
      <Link href={newestHref} aria-pressed={active === "booked"} className={chip(active === "booked")}>
        Newest booked
      </Link>
      <Link href={pickupHref} aria-pressed={active === "pickup"} className={chip(active === "pickup")}>
        Soonest pickup
      </Link>
    </div>
  );
}

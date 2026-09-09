import { clsx } from "@/lib/clsx";

/**
 * `emphasis` marks the count an operator acts on first. It is carried by a gold
 * rule above a midnight numeral — the guidelines' "large decorative numeral"
 * use of gold — not by gold text, which fails contrast on this white ground.
 */
export function StatCard({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <div className="bg-white px-6 py-6">
      <div
        className={clsx(
          "h-0.5 w-8",
          emphasis && value > 0 ? "bg-gold" : "bg-midnight/15",
        )}
      />
      <p className="mt-4 font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/60 uppercase">
        {label}
      </p>
      <p className="font-display mt-1 text-[38px] leading-none font-semibold text-midnight tabular-nums">
        {value}
      </p>
    </div>
  );
}

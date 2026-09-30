import { clsx } from "@/lib/clsx";

/**
 * `emphasis` marks the count an operator acts on first. It is carried by a gold
 * rule above a midnight numeral — the guidelines' "large decorative numeral"
 * use of gold — not by gold text, which fails contrast on this white ground.
 *
 * `value` is a count or an already-formatted figure such as a dollar amount;
 * `hint` is one short line under it saying what the figure is made of.
 */
export function StatCard({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: number | string;
  hint?: string;
  emphasis?: boolean;
}) {
  const active = typeof value === "number" ? value > 0 : true;

  return (
    <div className="bg-white px-6 py-6">
      <div
        className={clsx(
          "h-0.5 w-8",
          emphasis && active ? "bg-gold" : "bg-midnight/15",
        )}
      />
      <p className="mt-4 font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/60 uppercase">
        {label}
      </p>
      <p className="font-display mt-1 text-[38px] leading-none font-semibold text-midnight tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="mt-2 font-sans text-[13px] text-charcoal/70 tabular-nums">{hint}</p>
      ) : null}
    </div>
  );
}

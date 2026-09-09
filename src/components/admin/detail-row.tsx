import { clsx } from "@/lib/clsx";

export function DetailRow({
  label,
  value,
  href,
  numeric = false,
}: {
  label: string;
  value: string;
  href?: string;
  numeric?: boolean;
}) {
  const text = clsx(
    "font-sans text-[15px] text-midnight",
    // Phone numbers, fares and flight numbers are compared down the column.
    numeric && "tabular-nums",
  );

  return (
    <div className="grid gap-1 px-6 py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
      <dt className="font-sans text-[13px] font-medium tracking-[0.06em] text-charcoal/60 uppercase">
        {label}
      </dt>
      <dd className={clsx(text, "break-words")}>
        {href ? (
          <a href={href} className="underline-offset-4 hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

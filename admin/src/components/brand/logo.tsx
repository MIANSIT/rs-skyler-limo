import { LogoMark } from "@/components/brand/logo-mark";
import { Wordmark } from "@/components/brand/wordmark";
import { clsx } from "@/lib/clsx";

/**
 * The standing lockup: RS monogram, a hairline divider, and the wordmark.
 *
 * The divider does the work a space cannot — it keeps the mark's own serif
 * weight from crowding the wordmark's capitals, which sit at 4.8% tracking and
 * need the air.
 */
export function Logo({
  tone = "light",
  className,
  priority = false,
}: {
  tone?: "light" | "dark";
  className?: string;
  priority?: boolean;
}) {
  return (
    <span className={clsx("inline-flex items-center gap-3", className)}>
      <LogoMark className="h-9 md:h-10" priority={priority} />
      <span
        aria-hidden
        className={clsx(
          "h-7 w-px",
          tone === "dark" ? "bg-white/25" : "bg-midnight/20",
        )}
      />
      <Wordmark tone={tone} />
    </span>
  );
}

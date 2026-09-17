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
    /*
      `flex`, not `inline-flex`.

      As an inline-level box this sat in a line box, and the line box reserves
      descender space below the baseline — about 8px at the header's 27.2px
      line-height. The lockup therefore rendered 4px above the centre of its own
      link while the nav links sat exactly on it, so the wordmark and the
      navigation never quite lined up. A block-level flex container makes no
      line box at all.
    */
    <span className={clsx("flex items-center gap-2.5 sm:gap-3", className)}>
      <LogoMark className="h-8 sm:h-9 md:h-10" priority={priority} />
      <span
        aria-hidden
        className={clsx(
          "h-6 w-px sm:h-7",
          tone === "dark" ? "bg-white/25" : "bg-midnight/20",
        )}
      />
      <Wordmark tone={tone} />
    </span>
  );
}

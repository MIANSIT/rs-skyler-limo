import { clsx } from "@/lib/clsx";

type WordmarkProps = {
  /**
   * `dark` = white RSSKYLER with gold LIMO, for midnight and charcoal grounds.
   * `light` = entirely midnight, for white and grey grounds.
   */
  tone?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: "text-[15px]",
  md: "text-[19px]",
  lg: "text-[26px] md:text-[34px]",
} as const;

/**
 * The wordmark, per RSSkyler_Wordmark_Lockups.pdf: one word, two weights,
 * a single baseline, 4.8% tracking. Live text, never an image — there is no
 * approved logo mark yet, and the full name is what carries recognition.
 */
export function Wordmark({
  tone = "light",
  size = "md",
  className,
}: WordmarkProps) {
  return (
    <span
      className={clsx(
        "font-display tracking-[0.048em] whitespace-nowrap uppercase",
        sizes[size],
        tone === "dark" ? "text-white" : "text-midnight",
        className,
      )}
    >
      <span className="font-semibold">RSSkyler</span>
      <span className={clsx("font-normal", tone === "dark" && "text-gold")}>
        Limo
      </span>
    </span>
  );
}

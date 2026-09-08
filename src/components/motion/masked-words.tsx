import { clsx } from "@/lib/clsx";

/**
 * Splits a headline into per-word masks. Each word sits in an overflow-hidden
 * box with the glyphs pushed below the baseline, so the GSAP timeline can lift
 * them into view as if the line were being set rather than faded in.
 *
 * Rendered on the server as plain markup — the animation only ever moves the
 * inner spans, so the headline is complete and readable with JS disabled.
 */
export function MaskedWords({
  text,
  className,
  wordClassName,
}: {
  text: string;
  className?: string;
  wordClassName?: string;
}) {
  return (
    <span className={clsx("inline", className)}>
      {text.split(" ").map((word, index) => (
        <span
          key={`${word}-${index}`}
          /* The vertical padding keeps descenders from being clipped by the
             mask; the matching negative margin keeps the line-height honest. */
          className="mr-[0.26em] inline-block -mb-[0.16em] overflow-hidden pb-[0.16em] align-bottom"
        >
          <span
            data-mask-word
            className={clsx("inline-block will-change-transform", wordClassName)}
          >
            {word}
          </span>
        </span>
      ))}
    </span>
  );
}

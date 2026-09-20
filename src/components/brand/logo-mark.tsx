import Image from "next/image";

import { clsx } from "@/lib/clsx";

import mark from "../../../public/rsskyler-mark.png";

/**
 * The RS monogram from the logo kit (`brand-assets/logo_design.pdf`) with the
 * "LIMOUSINE" line removed so it pairs with the wordmark without saying the
 * name twice. That line is painted out rather than cropped off: it sits beside
 * the S's bottom flourish, not below it, so a horizontal crop clips the S. The
 * full mark, with its own lettering, stays in brand-assets for print.
 *
 * Gold on midnight is the mark's home ground. On light grounds it is still a
 * graphic element, which is the one use Chapter 2 permits gold on white.
 */
export function LogoMark({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={mark}
      alt=""
      aria-hidden
      priority={priority}
      sizes="(max-width: 768px) 40px, 56px"
      /* No `h-auto` here. `clsx` is a plain join, so it would sit beside the
         caller's `h-8` at equal specificity, win on stylesheet order, and render
         the mark at its natural pixel size — which took over a phone screen. */
      className={clsx("w-auto object-contain", className)}
    />
  );
}

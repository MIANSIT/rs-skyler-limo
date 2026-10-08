import Image from "next/image";

import { clsx } from "@/lib/clsx";

import mark from "../../../public/rs_logo.png";

/**
 * The full RS Skyler Limousine lockup (`public/rs_logo.png`): monogram, divider
 * and wordmark in one file, so it is never paired with a separate wordmark.
 * Sized by height; the width follows the artwork (about 3.4 : 1).
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
      sizes="(max-width: 768px) 160px, 240px"
      /* No `h-auto` here. `clsx` is a plain join, so it would sit beside the
         caller's `h-8` at equal specificity, win on stylesheet order, and render
         the mark at its natural pixel size — which took over a phone screen. */
      className={clsx("w-auto object-contain", className)}
    />
  );
}

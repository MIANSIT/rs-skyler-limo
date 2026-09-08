import Image from "next/image";

import { clsx } from "@/lib/clsx";

import mark from "../../../public/rsskyler-mark.png";

/**
 * The RS monogram from the logo kit (`brand-assets/logo_design.pdf`), cropped
 * above the "LIMOUSINE" line so it pairs with the wordmark without saying the
 * name twice. The full mark, with its own lettering, stays in brand-assets for
 * print and physical applications.
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
      className={clsx("h-auto w-auto object-contain", className)}
    />
  );
}

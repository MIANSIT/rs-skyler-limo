import { LogoMark } from "@/components/brand/logo-mark";
import { clsx } from "@/lib/clsx";

/** The standing lockup, now a single artwork: `public/rs_logo.png`. */
export function Logo({
  className,
  priority = false,
}: {
  tone?: "light" | "dark";
  className?: string;
  priority?: boolean;
}) {
  return (
    <span className={clsx("flex items-center", className)}>
      <LogoMark className="h-9 sm:h-11" priority={priority} />
    </span>
  );
}

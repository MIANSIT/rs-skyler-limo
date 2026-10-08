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
    <span className={clsx("inline-flex items-center", className)}>
      <LogoMark className="h-10 md:h-12" priority={priority} />
    </span>
  );
}

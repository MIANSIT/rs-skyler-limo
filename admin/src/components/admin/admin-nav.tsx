"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { clsx } from "@/lib/clsx";

const links = [
  { href: "/", label: "Today" },
  { href: "/bookings", label: "Bookings" },
  { href: "/quotes", label: "Quotes" },
  { href: "/fleet", label: "Fleet" },
  { href: "/hero", label: "Hero slider" },
  { href: "/rates", label: "Rates" },
  { href: "/airports", label: "Airports" },
  { href: "/reviews", label: "Reviews" },
] as const;

/**
 * Midnight chrome, per the brand's "consistent chrome" rule. The active item is
 * marked with a gold rule and white text — gold as a graphic element on a dark
 * ground, which is where it is allowed to carry weight.
 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    /*
      A scrolling tab strip, not a wrapping one.

      Five tabs at this padding need about 470px and a 320px phone does not have
      it, so the strip used to push the whole dashboard sideways — every page
      scrolled horizontally, and the page content went with it. Scrolling the
      strip alone keeps the tabs reachable and the content still.

      `-mb-px` laps the strip over the header's bottom edge so the active tab's
      gold underline sits on that edge rather than above it.
    */
    <nav
      aria-label="Dashboard"
      className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {links.map((link) => {
        // "Today" is the root, so it would prefix-match every other route.
        const active =
          link.href === "/"
            ? pathname === "/"
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "shrink-0 border-b-2 px-3 py-3 font-sans text-[13px] font-medium tracking-[0.08em] whitespace-nowrap uppercase transition-colors sm:px-4",
              active
                ? "border-gold text-white"
                : "border-transparent text-white/60 hover:text-white",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

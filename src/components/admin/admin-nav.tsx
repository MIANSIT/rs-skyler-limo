"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { clsx } from "@/lib/clsx";

const links = [
  { href: "/admin", label: "Today" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/quotes", label: "Quotes" },
] as const;

/**
 * Midnight chrome, per the brand's "consistent chrome" rule. The active item is
 * marked with a gold rule and white text — gold as a graphic element on a dark
 * ground, which is where it is allowed to carry weight.
 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard" className="flex gap-1">
      {links.map((link) => {
        const active =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "border-b-2 px-4 py-3 font-sans text-[13px] font-medium tracking-[0.08em] uppercase transition-colors",
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

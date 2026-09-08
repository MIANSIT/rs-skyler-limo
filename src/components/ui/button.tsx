import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

import { clsx } from "@/lib/clsx";

/**
 * Three variants, and only three.
 *
 * `cta` is gold fill with MIDNIGHT text (9.9:1, AAA). The brand's earlier spec
 * called for white text on gold — that measures ~1.9:1 and Chapter 2 of the
 * guidelines explicitly corrects it. Never reintroduce white-on-gold.
 *
 * One `cta` per view: gold is reserved for the primary action only.
 */
export type ButtonVariant = "primary" | "secondary" | "cta";

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm font-sans text-[15px] font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-midnight text-white hover:bg-midnight/90",
  secondary:
    "border border-midnight bg-white text-midnight hover:bg-grey",
  cta: "bg-gold text-midnight hover:bg-gold/90",
};

const sizes = {
  md: "px-6 py-3",
  lg: "px-8 py-4 text-base",
} as const;

type SharedProps = {
  variant?: ButtonVariant;
  size?: keyof typeof sizes;
  className?: string;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: SharedProps & ComponentPropsWithoutRef<"button">) {
  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: SharedProps & ComponentPropsWithoutRef<typeof Link>) {
  return (
    <Link
      className={clsx(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

/**
 * Secondary buttons carry a midnight border on light grounds, which is
 * invisible on midnight. This is the dark-ground equivalent: white outline,
 * white text. Gold stays reserved for the one primary action on the screen.
 */
export function ButtonLinkOnDark({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof Link>) {
  return (
    <Link
      className={clsx(
        base,
        sizes.md,
        "border border-white/40 text-white hover:border-white hover:bg-white/10",
        className,
      )}
      {...props}
    />
  );
}

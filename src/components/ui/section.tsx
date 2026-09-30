import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { clsx } from "@/lib/clsx";

export type SectionTone = "light" | "grey" | "dark" | "deep";

export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("mx-auto w-full max-w-6xl px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}

/**
 * Sections alternate ground to hold a page's own ratio across a long scroll.
 * `grey` breaks up consecutive light sections without introducing a sixth
 * colour; `deep` does the identical job for a dark-first page (the
 * homepage, at the client's request) — it alternates against `dark`
 * (midnight) the way `grey` alternates against `light` (white). `deep` is
 * `midnight-deep`, a darker shade of midnight in the same hue, not a new
 * colour. It replaced `charcoal` here: a neutral grey beside a saturated navy
 * read as two temperatures, not two depths of one ground. A dark-first page
 * spends more of its 100% on midnight than on white, which is a deliberate
 * brand decision recorded in `AGENTS.md`, not a silent departure from the
 * guide's 60/30/10 note.
 */
export function Section({
  tone = "light",
  children,
  className,
  id,
}: {
  tone?: SectionTone;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={clsx(
        "py-20 md:py-28",
        tone === "dark" && "bg-midnight text-white",
        tone === "deep" && "bg-midnight-deep text-white",
        tone === "grey" && "bg-grey",
        tone === "light" && "bg-white",
        className,
      )}
    >
      <Container>{children}</Container>
    </section>
  );
}

/**
 * Small caps label above a heading. Gold is 6.8:1 on midnight and safe as text
 * there; on a light ground it would be 2.4:1, so it falls back to charcoal.
 */
export function Eyebrow({
  children,
  tone = "light",
  className,
}: {
  children: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <p
      className={clsx(
        "font-sans text-[13px] font-medium tracking-[0.12em] uppercase",
        tone === "dark" ? "text-gold" : "text-charcoal/70",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  tone = "light",
  className,
  ...rest
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  tone?: "light" | "dark";
} & ComponentPropsWithoutRef<"div">) {
  return (
    <div className={clsx("max-w-2xl", className)} {...rest}>
      {eyebrow ? <Eyebrow tone={tone}>{eyebrow}</Eyebrow> : null}
      <h2
        className={clsx(
          "font-display mt-3 text-[22px] font-semibold md:text-[26px]",
          tone === "dark" ? "text-white" : "text-midnight",
        )}
      >
        {title}
      </h2>
      {intro ? (
        <p
          className={clsx(
            "mt-4 leading-[1.7]",
            tone === "dark" ? "text-white/75" : "text-charcoal",
          )}
        >
          {intro}
        </p>
      ) : null}
    </div>
  );
}

/** A hairline derived from midnight rather than a new grey. */
export function Rule({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <hr
      className={clsx(
        "border-0 border-t",
        tone === "dark" ? "border-white/15" : "border-midnight/10",
      )}
    />
  );
}

/** Fraunces italic on grey — the guide's own rationale-note device. */
export function RationaleNote({
  label,
  tone = "light",
  children,
}: {
  label: string;
  tone?: "light" | "dark";
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "border-l-2 border-gold px-6 py-5",
        tone === "dark" ? "bg-white/5" : "bg-grey",
      )}
    >
      <p
        className={clsx(
          "font-sans text-[13px] font-semibold tracking-wide",
          tone === "dark" ? "text-white" : "text-midnight",
        )}
      >
        {label}
      </p>
      <p
        className={clsx(
          "font-display mt-2 text-[16px] leading-[1.7] italic",
          tone === "dark" ? "text-white/80" : "text-charcoal",
        )}
      >
        {children}
      </p>
    </div>
  );
}

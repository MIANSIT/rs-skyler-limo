"use client";

import { useRef, type ElementType, type ReactNode } from "react";

import { clsx } from "@/lib/clsx";
import { duration, ease, gsap, useGSAP } from "@/lib/gsap";

/**
 * Scroll-linked reveal. Children marked `data-reveal` rise in sequence; if none
 * are marked, the container itself moves.
 *
 * Under `prefers-reduced-motion` everything is simply set to its final state —
 * the page must be complete and correct without the motion, not merely usable.
 */
export function Reveal({
  as: Tag = "div",
  children,
  className,
  stagger = 0.09,
  y = 26,
  delay = 0,
  start = "top 82%",
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  stagger?: number;
  y?: number;
  delay?: number;
  start?: string;
}) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;

      const marked = gsap.utils.toArray<HTMLElement>("[data-reveal]", root);
      const targets = marked.length > 0 ? marked : [root];

      gsap.matchMedia().add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          if (!context.conditions?.motion) {
            gsap.set(targets, { clearProps: "all" });
            return;
          }

          gsap.from(targets, {
            y,
            autoAlpha: 0,
            duration: duration.base,
            ease,
            delay,
            stagger,
            scrollTrigger: { trigger: root, start, once: true },
          });
        },
      );
    },
    { scope },
  );

  return (
    <Tag ref={scope} className={clsx(className)}>
      {children}
    </Tag>
  );
}

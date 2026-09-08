"use client";

import { useRef } from "react";

import { gsap, useGSAP } from "@/lib/gsap";

/**
 * Counts a figure up when it scrolls into view. Tabular figures are a brand
 * rule for any number read at a glance — without them the digits jog sideways
 * on every frame, which is exactly the fidget the rule exists to prevent.
 */
export function CountUp({
  to,
  suffix = "",
  prefix = "",
  className,
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const node = ref.current;
      if (!node) return;

      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        const counter = { value: 0 };

        gsap.to(counter, {
          value: to,
          duration: 1.6,
          ease: "power2.out",
          scrollTrigger: { trigger: node, start: "top 88%", once: true },
          onUpdate: () => {
            node.textContent = `${prefix}${Math.round(counter.value)}${suffix}`;
          },
        });
      });
    },
    { scope: ref, dependencies: [to, prefix, suffix] },
  );

  return (
    <span ref={ref} className={className}>
      {`${prefix}${to}${suffix}`}
    </span>
  );
}

"use client";

import { useRef } from "react";

import { gsap, useGSAP } from "@/lib/gsap";

const places = [
  "Manhattan",
  "JFK",
  "Brooklyn",
  "LaGuardia",
  "Queens",
  "Newark",
  "The Bronx",
  "Midtown",
  "Staten Island",
  "The Bridges",
];

/**
 * "Local mastery, five boroughs deep" — stated as a place list rather than a
 * claim. Slow enough to read a name in passing; a marquee that demands to be
 * watched is the over-familiar consumer-app register the voice rules out.
 */
export function BoroughMarquee() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          if (!context.conditions?.motion) return;

          gsap.to("[data-marquee-track]", {
            xPercent: -50,
            duration: 46,
            ease: "none",
            repeat: -1,
          });
        },
      );
    },
    { scope },
  );

  return (
    <div
      ref={scope}
      className="overflow-hidden border-y border-white/15 bg-midnight py-5"
    >
      <div data-marquee-track className="flex w-max">
        {[0, 1].map((copy) => (
          <ul
            key={copy}
            aria-hidden={copy === 1}
            className="flex items-center"
          >
            {places.map((place) => (
              <li
                key={place}
                className="flex items-center gap-8 pr-8 font-sans text-[13px] tracking-[0.16em] whitespace-nowrap text-white/60 uppercase"
              >
                {place}
                <span aria-hidden className="h-1 w-1 rounded-full bg-gold" />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

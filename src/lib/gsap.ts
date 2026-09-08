"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Motion register for the brand: slow, weighted, confident. Luxury reads as
 * restraint — long durations and a decelerating ease, never a bounce, never an
 * elastic overshoot. The same discipline the palette applies to gold.
 */
export const ease = "power3.out";
export const easeSoft = "power2.out";

export const duration = {
  fast: 0.5,
  base: 0.9,
  slow: 1.2,
} as const;

export { gsap, ScrollTrigger, useGSAP };

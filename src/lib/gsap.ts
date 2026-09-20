"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Mobile browsers resize the viewport as the address bar collapses on the
 * first scroll — ScrollTrigger's default behaviour is to recalculate every
 * trigger's position on that resize, which desyncs a reveal animation right
 * as the customer starts scrolling. Desktop has no collapsing chrome, so this
 * only ever shows up on a phone. Documented fix, not a workaround: mobile
 * viewport-height changes are ignored, so triggers keep the positions they
 * were given on load.
 */
ScrollTrigger.config({ ignoreMobileResize: true });

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

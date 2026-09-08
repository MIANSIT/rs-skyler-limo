"use client";

import { useRef } from "react";

import { gsap, useGSAP } from "@/lib/gsap";

const steps = [
  {
    title: "Tell us the trip",
    body: "Pickup, destination, time. Three fields, and a flight number if you are flying.",
  },
  {
    title: "See the fare, not an estimate",
    body: "The full price, tolls and gratuity included, before you commit to anything.",
  },
  {
    title: "Confirmed in writing",
    body: "A reservations agent confirms every booking. You get your driver's name before the day.",
  },
  {
    title: "We watch it so you do not",
    body: "Flight moved, traffic turned — your pickup adjusts and we tell you before you notice.",
  },
];

/**
 * The gold rule fills as the section scrolls — the numerals are the one place
 * Chapter 2 explicitly sanctions gold at display size on a light ground, since
 * a large decorative numeral is a graphic element rather than text.
 */
export function HowItWorks() {
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

          gsap.from("[data-progress]", {
            scaleY: 0,
            transformOrigin: "top center",
            ease: "none",
            scrollTrigger: {
              trigger: scope.current,
              start: "top 68%",
              end: "bottom 72%",
              scrub: 0.6,
            },
          });

          gsap.from("[data-step]", {
            autoAlpha: 0,
            y: 24,
            duration: 0.8,
            ease: "power3.out",
            stagger: 0.14,
            scrollTrigger: {
              trigger: scope.current,
              start: "top 74%",
              once: true,
            },
          });
        },
      );
    },
    { scope },
  );

  return (
    <div ref={scope} className="relative mt-14 pl-12 md:pl-20">
      <div
        aria-hidden
        className="absolute top-2 bottom-2 left-[15px] w-px bg-midnight/10 md:left-[27px]"
      >
        <div data-progress className="h-full w-full origin-top bg-gold" />
      </div>

      <ol className="flex flex-col gap-12">
        {steps.map((step, index) => (
          <li key={step.title} data-step className="relative">
            <span
              aria-hidden
              className="font-display absolute top-0 -left-12 text-[26px] leading-none font-semibold text-gold tabular-nums md:-left-20 md:text-[34px]"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="font-sans text-[17px] font-semibold text-midnight">
              {step.title}
            </h3>
            <p className="mt-2 max-w-xl text-[15px] leading-[1.7] text-charcoal">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

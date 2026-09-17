"use client";

import { useRef } from "react";

import { gsap, useGSAP } from "@/lib/gsap";

/**
 * Steps 3 and 4 used to promise a driver's name before the day, and a pickup
 * that adjusts itself when a flight moves. Neither exists — there is no
 * flight-tracking integration and nothing sends a driver assignment. This
 * component was missed when the rest of the site's unevidenced claims were
 * removed; what is left is what the booking system actually does.
 */
const steps = [
  {
    title: "Tell us the trip",
    body: "Pickup, destination, time. Three fields, and a flight number if you are flying.",
  },
  {
    title: "See the fare, or ask for one",
    body: "Airport runs inside the five boroughs price themselves from the published rate card. Everything else, a person quotes.",
  },
  {
    title: "Confirmed by a person",
    body: "A reservations agent reads every booking before it is confirmed. Your confirmation email carries the reference.",
  },
  {
    title: "Check it whenever you like",
    body: "That reference and the phone number on the booking are enough to see where it stands. No account, no app.",
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
    /*
      Three columns of space: numeral, rail, copy.

      The rail used to run straight through the middle of the numerals — it sat
      at 15px while "02" spanned roughly 0 to 29, so the line struck each figure
      through the waist. It now clears them entirely and each step is marked
      where the rail passes it, which is what the numeral and the line were
      both trying to say separately.
    */
    <div ref={scope} className="relative mt-14 pl-[70px] md:pl-24">
      <div
        aria-hidden
        className="absolute top-2 bottom-2 left-[48px] w-px bg-midnight/10 md:left-[64px]"
      >
        <div data-progress className="h-full w-full origin-top bg-gold" />
      </div>

      <ol className="flex flex-col gap-12">
        {steps.map((step, index) => (
          <li key={step.title} data-step className="relative">
            {/* Gold at display size on a light ground is sanctioned for a large
                decorative numeral — it is a graphic element, not text. */}
            <span
              aria-hidden
              className="font-display absolute top-0 -left-[70px] text-[26px] leading-none font-semibold text-gold tabular-nums md:-left-24 md:text-[34px]"
            >
              {String(index + 1).padStart(2, "0")}
            </span>

            {/*
              The marker on the rail. Centred on the 1px line: half the dot's
              10px width to the left of it, so it reads as sitting on the rule
              rather than beside it. The white ring punches the rail out behind
              the dot — the section ground is white, so the rule appears to pass
              behind rather than through.
            */}
            <span
              aria-hidden
              className="absolute top-2 -left-[27px] h-2.5 w-2.5 rounded-full bg-gold ring-4 ring-white md:top-3 md:-left-[37px]"
            />

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

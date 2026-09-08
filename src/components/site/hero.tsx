"use client";

import { useRef } from "react";

import { MaskedWords } from "@/components/motion/masked-words";
import { BookingForm } from "@/components/site/booking-form";
import { ButtonLinkOnDark } from "@/components/ui/button";
import { duration, ease, gsap, useGSAP } from "@/lib/gsap";

/**
 * The one set piece on the site. Everything below it uses the quieter `Reveal`.
 *
 * The choreography is deliberately slow: a gold hairline draws across, the
 * headline is set word by word, and the booking card rises last. Nothing
 * scales, nothing bounces, nothing arrives from off-axis. Chapter 2's argument
 * about gold applies to motion too — a small amount, used with intent, reads
 * as expensive; more of it reads as a demo.
 */
export function Hero() {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          if (!context.conditions?.motion) return;

          const timeline = gsap.timeline({
            defaults: { ease, duration: duration.base },
          });

          timeline
            .from("[data-hero-eyebrow]", {
              autoAlpha: 0,
              y: 12,
              duration: duration.fast,
            })
            .from(
              "[data-mask-word]",
              { yPercent: 118, stagger: 0.075, duration: duration.slow },
              "-=0.2",
            )
            .from(
              "[data-hero-rule]",
              { scaleX: 0, transformOrigin: "left center", duration: 1 },
              "-=0.85",
            )
            .from(
              "[data-hero-copy]",
              { autoAlpha: 0, y: 18, stagger: 0.1 },
              "-=0.75",
            )
            .from(
              "[data-hero-card]",
              { autoAlpha: 0, y: 40, duration: duration.slow },
              "-=0.8",
            )
            .from(
              "[data-hero-stat]",
              { autoAlpha: 0, y: 14, stagger: 0.08, duration: duration.fast },
              "-=0.7",
            );

          /* A slow drift on the gold wash, so a long-dwelling hero is never
             completely static. Two-minute cycle — felt, not watched. */
          gsap.to("[data-hero-wash]", {
            xPercent: 6,
            yPercent: -4,
            duration: 120,
            ease: "none",
            repeat: -1,
            yoyo: true,
          });
        },
      );
    },
    { scope },
  );

  return (
    <section
      ref={scope}
      className="relative overflow-hidden bg-midnight"
      id="book"
    >
      {/* Gold is a graphic wash here at 12%, not a field colour — the 60/30/10
          ratio holds because midnight still carries the section. */}
      <div
        data-hero-wash
        aria-hidden
        className="pointer-events-none absolute -top-1/3 -right-1/4 h-[130%] w-[80%] rounded-full bg-[radial-gradient(closest-side,rgba(212,160,23,0.12),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent"
      />

      <div className="relative mx-auto w-full max-w-6xl px-6 py-20 lg:px-8 lg:py-28">
        <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <p
              data-hero-eyebrow
              className="font-sans text-[13px] font-medium tracking-[0.16em] text-gold uppercase"
            >
              Premium chauffeur service · New York City
            </p>

            <h1 className="font-display mt-6 text-[44px] leading-[1.05] font-semibold text-white sm:text-[56px] lg:text-[64px]">
              <MaskedWords text="Arrive in Style" />
            </h1>

            <div
              data-hero-rule
              aria-hidden
              className="mt-8 h-px w-24 bg-gold"
            />

            <p
              data-hero-copy
              className="mt-8 max-w-lg text-[17px] leading-[1.7] text-white/75"
            >
              Private, punctual, genuinely welcoming — whether that is a 6 a.m.
              run to JFK or a wedding motorcade through Brooklyn. One standard,
              every borough.
            </p>

            <div
              data-hero-copy
              className="mt-9 flex flex-wrap items-center gap-4"
            >
              <ButtonLinkOnDark href="/fleet">See the fleet</ButtonLinkOnDark>
              <a
                href="tel:+12125550147"
                className="font-sans text-[15px] text-white/80 underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                Or call <span className="tabular-nums">+1 (212) 555-0147</span>
              </a>
            </div>

            <dl className="mt-14 grid max-w-md grid-cols-3 gap-6 border-t border-white/15 pt-8">
              <HeroStat value="5" label="Boroughs" />
              <HeroStat value="3" label="Airports" />
              <HeroStat value="24/7" label="Dispatch" />
            </dl>
          </div>

          <div data-hero-card className="lg:col-span-6">
            <BookingForm />
            <p className="mt-4 text-center text-[13px] text-white/55">
              A fare and a confirmed pickup in under a minute.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div data-hero-stat>
      <dt className="sr-only">{label}</dt>
      <dd className="font-display text-[28px] leading-none font-semibold text-white tabular-nums">
        {value}
      </dd>
      <p className="mt-2 font-sans text-[13px] tracking-widest text-white/55 uppercase">
        {label}
      </p>
    </div>
  );
}

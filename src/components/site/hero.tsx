"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { MaskedWords } from "@/components/motion/masked-words";
import { BookingSheet } from "@/components/site/booking-sheet";
import { HeroBookingCard } from "@/components/site/hero-booking-card";
import type { FleetVehicle, HeroMediaItem } from "@/lib/api/types";
import { duration, ease, gsap, useGSAP } from "@/lib/gsap";

/**
 * The hero's background slides, when the dashboard has uploaded any.
 *
 * Absent entirely (`media.length === 0`) the hero renders exactly as it
 * always has — a plain midnight ground — so a fresh install with nothing
 * uploaded yet is not a regression. A midnight scrim sits between the media
 * and the text layer, because the brand guide's "gold on white fails
 * contrast, midnight ground keeps white text at AAA" logic applies here too:
 * an arbitrary photo cannot be trusted to carry white text on its own.
 */
function HeroMedia({ media }: { media: HeroMediaItem[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (media.length < 2) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % media.length);
    }, 7000);

    return () => clearInterval(timer);
  }, [media.length]);

  if (media.length === 0) return null;

  return (
    <>
      {/*
        Plain full-bleed at every width. The hero holds a compact booking
        card rather than the multi-step form, so the section keeps a
        copy-driven height and `inset-0` covers it without cropping a
        landscape image or video down to a sliver.
      */}
      <div aria-hidden className="absolute inset-0 z-0 overflow-hidden bg-midnight">
        {media.map((item, itemIndex) => (
          <div
            key={item.id}
            className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
            style={{ opacity: itemIndex === index ? 1 : 0 }}
          >
            {item.kind === "video" ? (
              <video
                autoPlay
                muted
                loop
                playsInline
                poster={item.posterUrl ?? undefined}
                className="h-full w-full object-cover"
              >
                <source src={item.url} type="video/mp4" />
              </video>
            ) : (
              <Image
                src={item.url}
                alt=""
                fill
                sizes="100vw"
                priority={itemIndex === 0}
                className="object-cover"
              />
            )}
          </div>
        ))}
      </div>
      {/* A deeper midnight blended in at the bottom — the near-black fade the
          client asked for, kept in the navy's own hue so it does not turn
          grey against the midnight above it. */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 bg-linear-to-r from-midnight/92 via-midnight/78 to-midnight/55"
      />
      <div
        aria-hidden
        className="absolute inset-0 z-0 bg-linear-to-t from-midnight-deep/80 via-transparent to-transparent"
      />
    </>
  );
}

/**
 * The one set piece on the site. Everything below it uses the quieter `Reveal`.
 *
 * The choreography is deliberately slow: a gold hairline draws across, the
 * headline is set word by word, and the booking card rises last. Nothing
 * scales, nothing bounces, nothing arrives from off-axis. Chapter 2's argument
 * about gold applies to motion too — a small amount, used with intent, reads
 * as expensive; more of it reads as a demo.
 */
export function Hero({
  fleet,
  media,
}: {
  fleet: FleetVehicle[];
  media: HeroMediaItem[];
}) {
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
      <HeroMedia media={media} />

      {/* Gold is a graphic wash here at 12%, not a field colour — the 60/30/10
          ratio holds because midnight still carries the section. */}
      <div
        data-hero-wash
        aria-hidden
        className="pointer-events-none absolute -top-1/3 -right-1/4 h-[130%] w-[80%] rounded-full bg-[radial-gradient(closest-side,rgba(212,160,23,0.12),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-gold/40 to-transparent"
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-20 lg:px-8 lg:py-28">
        <div className="grid items-end gap-14 lg:min-h-140 lg:grid-cols-12 lg:gap-8">
          {/* The bottom padding is the room the three counters used to take
              (about 9rem). They are gone; the space is kept so the text still
              sits where it did against the booking card. */}
          <div className="pb-36 lg:col-span-7">
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
              Luxury chauffeur service throughout New York City, Westchester,
              New Jersey &amp; Connecticut.
            </p>
            <p
              data-hero-copy
              className="mt-3 max-w-lg text-[17px] leading-[1.7] text-white/75"
            >
              Airport Transfers &bull; Corporate Travel &bull; Special Events
            </p>
          </div>

          {/*
            The booking card, not the form. The multi-step form made the hero
            a wall of fields; the card keeps the two choices that matter up
            front — trip type and car — and hands them to `/book`. Sits low
            on the right at `lg`, beneath the headline's line of sight, the
            way the client's reference hero places its fleet card.
          */}
          {/* Hidden below `md`: on a phone the card lives in `BookingSheet`,
              opened from the Book button in the bottom bar. */}
          <div data-hero-card className="hidden w-full max-w-md md:block lg:col-span-5 lg:col-start-8 lg:justify-self-end">
            <HeroBookingCard fleet={fleet} />
            {/*
              A second path, not a second gold action: weddings, corporate
              accounts and events go through `/quote`, a genuinely different
              form. Plain text link, so the card's gold action stays the only
              one in the hero.
            */}
            <Link
              href="/quote"
              className="mt-4 inline-block font-sans text-[14px] text-white/80 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              Wedding, event or corporate account? Request a quote
            </Link>
          </div>
        </div>
      </div>
      <BookingSheet fleet={fleet} />
    </section>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { MaskedWords } from "@/components/motion/masked-words";
import { BookingForm } from "@/components/site/booking-form";
import { ButtonLink, ButtonLinkOnDark } from "@/components/ui/button";
import type { BookingOptions, FleetVehicle, HeroMediaItem } from "@/lib/api/types";
import { duration, ease, gsap, useGSAP } from "@/lib/gsap";
import { bookingAirports, contact } from "@/lib/content";

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
        Plain full-bleed at every width. This used to need a capped height
        below `lg`, because the multi-step booking form stacked directly
        under the copy made the section balloon well past what a background
        image could cover sensibly. Below `lg` the hero card is a CTA now,
        not the form (see the `data-hero-card` block below), so the section
        is back to a normal, copy-driven height and `inset-0` covers it
        properly at every width without cropping a landscape image or video
        down to a sliver.
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
      {/* Charcoal blended in at the bottom — the client's own ask, and it
          reads closer to the reference's near-black fade than a pure
          midnight tint does, without a sixth colour: charcoal is already
          one of the five tokens. */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 bg-gradient-to-r from-midnight/92 via-midnight/78 to-midnight/55"
      />
      <div
        aria-hidden
        className="absolute inset-0 z-0 bg-gradient-to-t from-charcoal/70 via-transparent to-transparent"
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
  bookingOptions,
  media,
}: {
  fleet: FleetVehicle[];
  bookingOptions: BookingOptions;
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
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent"
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-20 lg:px-8 lg:py-28">
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
                href={contact.phoneHref}
                className="inline-block py-2 font-sans text-[15px] text-white/80 underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                Or call <span className="tabular-nums">{contact.phone}</span>
              </a>
            </div>

            <dl className="mt-14 grid max-w-md grid-cols-3 gap-6 border-t border-white/15 pt-8">
              {/* The airport count said 3 while the booking form has offered
                  5 since Teterboro and Westchester were added, and "24/7
                  Dispatch" was a staffing claim nothing here backs up.

                  The fleet count is omitted rather than shown as zero when the
                  API is unreachable: "0 Vehicle classes" reads as a company
                  with no cars, which is worse than one fewer figure. */}
              <HeroStat value="5" label="Boroughs" />
              <HeroStat value={String(bookingAirports.length)} label="Airports" />
              {fleet.length > 0 ? (
                <HeroStat
                  value={String(fleet.length)}
                  label={fleet.length === 1 ? "Vehicle class" : "Vehicle classes"}
                />
              ) : null}
            </dl>
          </div>

          <div data-hero-card className="lg:col-span-6">
            {/*
              Below `lg` this is a CTA, not the multi-step form. The form's
              own height is what was forcing the mobile hero section so tall
              that the background media had to be capped short of it — and a
              five-field-per-screen form stacked under a full hero is a lot
              to scroll past before a customer even sees "Airport". The full
              form lives at `/book`; this is one tap away from it, matching
              how fiveborolimo.com's own hero works (a quote button, not an
              embedded form). Desktop keeps the form inline — there it sits
              beside the copy rather than under it, so it never dominates the
              section the way it does stacked on a phone.
            */}
            <div className="lg:hidden">
              {/* The same frosted-glass card as the desktop form, at CTA size
                  rather than the full multi-step form — see the note above
                  `BookingForm`'s `tone` prop for why this stays a summary
                  card rather than the embedded form on a small screen. */}
              <div className="border border-white/10 bg-charcoal/55 p-6 text-center shadow-[0_32px_70px_-28px_rgba(0,0,0,0.65)] backdrop-blur-2xl md:p-8">
                <p className="font-sans text-[13px] font-medium tracking-[0.08em] text-white/60 uppercase">
                  Get a fare in under a minute
                </p>
                <p className="mt-3 text-[15px] leading-[1.7] text-white/75">
                  Airport, point to point or hourly. Fixed fares within the
                  five boroughs are shown before you book.
                </p>
                <ButtonLink href="/book" variant="cta" size="lg" className="mt-6 w-full">
                  Book a car
                </ButtonLink>
                {/*
                  A second path, not a second gold action: `/book` is for
                  the trip types above (airport, point to point, hourly).
                  Weddings, corporate accounts and events go through `/quote`
                  instead — a genuinely different, simpler form. Plain text
                  link, same weight as the "Or call…" link beside the
                  headline, so the one gold action above stays the only one.
                */}
                <Link
                  href="/quote"
                  className="mt-4 inline-block font-sans text-[14px] text-white underline-offset-4 hover:underline"
                >
                  Need a custom quote instead?
                </Link>
              </div>
            </div>

            <div className="hidden lg:block">
              <BookingForm fleet={fleet} options={bookingOptions} tone="dark" />
              <p className="mt-4 text-center text-[13px] text-white/55">
                A fare and a confirmed pickup in under a minute.
              </p>
            </div>
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

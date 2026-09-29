"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  ArrowRightIcon,
  ChevronDownIcon,
  ClockIcon,
  MapPinIcon,
  PlaneIcon,
} from "@/components/ui/icon";
import type { FleetVehicle } from "@/lib/api/types";
import { clsx } from "@/lib/clsx";
import { type TripType, tripTypes } from "@/lib/public/trip-types";

const tripIcons: Record<TripType, typeof PlaneIcon> = {
  airport: PlaneIcon,
  "point-to-point": MapPinIcon,
  hourly: ClockIcon,
};

/**
 * What each trip type costs, said plainly. Only an airport run inside the city
 * has a published fare; claiming more here would promise something
 * `decideFare` will not honour.
 */
const tripNotes: Record<TripType, string> = {
  airport: "A fixed fare within New York City, shown before you book.",
  "point-to-point": "Quoted by a person and agreed before you travel.",
  hourly: "Held by the hour, quoted and agreed before you travel.",
};

const tripActions: Record<TripType, string> = {
  airport: "Book an airport transfer",
  "point-to-point": "Book a point-to-point ride",
  hourly: "Book by the hour",
};

/**
 * The homepage hero's way into booking — trip type, then a car — in place of
 * the multi-step form, which now lives only at `/book`.
 *
 * Every vehicle class serves every trip type, so the two choices are
 * independent: the tabs pick the trip, the arrows flip through the fleet, and
 * the one gold action carries both to `/book?trip=…&vehicle=…`, where the form
 * opens with them already set. Nothing is booked from here.
 *
 * The fleet turns over on its own every few seconds until the customer touches
 * an arrow, and never under reduced motion.
 */
export function HeroBookingCard({ fleet }: { fleet: FleetVehicle[] }) {
  const [trip, setTrip] = useState<TripType>("airport");
  const [index, setIndex] = useState(0);
  const [touched, setTouched] = useState(false);

  const count = fleet.length;
  const vehicle = count > 0 ? fleet[index % count] : null;

  useEffect(() => {
    if (touched || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, 5000);

    return () => clearInterval(timer);
  }, [touched, count]);

  const step = (by: number) => {
    setTouched(true);
    setIndex((current) => (current + by + count) % count);
  };

  const href = `/book?${new URLSearchParams({
    trip,
    ...(vehicle ? { vehicle: vehicle.slug } : {}),
  })}`;

  return (
    // Glass, modelled on the client's reference: a rounded pane with a light
    // white tint and a hairline edge, everything inside it inset with its own
    // rounded corners rather than running to the edge. A midnight tint only
    // read as a solid panel against the dark media. White text stays well
    // above AA — the tint is 10%, the ground under it midnight.
    <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_30px_60px_-30px_rgba(0,0,0,0.75)] backdrop-blur-xl backdrop-saturate-150">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/10 via-white/0 to-white/0"
      />

      <div
        role="radiogroup"
        aria-label="Trip type"
        className="relative grid grid-cols-3 gap-1 rounded-xl bg-midnight/35 p-1"
      >
        {tripTypes.map((option) => {
          const active = option.value === trip;
          const Icon = tripIcons[option.value];
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTrip(option.value)}
              className={clsx(
                "flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-2.5 text-center font-sans text-[11px] leading-tight font-semibold tracking-[0.08em] uppercase transition-colors sm:px-2 sm:text-[12px]",
                active
                  ? "bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                  : "text-white/60 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className={clsx("h-5 w-5", active ? "text-gold" : "text-current")} />
              {option.label}
            </button>
          );
        })}
      </div>

      {vehicle ? (
        <div className="relative mt-3 flex items-center gap-3 min-[375px]:gap-4 sm:gap-5">
          <div className="relative aspect-4/3 w-28 shrink-0 overflow-hidden rounded-lg bg-midnight min-[375px]:w-36 sm:w-44">
            {fleet.map((item, itemIndex) =>
              item.primaryPhoto ? (
                <Image
                  key={item.slug}
                  src={item.primaryPhoto.url}
                  alt={itemIndex === index % count ? item.primaryPhoto.altText : ""}
                  fill
                  sizes="176px"
                  // The first car is on screen at load and is often the page's
                  // largest image (LCP) — load it straight away, not lazily.
                  loading={itemIndex === 0 ? "eager" : "lazy"}
                  fetchPriority={itemIndex === 0 ? "high" : "auto"}
                  className={clsx(
                    "object-cover transition-opacity duration-700 ease-in-out",
                    itemIndex === index % count ? "opacity-100" : "opacity-0",
                  )}
                />
              ) : null,
            )}
            {!vehicle.primaryPhoto ? (
              <Image
                src="/rsskyler-mark.png"
                alt=""
                fill
                sizes="176px"
                className="object-contain p-6 opacity-30"
              />
            ) : null}

            {count > 1 ? (
              <>
                <CarouselArrow
                  label="Previous vehicle"
                  onClick={() => step(-1)}
                  className="left-0"
                  iconClassName="rotate-90"
                />
                <CarouselArrow
                  label="Next vehicle"
                  onClick={() => step(1)}
                  className="right-0"
                  iconClassName="-rotate-90"
                />
              </>
            ) : null}
          </div>

          <div className="min-w-0 py-1 pr-2" aria-live={touched ? "polite" : "off"}>
            <p className="font-sans text-[12px] font-medium tracking-[0.08em] text-white/55 uppercase tabular-nums">
              {String((index % count) + 1).padStart(2, "0")} /{" "}
              {String(count).padStart(2, "0")}
            </p>
            <p className="font-display mt-1.5 text-[22px] leading-tight font-semibold text-white">
              {vehicle.name}
            </p>
            <p className="mt-1.5 text-[14px] text-white/70">
              <span className="sm:whitespace-nowrap">
                Up to <span className="tabular-nums">{vehicle.passengerCapacity}</span>{" "}
                passengers
              </span>{" "}
              ·{" "}
              <span className="sm:whitespace-nowrap">
                <span className="tabular-nums">{vehicle.luggageCapacity}</span> bags
              </span>
            </p>
          </div>
        </div>
      ) : null}

      <p className="relative mt-3 px-1 text-[13px] leading-[1.6] text-white/70">
        {tripNotes[trip]}
      </p>

      <Link
        href={href}
        className="group relative mt-3 flex items-center justify-between gap-3 rounded-lg bg-gold px-4 py-3.5 font-sans text-[15px] font-semibold text-midnight transition-colors hover:bg-gold/90"
      >
        {tripActions[trip]}
        <ArrowRightIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
}

/**
 * A bare chevron over the photo, as in the reference — no disc behind it. The
 * shadow and the gradient under it keep it legible on a bright exterior shot.
 */
function CarouselArrow({
  label,
  onClick,
  className,
  iconClassName,
}: {
  label: string;
  onClick: () => void;
  className: string;
  iconClassName: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={clsx(
        "absolute inset-y-0 flex w-9 items-center justify-center text-white/85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] transition-colors hover:text-white",
        className,
      )}
    >
      <ChevronDownIcon className={clsx("h-6 w-6", iconClassName)} />
    </button>
  );
}

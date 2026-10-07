"use client";

import Image from "next/image";

import { LogoMark } from "@/components/brand/logo-mark";
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  PlaneIcon,
  UsersIcon,
} from "@/components/ui/icon";
import type { FleetVehicle } from "@/lib/api/types";
import { clsx } from "@/lib/clsx";
import { formatFare } from "@/lib/content";
import { formatRate, type Taxed } from "@/lib/public/tax";
import { type TripType, tripTypes } from "@/lib/public/trip-types";

const tripIcons: Record<TripType, typeof PlaneIcon> = {
  airport: PlaneIcon,
  "point-to-point": MapPinIcon,
  hourly: ClockIcon,
};

/**
 * "2026-09-30" + "18:40" → "Wed, Sep 30 · 6:40 p.m."
 *
 * The inputs are already New York wall-clock values, so they are formatted as
 * given — built as UTC and read back as UTC, so the device's own time zone
 * cannot shift them.
 */
function formatWhen(date: string, time: string): string | null {
  if (!date) return null;
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time ? time.split(":").map(Number) : [0, 0];
  const at = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const day = at.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  if (!time) return day;
  const clock = at
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })
    .replace("AM", "a.m.")
    .replace("PM", "p.m.");
  return `${day} · ${clock}`;
}

/**
 * The booking form's live read-back, beside it on `/book`.
 *
 * Every line fills in as the customer chooses, so the trip they are about to
 * send is visible whole before they send it — Chapter 7's "fare, vehicle
 * class and pickup time are visible before the client asks". It only reflects
 * the form; nothing here is submitted, and the fare is the same preview the
 * form shows, which the server decides again on submission.
 */
export function TripSummary({
  trip,
  vehicle,
  airportName,
  direction,
  cityText,
  otherText,
  date,
  time,
  fare,
}: {
  trip: TripType;
  vehicle: FleetVehicle | null;
  airportName: string | null;
  direction: "from-airport" | "to-airport";
  cityText: string;
  otherText: string;
  date: string;
  time: string;
  /** The fixed fare with its sales tax; null when a person prices the trip. */
  fare: Taxed | null;
}) {
  const TripIcon = tripIcons[trip];
  const tripLabel = tripTypes.find((option) => option.value === trip)?.label ?? "";

  const [from, to] =
    trip === "airport"
      ? direction === "from-airport"
        ? [airportName, cityText]
        : [cityText, airportName]
      : [cityText, otherText];

  const when = formatWhen(date, time);
  const photo = vehicle?.primaryPhoto ?? null;

  return (
    <aside
      aria-label="Your trip"
      className="overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_30px_60px_-30px_rgba(0,0,0,0.75)] backdrop-blur-xl"
    >
      <div className="relative aspect-16/10 overflow-hidden rounded-xl bg-midnight">
        {photo ? (
          <Image
            key={photo.url}
            src={photo.url}
            alt={photo.altText}
            fill
            sizes="(max-width: 1024px) 100vw, 380px"
            className="object-cover motion-safe:animate-[fade-in_500ms_ease-out]"
          />
        ) : (
          <LogoMark className="absolute top-1/2 left-1/2 h-20 -translate-x-1/2 -translate-y-1/2 opacity-30" />
        )}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-midnight/85 to-transparent"
        />
        <div className="absolute inset-x-4 bottom-3">
          <p className="font-display text-[22px] leading-tight font-semibold text-white">
            {vehicle ? vehicle.name : "Choose a vehicle class"}
          </p>
          {vehicle ? (
            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-white/80">
              <UsersIcon className="h-4 w-4 shrink-0 text-gold" />
              <span>
                Up to <span className="tabular-nums">{vehicle.passengerCapacity}</span> passengers ·{" "}
                <span className="tabular-nums">{vehicle.luggageCapacity}</span> cases
              </span>
            </p>
          ) : null}
        </div>
      </div>

      <dl className="mt-4 flex flex-col gap-4 px-2 pb-1">
        <Row icon={<TripIcon className="h-5 w-5 text-gold" />} label="Trip">
          {tripLabel}
          {trip === "airport" && airportName ? ` · ${airportName}` : ""}
        </Row>

        <Row icon={<MapPinIcon className="h-5 w-5 text-gold" />} label="Route">
          {from || to ? (
            <span className="flex flex-col gap-0.5">
              <span className={clsx(!from && "text-white/40")}>{from || "Pick-up"}</span>
              <span aria-hidden className="text-white/35">
                ↓
              </span>
              <span className={clsx(!to && "text-white/40")}>
                {to || (trip === "hourly" ? "Where to, roughly" : "Destination")}
              </span>
            </span>
          ) : (
            <Empty />
          )}
        </Row>

        <Row icon={<CalendarIcon className="h-5 w-5 text-gold" />} label="When">
          {when ? (
            <span className="tabular-nums">
              {when}
              <span className="text-white/50"> New York time</span>
            </span>
          ) : (
            <Empty />
          )}
        </Row>
      </dl>

      <div className="mt-4 rounded-xl bg-midnight/40 px-4 py-4">
        {fare !== null ? (
          <>
            <p className="font-sans text-[12px] font-medium tracking-[0.08em] text-white/60 uppercase">
              Fixed fare
            </p>
            <p className="font-display mt-1 text-[32px] leading-none font-semibold text-white tabular-nums">
              {formatFare(fare.totalCents)}
            </p>
            <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-[13px] text-white/70 tabular-nums">
              <dt>Fare</dt>
              <dd className="text-right">{formatFare(fare.subtotalCents)}</dd>
              <dt>Sales tax ({formatRate(fare.taxRate)})</dt>
              <dd className="text-right">{formatFare(fare.taxCents)}</dd>
            </dl>
            <p className="mt-2 text-[13px] text-white/60">
              Tolls and gratuity included. Not an estimate.
            </p>
          </>
        ) : (
          <>
            <p className="font-sans text-[12px] font-medium tracking-[0.08em] text-white/60 uppercase">
              Fare
            </p>
            <p className="mt-1 text-[15px] leading-[1.6] text-white/80">
              {trip === "airport"
                ? "Airport trips within New York City show a fixed fare here once the airport, address and car are set. Anything else, a person prices."
                : "Priced by a person and agreed before you travel, usually within the hour."}
            </p>
          </>
        )}
      </div>
    </aside>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <dt className="font-sans text-[12px] font-medium tracking-[0.08em] text-white/50 uppercase">
          {label}
        </dt>
        <dd className="mt-1 text-[15px] leading-[1.5] break-words text-white">{children}</dd>
      </div>
    </div>
  );
}

function Empty() {
  return <span className="text-white/40">Not chosen yet</span>;
}

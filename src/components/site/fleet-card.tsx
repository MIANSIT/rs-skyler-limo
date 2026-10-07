import Image from "next/image";
import Link from "next/link";

import { LogoMark } from "@/components/brand/logo-mark";
import { ButtonLink, ButtonLinkOnDark } from "@/components/ui/button";
import { ArrowRightIcon, UsersIcon } from "@/components/ui/icon";
import { Rule } from "@/components/ui/section";
import { clsx } from "@/lib/clsx";
import type { FleetVehicle } from "@/lib/api/types";
import { formatFare } from "@/lib/content";

/** Exact to the cent: `$95` or `$95.50`, never rounded. */
const fareFrom = formatFare;

function childSeatLabel(max: number): string {
  if (max === 0) return "No child seats";
  if (max === 1) return "1 child seat";
  return `Up to ${max} child seats`;
}

/**
 * How many amenities a compact card lists. One column, not the reference's
 * two: at four cards across each card is ~250px, and "Luggage assistance" in
 * half of that truncates to "Luggage a…".
 */
const COMPACT_AMENITY_LIMIT = 3;

type Variant = "compact" | "full";

/**
 * A vehicle class.
 *
 * Two variants, because the same card cannot do both jobs. `full` is the /fleet
 * page: two per row, room for the detail paragraph, every amenity and the
 * interior shots. `compact` is the homepage strip, four across at ~270px — see
 * `CompactFleetCard` below; it keeps the facts that decide a choice and links
 * to the class on /fleet for the rest.
 */
export function FleetCard({
  vehicle,
  variant = "full",
  tone = "light",
  eager = false,
}: {
  vehicle: FleetVehicle;
  variant?: Variant;
  /** Load the photo immediately. For cards that can be on screen at load —
   *  the homepage strip sits right under the hero, and on a tall window its
   *  photos are the page's largest image (LCP). */
  eager?: boolean;
  /** `full` (the `/fleet` page) stays light; `compact` on the homepage's
   *  now-dark strip passes `tone="dark"`. */
  tone?: "light" | "dark";
}) {
  if (variant === "compact") {
    return <CompactFleetCard vehicle={vehicle} tone={tone} eager={eager} />;
  }

  const dark = tone === "dark";
  const photo = vehicle.primaryPhoto;

  const interiors = vehicle.photos.filter(
    (item) => item.kind === "interior" && item.id !== photo?.id,
  );

  return (
    <article
      id={vehicle.slug}
      className={clsx(
        "flex w-full min-w-0 scroll-mt-24 flex-col border",
        dark
          ? "border-white/15 bg-white/5 backdrop-blur-sm"
          : "border-midnight/10 bg-white",
      )}
    >
      <div className="relative flex aspect-16/10 items-end overflow-hidden bg-midnight p-6">
        {photo ? (
          <Image
            src={photo.url}
            alt={photo.altText}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <>
            {/* No photography yet. The mark on midnight rather than a stock
                photo of an unrelated car — Chapter 9 rules that out, and a
                customer who has ridden with us should recognise the vehicle. */}
            <LogoMark className="absolute top-1/2 left-1/2 h-28 -translate-x-1/2 translate-y-[-60%] opacity-30" />
            <p className="relative font-sans text-[13px] tracking-[0.12em] text-white/40 uppercase">
              {vehicle.name}
            </p>
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3
          className={clsx(
            "font-display text-[22px] font-semibold",
            dark ? "text-white" : "text-midnight",
          )}
        >
          {vehicle.name}
        </h3>

        {vehicle.model ? (
          <p
            className={clsx(
              "mt-1 truncate font-sans text-[12px] tracking-[0.06em] uppercase",
              dark ? "text-white/50" : "text-charcoal/70",
            )}
          >
            {vehicle.model}
          </p>
        ) : null}

        <p
          className={clsx(
            "mt-3 text-[15px] leading-[1.6]",
            dark ? "text-white/75" : "text-charcoal",
          )}
        >
          {vehicle.bestFor}
        </p>

        {/* Four across only when the card is wide: /fleet goes two cards per
            row at `md`, which squeezes each column below "PASSENGERS" until
            `lg` widens them again. */}
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-[12px] sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4">
          <Spec label="Passengers" value={`Up to ${vehicle.passengerCapacity}`} dark={dark} />
          <Spec label="Luggage" value={`${vehicle.luggageCapacity} cases`} dark={dark} />
          <Spec
            label="Child seats"
            value={
              vehicle.maxChildSeats === 0 ? "—" : `Up to ${vehicle.maxChildSeats}`
            }
            dark={dark}
          />
          <Spec label="From" value={fareFrom(vehicle.baseFareCents)} dark={dark} />
        </dl>

        <div className="mt-6">
          <Rule tone={tone} />
        </div>
        <p className={clsx("mt-6 text-[15px] leading-[1.7]", dark ? "text-white/70" : "text-charcoal/85")}>
          {vehicle.detail}
        </p>

        {vehicle.amenities.length > 0 ? (
          <ul className="mt-6 flex flex-wrap gap-2">
            {vehicle.amenities.map((amenity) => (
              <li
                key={amenity.key}
                title={amenity.hint}
                /* Gold as a border, never as text — approved on both a light
                   ground and a dark one (6.8:1 on midnight/charcoal). */
                className={clsx(
                  "rounded-sm border px-2.5 py-1 font-sans text-[12px] font-medium tracking-[0.04em]",
                  dark
                    ? "border-gold/50 bg-gold/10 text-white"
                    : "border-gold/45 bg-gold/5 text-midnight",
                )}
              >
                {amenity.label}
              </li>
            ))}
          </ul>
        ) : null}

        {interiors.length > 0 ? (
          <ul className="mt-6 grid grid-cols-3 gap-2">
            {interiors.slice(0, 3).map((interior) => (
              <li key={interior.id} className="relative aspect-4/3">
                <Image
                  src={interior.url}
                  alt={interior.altText}
                  fill
                  sizes="(max-width: 768px) 30vw, 15vw"
                  className="rounded-sm object-cover"
                />
              </li>
            ))}
          </ul>
        ) : null}

        {/* Pushes the action to the bottom so cards in a row line up even when
            one class has more amenities or photos than its neighbour. */}
        <div aria-hidden className="flex-1" />

        {dark ? (
          <ButtonLinkOnDark href="/book" className="mt-6 w-full">
            Book this class
          </ButtonLinkOnDark>
        ) : (
          <ButtonLink
            href="/book"
            variant="secondary"
            className="mt-6 w-full"
          >
            Book this class
          </ButtonLink>
        )}
      </div>
    </article>
  );
}

/**
 * The homepage strip's card: photo, who it seats, four amenities, the starting
 * fare. Everything else — the paragraph, child seats, interiors — is one click
 * away on `/fleet`, which is where the whole card links.
 *
 * Gold appears only as graphics — the badge icon, the amenity dots, the arrow —
 * so it holds on a light ground as well as the dark one.
 */
function CompactFleetCard({
  vehicle,
  tone,
  eager,
}: {
  vehicle: FleetVehicle;
  tone: "light" | "dark";
  eager: boolean;
}) {
  const dark = tone === "dark";
  const photo = vehicle.primaryPhoto;
  const amenities = vehicle.amenities.slice(0, COMPACT_AMENITY_LIMIT);

  return (
    <Link
      href={`/fleet#${vehicle.slug}`}
      className={clsx(
        "group flex w-full min-w-0 flex-col overflow-hidden rounded-xl border transition-[transform,border-color] duration-300 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold",
        dark
          ? "border-white/15 bg-white/5 hover:border-white/30"
          : "border-midnight/10 bg-white hover:border-midnight/25",
      )}
    >
      <div className="relative aspect-16/10 overflow-hidden bg-midnight">
        {photo ? (
          <Image
            src={photo.url}
            alt={photo.altText}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
            loading={eager ? "eager" : "lazy"}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <LogoMark className="absolute top-1/2 left-1/2 h-24 -translate-x-1/2 -translate-y-1/2 opacity-30" />
        )}

        <p className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-midnight/85 px-3 py-1.5 font-sans text-[12px] font-semibold text-white backdrop-blur-sm">
          <UsersIcon className="h-4 w-4 text-gold" />
          <span>
            Up to <span className="tabular-nums">{vehicle.passengerCapacity}</span> passengers
          </span>
        </p>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3
          className={clsx(
            "font-display text-[21px] font-semibold",
            dark ? "text-white" : "text-midnight",
          )}
        >
          {vehicle.name}
        </h3>

        {/* Who it is for, what it holds, the child seats — what the section's
            intro promises each card states. Passengers are in the badge. */}
        <p
          className={clsx(
            "mt-2 line-clamp-2 text-[14px] leading-[1.6]",
            dark ? "text-white/70" : "text-charcoal",
          )}
        >
          {vehicle.bestFor}
        </p>

        <p
          className={clsx(
            "mt-3 font-sans text-[13px] font-semibold tabular-nums",
            dark ? "text-white" : "text-midnight",
          )}
        >
          {vehicle.luggageCapacity} {vehicle.luggageCapacity === 1 ? "case" : "cases"}
          <span aria-hidden className={dark ? "text-white/40" : "text-charcoal/40"}>
            {" · "}
          </span>
          {childSeatLabel(vehicle.maxChildSeats)}
        </p>

        {amenities.length > 0 ? (
          <ul
            className={clsx(
              "mt-4 flex flex-col gap-2 border-t pt-4 text-[14px]",
              dark ? "border-white/10" : "border-midnight/10",
              dark ? "text-white/75" : "text-charcoal",
            )}
          >
            {amenities.map((amenity) => (
              <li key={amenity.key} title={amenity.hint} className="flex min-w-0 items-center gap-2">
                <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                <span className="truncate">{amenity.label}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {/* Pushes the footer down so cards in a row line up. */}
        <div aria-hidden className="flex-1" />

        <div
          className={clsx(
            "mt-5 flex items-center justify-between gap-3 border-t pt-4",
            dark ? "border-white/10" : "border-midnight/10",
          )}
        >
          <p className={clsx("text-[14px]", dark ? "text-white/60" : "text-charcoal/70")}>
            From{" "}
            <span
              className={clsx(
                "font-semibold tabular-nums",
                dark ? "text-white" : "text-midnight",
              )}
            >
              {fareFrom(vehicle.baseFareCents)}
            </span>
          </p>
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 font-sans text-[14px] font-semibold underline-offset-4 group-hover:underline",
              dark ? "text-white" : "text-midnight",
            )}
          >
            View details
            <ArrowRightIcon className="h-4 w-4 text-gold transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function Spec({ label, value, dark }: { label: string; value: string; dark: boolean }) {
  return (
    <div className="min-w-0">
      <dt
        className={clsx(
          "font-medium tracking-[0.06em] uppercase",
          dark ? "text-white/50" : "text-charcoal/70",
        )}
      >
        {label}
      </dt>
      <dd
        className={clsx(
          "mt-1 font-sans text-[14px] font-semibold tabular-nums",
          dark ? "text-white" : "text-midnight",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

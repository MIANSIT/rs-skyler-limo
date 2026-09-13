import Image from "next/image";

import { LogoMark } from "@/components/brand/logo-mark";
import { ButtonLink } from "@/components/ui/button";
import { Rule } from "@/components/ui/section";
import { clsx } from "@/lib/clsx";
import type { FleetVehicle } from "@/lib/api/types";

function fareFrom(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

/** How many amenity chips a compact card shows before summarising the rest. */
const COMPACT_AMENITY_LIMIT = 3;

type Variant = "compact" | "full";

/**
 * A vehicle class.
 *
 * Two variants, because the same card cannot do both jobs. `full` is the /fleet
 * page: two per row, room for the detail paragraph, every amenity and the
 * interior shots. `compact` is the homepage strip, which runs four across at
 * ~270px — there, the full card's four-column spec row collides into itself and
 * thirteen stacked amenity chips push it past 1200px tall. Compact drops to the
 * facts that decide a choice and sends the rest to /fleet.
 */
export function FleetCard({
  vehicle,
  variant = "full",
}: {
  vehicle: FleetVehicle;
  variant?: Variant;
}) {
  const compact = variant === "compact";
  const photo = vehicle.primaryPhoto;

  const interiors = compact
    ? []
    : vehicle.photos.filter(
        (item) => item.kind === "interior" && item.id !== photo?.id,
      );

  const shownAmenities = compact
    ? vehicle.amenities.slice(0, COMPACT_AMENITY_LIMIT)
    : vehicle.amenities;
  const hiddenAmenityCount = vehicle.amenities.length - shownAmenities.length;

  return (
    <article
      id={vehicle.slug}
      className="flex w-full min-w-0 scroll-mt-24 flex-col border border-midnight/10 bg-white"
    >
      <div className="relative flex aspect-[16/10] items-end overflow-hidden bg-midnight p-6">
        {photo ? (
          <Image
            src={photo.url}
            alt={photo.altText}
            fill
            sizes={
              compact
                ? "(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                : "(max-width: 768px) 100vw, 50vw"
            }
            className="object-cover"
          />
        ) : (
          <>
            {/* No photography yet. The mark on midnight rather than a stock
                photo of an unrelated car — Chapter 9 rules that out, and a
                customer who has ridden with us should recognise the vehicle. */}
            <LogoMark className="absolute top-1/2 left-1/2 h-28 -translate-x-1/2 -translate-y-[60%] opacity-30" />
            <p className="relative font-sans text-[13px] tracking-[0.12em] text-white/40 uppercase">
              {vehicle.name}
            </p>
          </>
        )}
      </div>

      <div className={clsx("flex flex-1 flex-col", compact ? "p-5" : "p-6")}>
        <h3
          className={clsx(
            "font-display font-semibold text-midnight",
            compact ? "text-[19px]" : "text-[22px]",
          )}
        >
          {vehicle.name}
        </h3>

        {vehicle.model ? (
          <p className="mt-1 truncate font-sans text-[12px] tracking-[0.06em] text-charcoal/60 uppercase">
            {vehicle.model}
          </p>
        ) : null}

        <p
          className={clsx(
            "mt-3 text-[15px] leading-[1.6] text-charcoal",
            // Keeps four cards in a row the same height whatever the copy.
            compact && "line-clamp-3",
          )}
        >
          {vehicle.bestFor}
        </p>

        {/*
          Two columns until there is genuinely room for four. "PASSENGERS" is
          ~95px of uppercase tracking and a quarter of a 270px card is 55px, so
          four columns is where the labels overlap.
        */}
        <dl
          className={clsx(
            "mt-5 grid gap-x-4 gap-y-3 text-[12px]",
            compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4",
          )}
        >
          <Spec label="Passengers" value={`Up to ${vehicle.passengerCapacity}`} />
          <Spec label="Luggage" value={`${vehicle.luggageCapacity} cases`} />
          <Spec
            label="Child seats"
            value={
              vehicle.maxChildSeats === 0 ? "—" : `Up to ${vehicle.maxChildSeats}`
            }
          />
          <Spec label="From" value={fareFrom(vehicle.baseFareCents)} />
        </dl>

        {compact ? null : (
          <>
            <div className="mt-6">
              <Rule />
            </div>
            <p className="mt-6 text-[15px] leading-[1.7] text-charcoal/85">
              {vehicle.detail}
            </p>
          </>
        )}

        {shownAmenities.length > 0 ? (
          <ul className={clsx("flex flex-wrap gap-2", compact ? "mt-5" : "mt-6")}>
            {shownAmenities.map((amenity) => (
              <li
                key={amenity.key}
                title={amenity.hint}
                /* Gold as a border on a light ground — never as text. */
                className="rounded-sm border border-gold/45 bg-gold/5 px-2.5 py-1 font-sans text-[12px] font-medium tracking-[0.04em] text-midnight"
              >
                {amenity.label}
              </li>
            ))}

            {hiddenAmenityCount > 0 ? (
              <li className="self-center font-sans text-[12px] text-charcoal/60">
                +{hiddenAmenityCount} more
              </li>
            ) : null}
          </ul>
        ) : null}

        {interiors.length > 0 ? (
          <ul className="mt-6 grid grid-cols-3 gap-2">
            {interiors.slice(0, 3).map((interior) => (
              <li key={interior.id} className="relative aspect-[4/3]">
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

        <ButtonLink
          href="/#book"
          variant="secondary"
          className={clsx("w-full", compact ? "mt-5" : "mt-6")}
        >
          Book this class
        </ButtonLink>
      </div>
    </article>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-medium tracking-[0.06em] text-charcoal/60 uppercase">
        {label}
      </dt>
      <dd className="mt-1 font-sans text-[14px] font-semibold text-midnight tabular-nums">
        {value}
      </dd>
    </div>
  );
}

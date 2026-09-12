import Image from "next/image";

import { LogoMark } from "@/components/brand/logo-mark";
import { ButtonLink } from "@/components/ui/button";
import { Rule } from "@/components/ui/section";
import type { FleetVehicle } from "@/lib/api/types";

function fareFrom(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

export function FleetCard({ vehicle }: { vehicle: FleetVehicle }) {
  const photo = vehicle.primaryPhoto;
  const interiors = vehicle.photos.filter(
    (item) => item.kind === "interior" && item.id !== photo?.id,
  );

  return (
    <article
      id={vehicle.slug}
      className="flex scroll-mt-24 flex-col border border-midnight/10 bg-white"
    >
      <div className="relative flex aspect-[16/10] items-end overflow-hidden bg-midnight p-6">
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
            <LogoMark className="absolute top-1/2 left-1/2 h-28 -translate-x-1/2 -translate-y-[60%] opacity-30" />
            <p className="relative font-sans text-[13px] tracking-[0.12em] text-white/40 uppercase">
              {vehicle.name}
            </p>
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-[22px] font-semibold text-midnight">
          {vehicle.name}
        </h3>
        {vehicle.model ? (
          <p className="mt-1 font-sans text-[13px] tracking-[0.06em] text-charcoal/60 uppercase">
            {vehicle.model}
          </p>
        ) : null}

        <p className="mt-3 text-[15px] leading-[1.7] text-charcoal">
          {vehicle.bestFor}
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-[13px] sm:grid-cols-4">
          <Spec label="Passengers" value={`Up to ${vehicle.passengerCapacity}`} />
          <Spec label="Luggage" value={`${vehicle.luggageCapacity} cases`} />
          <Spec
            label="Child seats"
            value={vehicle.maxChildSeats === 0 ? "—" : `Up to ${vehicle.maxChildSeats}`}
          />
          <Spec label="From" value={fareFrom(vehicle.baseFareCents)} />
        </dl>

        <div className="mt-6">
          <Rule />
        </div>

        <p className="mt-6 text-[15px] leading-[1.7] text-charcoal/85">
          {vehicle.detail}
        </p>

        {vehicle.amenities.length > 0 ? (
          <ul className="mt-6 flex flex-wrap gap-2">
            {vehicle.amenities.map((amenity) => (
              <li
                key={amenity.key}
                title={amenity.hint}
                /* Gold as a border on a light ground — never as text. */
                className="rounded-sm border border-gold/45 bg-gold/5 px-2.5 py-1 font-sans text-[12px] font-medium tracking-[0.04em] text-midnight"
              >
                {amenity.label}
              </li>
            ))}
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

        <ButtonLink href="/#book" variant="secondary" className="mt-6 w-full">
          Book this class
        </ButtonLink>
      </div>
    </article>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium tracking-[0.08em] text-charcoal/60 uppercase">
        {label}
      </dt>
      <dd className="mt-1 font-sans font-semibold text-midnight tabular-nums">
        {value}
      </dd>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { moveVehicle } from "@/lib/admin/fleet-actions";
import { getVehicles } from "@/lib/admin/dal";
import { formatMoney } from "@/lib/admin/format";

export const metadata: Metadata = { title: "Fleet" };

const categoryLabels: Record<string, string> = {
  sedan: "Sedan",
  suv: "SUV",
  "premium-suv": "Premium SUV",
  van: "Van",
  sprinter: "Sprinter",
};

export default async function FleetPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { deleted } = await searchParams;
  const vehicles = await getVehicles();

  const live = vehicles.filter((vehicle) => vehicle.isActive).length;
  const ids = vehicles.map((vehicle) => vehicle.id);

  /** Swaps a vehicle with its neighbour and posts the whole new order. */
  const swappedWith = (index: number, offset: number) => {
    const next = [...ids];
    const target = index + offset;
    if (target < 0 || target >= next.length) return null;
    [next[index], next[target]] = [next[target]!, next[index]!];
    return next.join(",");
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[34px] leading-tight font-semibold text-midnight">
            Fleet
          </h1>
          <p className="mt-2 font-sans text-[15px] text-charcoal/70">
            {vehicles.length === 0
              ? "No vehicle classes yet."
              : `${live} of ${vehicles.length} showing on the website, in this order.`}
          </p>
        </div>

        <Link
          href="/fleet/new"
          className="rounded-sm bg-gold px-6 py-3 font-sans text-[15px] font-semibold text-midnight transition-colors hover:bg-gold/90"
        >
          Add a vehicle
        </Link>
      </div>

      {deleted ? (
        <p
          role="status"
          className="border-l-2 border-green-700 bg-green-700/5 px-4 py-3 font-sans text-[14px] text-green-800"
        >
          Vehicle deleted. The website no longer shows it.
        </p>
      ) : null}

      {vehicles.length === 0 ? (
        <p className="rounded-sm border border-midnight/10 bg-white px-6 py-10 text-center font-sans text-[15px] text-charcoal/60">
          Add a vehicle class and it appears on the public fleet page and in the
          booking form.
        </p>
      ) : (
        <ul className="flex flex-col gap-px overflow-hidden rounded-sm border border-midnight/10 bg-midnight/10">
          {vehicles.map((vehicle, index) => {
            const up = swappedWith(index, -1);
            const down = swappedWith(index, 1);

            return (
              <li key={vehicle.id} className="bg-white">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-4 p-5">
                  <div className="h-16 w-24 shrink-0 overflow-hidden rounded-sm bg-midnight">
                    {vehicle.primaryPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={vehicle.primaryPhoto.url}
                        alt={vehicle.primaryPhoto.altText}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center font-sans text-[11px] tracking-[0.08em] text-white/40 uppercase">
                        No photo
                      </span>
                    )}
                  </div>

                  <div className="min-w-[12rem] flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/fleet/${vehicle.id}`}
                        className="font-sans text-[16px] font-semibold text-midnight underline-offset-4 hover:underline"
                      >
                        {vehicle.name}
                      </Link>

                      {vehicle.isActive ? null : (
                        <span className="rounded-sm border border-charcoal/30 bg-white px-2 py-0.5 font-sans text-[11px] font-medium tracking-[0.06em] text-charcoal uppercase">
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-sans text-[13px] text-charcoal/60">
                      {categoryLabels[vehicle.category] ?? vehicle.category}
                      {vehicle.model ? ` · ${vehicle.model}` : ""} ·{" "}
                      <span className="font-mono">{vehicle.slug}</span>
                    </p>
                  </div>

                  <dl className="flex gap-6 font-sans text-[13px]">
                    <Stat label="Pax" value={vehicle.passengerCapacity} />
                    <Stat label="Bags" value={vehicle.luggageCapacity} />
                    <Stat label="Seats" value={vehicle.maxChildSeats} />
                    <Stat
                      label="From"
                      value={formatMoney(vehicle.baseFareCents)}
                    />
                    <Stat label="Photos" value={vehicle.photos.length} />
                  </dl>

                  <div className="flex gap-1.5">
                    <ReorderButton ids={up} label="Move up" glyph="↑" />
                    <ReorderButton ids={down} label="Move down" glyph="↓" />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="font-medium tracking-[0.06em] text-charcoal/55 uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 font-semibold text-midnight tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function ReorderButton({
  ids,
  label,
  glyph,
}: {
  ids: string | null;
  label: string;
  glyph: string;
}) {
  if (!ids) {
    return (
      <span
        aria-hidden
        className="flex h-8 w-8 items-center justify-center rounded-sm border border-midnight/10 text-charcoal/25"
      >
        {glyph}
      </span>
    );
  }

  return (
    <form action={moveVehicle}>
      <input type="hidden" name="ids" value={ids} />
      <button
        type="submit"
        aria-label={label}
        title={label}
        className="flex h-8 w-8 items-center justify-center rounded-sm border border-midnight/25 text-midnight transition-colors hover:border-midnight hover:bg-grey"
      >
        {glyph}
      </button>
    </form>
  );
}

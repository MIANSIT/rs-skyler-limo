import { ButtonLink } from "@/components/ui/button";
import { Rule } from "@/components/ui/section";
import type { VehicleClass } from "@/lib/content";

/**
 * A vehicle photograph belongs at the top of this card — RSSkyler's own fleet
 * on a real New York street, cool grade, midnight in the shadows, shot at
 * golden or blue hour. Until that photography exists, the slot stays a plain
 * midnight field rather than a stock stand-in the guide explicitly rules out.
 */
export function FleetCard({ vehicle }: { vehicle: VehicleClass }) {
  return (
    <article
      id={vehicle.slug}
      className="flex scroll-mt-24 flex-col border border-midnight/10 bg-white"
    >
      <div className="flex aspect-[16/10] items-end bg-midnight p-6">
        <p className="font-sans text-[13px] tracking-[0.12em] text-white/40 uppercase">
          {vehicle.name}
        </p>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-[22px] font-semibold text-midnight">
          {vehicle.name}
        </h3>
        <p className="mt-3 text-[15px] leading-[1.7] text-charcoal">
          {vehicle.bestFor}
        </p>

        <dl className="mt-6 grid grid-cols-3 gap-4 text-[13px]">
          <Spec label="Passengers" value={vehicle.passengers} />
          <Spec label="Luggage" value={vehicle.luggage} />
          <Spec label="From" value={vehicle.from} />
        </dl>

        <div className="mt-6">
          <Rule />
        </div>

        <p className="mt-6 flex-1 text-[15px] leading-[1.7] text-charcoal/85">
          {vehicle.detail}
        </p>

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

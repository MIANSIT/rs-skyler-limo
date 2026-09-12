import type { Metadata } from "next";
import Link from "next/link";

import { VehicleForm } from "@/components/admin/vehicle-form";
import { getFleetMeta } from "@/lib/admin/dal";

export const metadata: Metadata = { title: "Add a vehicle" };

export default async function NewVehiclePage() {
  const meta = await getFleetMeta();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/fleet"
          className="font-sans text-[14px] text-charcoal/60 underline-offset-4 hover:text-midnight hover:underline"
        >
          ← Fleet
        </Link>
        <h1 className="mt-4 font-display text-[34px] leading-tight font-semibold text-midnight">
          Add a vehicle
        </h1>
        <p className="mt-2 max-w-2xl font-sans text-[15px] text-charcoal/70">
          Save the class first, then add its photography. It appears on the
          public fleet page and in the booking form as soon as it is showing.
        </p>
      </div>

      <VehicleForm amenities={meta.amenities} categories={meta.categories} />
    </div>
  );
}

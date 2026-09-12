import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteVehicle } from "@/components/admin/delete-vehicle";
import { PhotoManager } from "@/components/admin/photo-manager";
import { VehicleForm } from "@/components/admin/vehicle-form";
import { getFleetMeta, getVehicle } from "@/lib/admin/dal";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const vehicle = await getVehicle(Number(id));

  return { title: vehicle ? vehicle.name : "Vehicle" };
}

export default async function EditVehiclePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const numericId = Number(id);

  if (!Number.isInteger(numericId) || numericId < 1) notFound();

  const [vehicle, meta] = await Promise.all([
    getVehicle(numericId),
    getFleetMeta(),
  ]);

  if (!vehicle) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/fleet"
          className="font-sans text-[14px] text-charcoal/60 underline-offset-4 hover:text-midnight hover:underline"
        >
          ← Fleet
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <h1 className="font-display text-[34px] leading-tight font-semibold text-midnight">
            {vehicle.name}
          </h1>
          {vehicle.isActive ? (
            <span className="rounded-sm border border-green-700/40 bg-green-700/8 px-2.5 py-1 font-sans text-[12px] font-medium tracking-[0.06em] text-green-800 uppercase">
              On the website
            </span>
          ) : (
            <span className="rounded-sm border border-charcoal/30 bg-white px-2.5 py-1 font-sans text-[12px] font-medium tracking-[0.06em] text-charcoal uppercase">
              Hidden
            </span>
          )}
        </div>
      </div>

      {created ? (
        <p
          role="status"
          className="border-l-2 border-green-700 bg-green-700/5 px-4 py-3 font-sans text-[14px] text-green-800"
        >
          Vehicle added. Now add its photography below.
        </p>
      ) : null}

      <VehicleForm
        vehicle={vehicle}
        amenities={meta.amenities}
        categories={meta.categories}
      />

      <PhotoManager vehicle={vehicle} />

      <DeleteVehicle id={vehicle.id} name={vehicle.name} />
    </div>
  );
}

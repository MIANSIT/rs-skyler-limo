import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookingEditForm } from "@/components/admin/booking-edit-form";
import { getAirports, getBooking, getVehicles } from "@/lib/admin/dal";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getBooking(Number(id));
  return { title: result ? `Edit ${result.booking.reference}` : "Edit booking" };
}

export default async function EditBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) notFound();

  const [result, vehicles, airports] = await Promise.all([
    getBooking(numericId),
    getVehicles(),
    getAirports(),
  ]);
  if (!result) notFound();

  const { booking } = result;

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <div>
        <Link
          href={`/bookings/${booking.id}`}
          className="font-sans text-[14px] text-charcoal/60 underline-offset-4 hover:text-midnight hover:underline"
        >
          ← {booking.reference}
        </Link>
        <h1 className="font-display mt-4 text-[34px] leading-none font-semibold text-midnight">
          Edit booking
        </h1>
        <p className="mt-3 max-w-2xl font-sans text-[15px] leading-[1.7] text-charcoal/70">
          Corrects the record. Nothing here emails the customer — status changes
          and prices do that from the booking page.
        </p>
      </div>

      <BookingEditForm
        booking={booking}
        vehicles={vehicles}
        airports={airports.map((airport) => ({ code: airport.code, name: airport.name }))}
      />
    </div>
  );
}

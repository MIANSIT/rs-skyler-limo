import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActivityTrail } from "@/components/admin/activity-trail";
import { BookingActions } from "@/components/admin/booking-actions";
import { DetailRow } from "@/components/admin/detail-row";
import { StatusBadge } from "@/components/admin/status-badge";
import { getBooking } from "@/lib/admin/dal";
import {
  formatDay,
  formatMoney,
  formatPickup,
  formatTrip,
  formatVehicle,
} from "@/lib/admin/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getBooking(Number(id));

  return { title: result ? result.booking.reference : "Booking" };
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);

  if (!Number.isInteger(numericId) || numericId < 1) notFound();

  const result = await getBooking(numericId);
  if (!result) notFound();

  const { booking, activity } = result;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/bookings"
          className="font-sans text-[14px] text-charcoal/60 underline-offset-4 hover:text-midnight hover:underline"
        >
          ← All bookings
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <h1 className="font-display text-[34px] leading-none font-semibold text-midnight tabular-nums">
            {booking.reference}
          </h1>
          <StatusBadge status={booking.status} />
        </div>

        <p className="mt-3 font-sans text-[15px] text-charcoal/70">
          {formatTrip(booking.tripType)} · requested{" "}
          {formatDay(booking.createdAt)} · {booking.source}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-8">
          <section className="rounded-sm border border-midnight/10 bg-white">
            <h2 className="border-b border-midnight/10 px-6 py-4 font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase">
              The trip
            </h2>
            <dl className="divide-y divide-midnight/8">
              <DetailRow label="Pickup at" value={formatPickup(booking.pickupAt)} numeric />
              <DetailRow label="Pickup" value={booking.pickup} />
              <DetailRow label="Destination" value={booking.destination} />
              <DetailRow
                label="Vehicle"
                value={formatVehicle(booking.vehicleClass)}
              />
              <DetailRow
                label="Passengers"
                value={`${booking.passengers} · ${booking.bags} ${
                  booking.bags === 1 ? "bag" : "bags"
                }`}
                numeric
              />
              {booking.flightNumber || booking.airline ? (
                <DetailRow
                  label="Flight"
                  value={[booking.airline, booking.flightNumber]
                    .filter(Boolean)
                    .join(" ")}
                  numeric
                />
              ) : null}
              <DetailRow
                label="Quoted fare"
                value={formatMoney(booking.quotedTotalCents)}
                numeric
              />
            </dl>
          </section>

          <section className="rounded-sm border border-midnight/10 bg-white">
            <h2 className="border-b border-midnight/10 px-6 py-4 font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase">
              The customer
            </h2>
            <dl className="divide-y divide-midnight/8">
              <DetailRow label="Name" value={booking.customerName} />
              <DetailRow
                label="Phone"
                value={booking.customerPhone}
                href={`tel:${booking.customerPhone.replace(/[^\d+]/g, "")}`}
                numeric
              />
              <DetailRow
                label="Email"
                value={booking.customerEmail}
                href={`mailto:${booking.customerEmail}`}
              />
              {booking.notes ? (
                <DetailRow label="Instructions" value={booking.notes} />
              ) : null}
            </dl>
          </section>

          <ActivityTrail entries={activity} />
        </div>

        <BookingActions
          id={booking.id}
          status={booking.status}
          phone={booking.customerPhone}
        />
      </div>
    </div>
  );
}

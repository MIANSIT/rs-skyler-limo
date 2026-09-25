import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActivityTrail } from "@/components/admin/activity-trail";
import { BookingActions } from "@/components/admin/booking-actions";
import { PaymentPanel } from "@/components/admin/payment-panel";
import { QuotePanel } from "@/components/admin/quote-panel";
import { DetailRow } from "@/components/admin/detail-row";
import { StatusBadge } from "@/components/admin/status-badge";
import { getBooking } from "@/lib/admin/dal";
import {
  formatDay,
  formatMoney,
  formatPickup,
  formatTrip,
  formatService,
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

  const { booking, activity, clashes } = result;

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
          <Link
            href={`/bookings/${booking.id}/edit`}
            className="ml-auto rounded-sm border border-midnight/25 bg-white px-4 py-2 font-sans text-[14px] font-medium text-midnight transition-colors hover:border-midnight hover:bg-grey"
          >
            Edit details
          </Link>
        </div>

        <p className="mt-3 font-sans text-[15px] text-charcoal/70">
          {formatTrip(booking.tripType)} · requested{" "}
          {formatDay(booking.createdAt)} · {booking.source}
        </p>
      </div>

      {clashes.length > 0 ? (
        <section className="border-l-2 border-gold bg-white px-6 py-5">
          <h2 className="font-sans text-[13px] font-semibold tracking-[0.08em] text-midnight uppercase">
            Possible clash
          </h2>
          <p className="mt-2 max-w-2xl font-sans text-[15px] leading-[1.7] text-charcoal/80">
            {clashes.length === 1
              ? "Another booking for the same vehicle class is"
              : `${clashes.length} other bookings for the same vehicle class are`}{" "}
            within three hours of this pickup. Check a second car is free
            before you confirm.
          </p>
          <ul className="mt-3 flex flex-col gap-1.5">
            {clashes.map((clash) => (
              <li
                key={clash.id}
                className="font-sans text-[14px] text-charcoal/80 tabular-nums"
              >
                <Link
                  href={`/bookings/${clash.id}`}
                  className="font-semibold text-midnight underline underline-offset-4"
                >
                  {clash.reference}
                </Link>
                {" · "}
                {formatPickup(clash.pickupAt)}
                {" · "}
                {clash.customerName}
                {" · "}
                <span className="capitalize">{clash.status}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
                label="Service"
                value={formatService(booking.serviceType)}
              />
              <DetailRow
                label="Passengers"
                value={`${booking.passengers} · ${booking.bags} ${
                  booking.bags === 1 ? "bag" : "bags"
                }`}
                numeric
              />
              <DetailRow
                label="Pricing"
                value={
                  booking.pricingMode === "fixed"
                    ? "Fixed airport fare — agreed at booking"
                    : booking.quotedTotalCents === null
                      ? "Quote request — not yet priced"
                      : "Quote request — priced"
                }
              />
              {booking.airportCode ? (
                <DetailRow
                  label="Airport"
                  value={`${booking.airportCode} · ${
                    booking.airportDirection === "to-airport"
                      ? "to the airport"
                      : "from the airport"
                  }`}
                />
              ) : null}
              {booking.childSeats > 0 ? (
                <DetailRow
                  label="Child seats"
                  value={`${booking.childSeats} requested — fit before pickup`}
                  numeric
                />
              ) : null}
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

          {booking.pricingMode === "quote" ? (
            <QuotePanel booking={booking} />
          ) : null}

          <PaymentPanel booking={booking} />

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

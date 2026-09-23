import Link from "next/link";

import { StatusBadge } from "@/components/admin/status-badge";
import {
  formatMoney,
  formatPickup,
  formatTrip,
  formatVehicle,
} from "@/lib/admin/format";
import type { Booking } from "@/lib/api/types";

/**
 * Pickup time, fare and phone number are the columns an operator compares down
 * the page, so they carry tabular figures.
 *
 * The reference is the link rather than the whole row: a `<tr>` cannot reliably
 * host a positioned overlay, and a row-wide link would swallow text selection
 * on the phone number an operator is trying to copy.
 */
export function BookingsTable({
  bookings,
  emptyMessage,
}: {
  bookings: Booking[];
  emptyMessage: string;
}) {
  if (bookings.length === 0) {
    return (
      <p className="rounded-sm border border-midnight/10 bg-white px-6 py-8 text-center font-sans text-[15px] text-charcoal/60">
        {emptyMessage}
      </p>
    );
  }

  return (
    /* `relative` contains any `sr-only` (position: absolute) descendant inside
       the scroll box — see the note in rate-grid-form. */
    <div className="relative overflow-x-auto rounded-sm border border-midnight/10 bg-white">
      <table className="w-full min-w-[52rem] border-collapse text-left">
        <caption className="sr-only">Bookings</caption>
        <thead>
          <tr className="border-b border-midnight/10">
            {[
              "Reference",
              "Pickup",
              "Route",
              "Customer",
              "Vehicle",
              "Fare",
              "Status",
            ].map((heading) => (
              <th
                key={heading}
                scope="col"
                className="px-4 py-3 font-sans text-[12px] font-medium tracking-[0.08em] text-charcoal/60 uppercase"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {bookings.map((booking) => (
            <tr
              key={booking.id}
              className="border-b border-midnight/8 last:border-0 hover:bg-grey"
            >
              <td className="px-4 py-4">
                <Link
                  href={`/bookings/${booking.id}`}
                  className="font-sans text-[14px] font-semibold text-midnight tabular-nums underline-offset-4 hover:underline"
                >
                  {booking.reference}
                </Link>
              </td>
              <td className="px-4 py-4 font-sans text-[14px] text-midnight tabular-nums">
                {formatPickup(booking.pickupAt)}
              </td>
              <td className="max-w-[18rem] px-4 py-4 font-sans text-[14px] text-charcoal/80">
                <span className="block truncate">{booking.pickup}</span>
                <span className="block truncate text-charcoal/55">
                  → {booking.destination}
                </span>
              </td>
              <td className="px-4 py-4 font-sans text-[14px] text-charcoal/80">
                <span className="block">{booking.customerName}</span>
                <span className="block text-charcoal/55 tabular-nums">
                  {booking.customerPhone}
                </span>
              </td>
              <td className="px-4 py-4 font-sans text-[14px] text-charcoal/80">
                <span className="block">
                  {formatVehicle(booking.vehicleClass)}
                </span>
                <span className="block text-charcoal/55">
                  {formatTrip(booking.tripType)}
                </span>
              </td>
              <td className="px-4 py-4 font-sans text-[14px] text-midnight tabular-nums">
                <span className="block">
                  {formatMoney(booking.quotedTotalCents)}
                </span>
                {/* Cash is the one the driver has to act on, so it is named;
                    paid is shown for either method. */}
                <span className="block whitespace-nowrap text-charcoal/55">
                  {booking.paymentMethod === "cash" ? "Cash" : "Card"}
                  {booking.paymentStatus === "paid" ? " · paid" : ""}
                </span>
              </td>
              <td className="px-4 py-4">
                <div className="flex flex-col items-start gap-1.5">
                  <StatusBadge status={booking.status} />
                  {booking.possibleClashes ? (
                    <span
                      title="Another booking for this vehicle class is within 3 hours"
                      className="rounded-sm border border-midnight/30 px-2 py-0.5 font-sans text-[12px] font-medium tracking-[0.06em] whitespace-nowrap text-midnight uppercase"
                    >
                      Possible clash
                    </span>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

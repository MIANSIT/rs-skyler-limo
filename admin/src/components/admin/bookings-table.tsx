import { formatReference } from "@/lib/admin/reference";
import Link from "next/link";

import { ChangedTag } from "@/components/admin/changed-tag";
import { OutsideAreaTag } from "@/components/admin/outside-area-tag";
import { isPreManhattanFixedFare } from "@/lib/admin/fixed-fare-area";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  formatBooked,
  formatDay,
  formatMoney,
  formatTime,
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
    <>
      {/* Below `xl` each booking is a stacked card: the seven-column table needs
          about 1100px and either scrolled sideways or cut things off. */}
      <ul className="flex flex-col gap-3 xl:hidden">
        {bookings.map((booking) => (
          <li key={booking.id}>
            <Link
              href={`/bookings/${booking.id}`}
              className="block rounded-sm border border-midnight/10 bg-white p-4 transition-colors hover:bg-grey sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div>
                  <span className="font-sans text-[15px] font-semibold text-midnight tabular-nums">
                    {formatReference(booking.reference)}
                  </span>
                  <span className="mt-0.5 block font-sans text-[12px] text-charcoal/55">
                    Booked {formatBooked(booking.createdAt)}
                  </span>
                </div>
                <StatusTags booking={booking} row />
              </div>

              <p className="mt-3 font-sans text-[15px] font-medium text-midnight tabular-nums">
                {formatDay(booking.pickupAt)} · {formatTime(booking.pickupAt)}
              </p>

              <p className="mt-1 font-sans text-[14px] break-words text-charcoal/80">
                {booking.pickup}
                <span className="text-charcoal/55"> → {booking.destination}</span>
              </p>

              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 font-sans text-[14px] sm:grid-cols-3">
                <div className="min-w-0">
                  <dt className="text-[12px] tracking-[0.06em] text-charcoal/55 uppercase">Customer</dt>
                  <dd className="break-words text-charcoal/80">{booking.customerName}</dd>
                  <dd className="text-charcoal/55 tabular-nums">{booking.customerPhone}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[12px] tracking-[0.06em] text-charcoal/55 uppercase">Vehicle</dt>
                  <dd className="text-charcoal/80">{formatVehicle(booking.vehicleClass)}</dd>
                  <dd className="text-charcoal/55">{formatTrip(booking.tripType)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[12px] tracking-[0.06em] text-charcoal/55 uppercase">Fare</dt>
                  <dd className="text-midnight tabular-nums">{formatMoney(booking.quotedTotalCents)}</dd>
                  <dd className="text-charcoal/55">
                    {booking.paymentMethod === "cash" ? "Cash" : "Card"}
                    {booking.paymentStatus === "paid" ? " · Paid" : " · Unpaid"}
                  </dd>
                </div>
              </dl>
            </Link>
          </li>
        ))}
      </ul>

    {/* `relative` contains any `sr-only` (position: absolute) descendant inside
       the scroll box — see the note in rate-grid-form. */}
    <div className="relative hidden overflow-x-auto rounded-sm border border-midnight/10 bg-white xl:block">
      <table className="w-full min-w-208 border-collapse text-left">
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
                  {formatReference(booking.reference)}
                </Link>
                {/* When it was booked, so the order never has to be guessed:
                    the list runs by pick-up, and this says how fresh it is. */}
                <span className="mt-1 block whitespace-nowrap font-sans text-[12px] font-normal text-charcoal/55">
                  Booked {formatBooked(booking.createdAt)}
                </span>
              </td>
              {/* Day on one line, time on the next, never wrapped word by word:
                  with the year added the one-line form was too wide and the
                  cell broke into a column of single words. */}
              <td className="px-4 py-4 font-sans text-[14px] whitespace-nowrap text-midnight tabular-nums">
                <span className="block">{formatDay(booking.pickupAt)}</span>
                <span className="block text-charcoal/70">{formatTime(booking.pickupAt)}</span>
              </td>
              <td className="max-w-60 px-4 py-4 font-sans text-[14px] text-charcoal/80">
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
                  {booking.paymentStatus === "paid" ? " · Paid" : " · Unpaid"}
                </span>
              </td>
              <td className="px-4 py-4">
                <StatusTags booking={booking} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}

/**
 * The status badge and the attention tags under it. In the table it is a
 * capped column so the tags wrap onto two lines instead of running past the
 * edge, where they were cut off; on a card (`row`) they sit side by side.
 */
function StatusTags({ booking, row = false }: { booking: Booking; row?: boolean }) {
  return (
    <div
      className={
        row
          ? "flex flex-wrap items-center gap-1.5"
          : "flex max-w-36 flex-col items-start gap-1.5"
      }
    >
      <StatusBadge status={booking.status} />
      {booking.customerChangePending ? (
        <ChangedTag className="leading-tight whitespace-normal!" />
      ) : null}
      {isPreManhattanFixedFare(booking) ? (
        <OutsideAreaTag className="leading-tight whitespace-normal!" />
      ) : null}
      {booking.possibleClashes ? (
        <span
          title="Another booking for this vehicle class is within 3 hours"
          className="rounded-sm border border-midnight/30 px-2 py-0.5 font-sans text-[12px] leading-tight font-medium tracking-[0.06em] text-midnight uppercase"
        >
          Possible clash
        </span>
      ) : null}
    </div>
  );
}

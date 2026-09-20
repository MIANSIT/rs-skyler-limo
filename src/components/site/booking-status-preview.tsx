/**
 * What the booking lookup actually returns, drawn rather than described.
 *
 * Shared by the home page and `/track`. It replaced an animated route with a
 * "five minutes out" ETA, which illustrated live tracking that does not exist.
 * This shows only fields the lookup really produces. The reference is
 * obviously a sample; everything it claims the product does, the product does.
 */
export function BookingStatusPreview() {
  return (
    <div className="border border-white/15 bg-white/3 p-6 md:p-8">
      <div className="flex items-baseline justify-between gap-4 border-b border-white/15 pb-5">
        <div>
          <p className="font-sans text-[13px] font-medium tracking-[0.12em] text-gold uppercase">
            Booking found
          </p>
          <p className="font-display mt-2 text-[26px] leading-none font-semibold text-white tabular-nums">
            RS-4K2QP7
          </p>
        </div>
        <span className="border border-white/25 px-3 py-1 font-sans text-[13px] tracking-[0.08em] text-white uppercase">
          Confirmed
        </span>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5">
        <Detail label="Pickup" value="JFK Airport" />
        <Detail label="Destination" value="Midtown Manhattan" />
        <Detail label="Date" value="14 Oct 2026" />
        <Detail label="Time" value="6:40 p.m." />
        <Detail label="Vehicle" value="Luxury Sedan" />
        <Detail label="Fare" value="$145.00" />
      </dl>

      <p className="mt-6 border-t border-white/15 pt-5 text-[13px] leading-[1.6] text-white/55">
        A sample lookup. Your own needs the reference and the phone number on
        the booking.
      </p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-sans text-[13px] tracking-[0.08em] text-white/50 uppercase">
        {label}
      </dt>
      <dd className="font-sans mt-1 text-[15px] font-medium text-white tabular-nums">
        {value}
      </dd>
    </div>
  );
}

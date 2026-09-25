"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { ErrorBanner, Field, FormSection, control } from "@/components/admin/edit-fields";
import { updateBookingDetails, type EditFormState } from "@/lib/admin/edit-actions";
import { isoToNewYork } from "@/lib/admin/new-york-time";
import type { Airport, Booking, Vehicle } from "@/lib/api/types";

const TRIP_TYPES = [
  { value: "airport", label: "Airport transfer" },
  { value: "point-to-point", label: "Point to point" },
  { value: "hourly", label: "Hourly" },
];

/** Mirrors `bookingServiceTypes` in `api/src/schemas.ts`. */
const SERVICE_TYPES = [
  { value: "personal", label: "Personal" },
  { value: "corporate", label: "Corporate / business" },
  { value: "wedding", label: "Wedding" },
  { value: "event", label: "Event" },
  { value: "other", label: "Something else" },
];

function SaveButton() {
  const { pending } = useFormStatus();

  // The page's one gold action.
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-gold px-6 py-3 font-sans text-[15px] font-semibold text-midnight transition-colors hover:bg-gold/90 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

/**
 * Every detail of a booking, editable. Status has its own controls on the
 * booking page (with the customer email that goes with them); everything else
 * is here. Nothing is emailed from this form — it corrects the record.
 */
export function BookingEditForm({
  booking,
  vehicles,
  airports,
}: {
  booking: Booking;
  vehicles: Vehicle[];
  airports: Airport[];
}) {
  const [state, formAction] = useActionState<EditFormState, FormData>(
    updateBookingDetails,
    { status: "idle" },
  );
  const [tripType, setTripType] = useState<string>(booking.tripType);

  const fieldError = (name: string) =>
    state.status === "error" ? state.fields?.[name] : undefined;

  const pickup = isoToNewYork(booking.pickupAt);

  // A booking may name a vehicle or airport that has since been hidden or
  // removed; keep it selectable so saving does not silently change it.
  const vehicleOptions = vehicles.some((v) => v.slug === booking.vehicleClass)
    ? vehicles
    : [{ slug: booking.vehicleClass, name: `${booking.vehicleClass} (not in the fleet)` }, ...vehicles];
  const airportOptions =
    booking.airportCode && !airports.some((a) => a.code === booking.airportCode)
      ? [{ code: booking.airportCode, name: `${booking.airportCode} (hidden)` }, ...airports]
      : airports;

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <input type="hidden" name="id" value={booking.id} />

      <FormSection title="The customer">
        <Field label="Name" id="customerName" error={fieldError("customerName")}>
          <input id="customerName" name="customerName" required maxLength={160} defaultValue={booking.customerName} className={control} />
        </Field>
        <Field label="Phone" id="customerPhone" error={fieldError("customerPhone")} hint="Also the second factor the customer tracks the booking with.">
          <input id="customerPhone" name="customerPhone" type="tel" required maxLength={40} defaultValue={booking.customerPhone} className={control} />
        </Field>
        <Field label="Email" id="customerEmail" error={fieldError("customerEmail")} className="sm:col-span-2">
          <input id="customerEmail" name="customerEmail" type="email" required maxLength={255} defaultValue={booking.customerEmail} className={control} />
        </Field>
      </FormSection>

      <FormSection title="The trip">
        <Field label="Trip type" id="tripType" error={fieldError("tripType")}>
          <select id="tripType" name="tripType" value={tripType} onChange={(event) => setTripType(event.target.value)} className={control}>
            {TRIP_TYPES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Service" id="serviceType" error={fieldError("serviceType")}>
          <select id="serviceType" name="serviceType" defaultValue={booking.serviceType} className={control}>
            {SERVICE_TYPES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </Field>

        {tripType === "airport" ? (
          <>
            <Field label="Airport" id="airportCode" error={fieldError("airportCode")}>
              <select id="airportCode" name="airportCode" defaultValue={booking.airportCode ?? ""} className={control}>
                <option value="">Not set</option>
                {airportOptions.map((airport) => (
                  <option key={airport.code} value={airport.code}>{airport.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Direction" id="airportDirection" error={fieldError("airportDirection")}>
              <select id="airportDirection" name="airportDirection" defaultValue={booking.airportDirection ?? ""} className={control}>
                <option value="">Not set</option>
                <option value="from-airport">From the airport</option>
                <option value="to-airport">To the airport</option>
              </select>
            </Field>
          </>
        ) : null}

        <Field label="Pick-up" id="pickup" error={fieldError("pickup")}>
          <input id="pickup" name="pickup" required maxLength={255} defaultValue={booking.pickup} className={control} />
        </Field>
        <Field label="Drop-off" id="destination" error={fieldError("destination")}>
          <input id="destination" name="destination" required maxLength={255} defaultValue={booking.destination} className={control} />
        </Field>
        <Field label="Pick-up date" id="pickupDate" error={fieldError("pickupAt")} hint="New York time.">
          <input id="pickupDate" name="pickupDate" type="date" required defaultValue={pickup.date} className={control} />
        </Field>
        <Field label="Pick-up time" id="pickupTime" hint="New York time.">
          <input id="pickupTime" name="pickupTime" type="time" required defaultValue={pickup.time} className={control} />
        </Field>
      </FormSection>

      <FormSection title="Vehicle and passengers">
        <Field label="Vehicle" id="vehicleClass" error={fieldError("vehicleClass")} className="sm:col-span-2">
          <select id="vehicleClass" name="vehicleClass" defaultValue={booking.vehicleClass} className={control}>
            {vehicleOptions.map((vehicle) => (
              <option key={vehicle.slug} value={vehicle.slug}>{vehicle.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Passengers" id="passengers" error={fieldError("passengers")}>
          <input id="passengers" name="passengers" type="number" min={1} max={60} required defaultValue={booking.passengers} className={control} />
        </Field>
        <Field label="Bags" id="bags" error={fieldError("bags")}>
          <input id="bags" name="bags" type="number" min={0} max={60} required defaultValue={booking.bags} className={control} />
        </Field>
        <Field label="Child seats" id="childSeats" error={fieldError("childSeats")}>
          <input id="childSeats" name="childSeats" type="number" min={0} max={4} required defaultValue={booking.childSeats} className={control} />
        </Field>
      </FormSection>

      <FormSection title="Flight">
        <Field label="Airline" id="airline" error={fieldError("airline")}>
          <input id="airline" name="airline" maxLength={120} defaultValue={booking.airline ?? ""} className={control} />
        </Field>
        <Field label="Flight or tail number" id="flightNumber" error={fieldError("flightNumber")}>
          <input id="flightNumber" name="flightNumber" maxLength={20} defaultValue={booking.flightNumber ?? ""} className={control} />
        </Field>
      </FormSection>

      <FormSection title="Fare and payment">
        <Field
          label="Fare (USD)"
          id="fare"
          error={fieldError("quotedTotalCents")}
          hint={
            booking.pricingMode === "fixed"
              ? "A published fixed fare the customer agreed to. Change it only if they have agreed the new figure."
              : "Blank means not yet priced. To send the customer a price, use Price this request on the booking page."
          }
          className="sm:col-span-2"
        >
          <input
            id="fare"
            name="fare"
            inputMode="decimal"
            defaultValue={booking.quotedTotalCents === null ? "" : (booking.quotedTotalCents / 100).toFixed(2)}
            className={control}
          />
        </Field>
        <Field label="Payment method" id="paymentMethod" error={fieldError("paymentMethod")}>
          <select id="paymentMethod" name="paymentMethod" defaultValue={booking.paymentMethod} className={control}>
            <option value="card">Card (Stripe)</option>
            <option value="cash">Cash on delivery</option>
          </select>
        </Field>
        <Field label="Payment status" id="paymentStatus" error={fieldError("paymentStatus")}>
          <select id="paymentStatus" name="paymentStatus" defaultValue={booking.paymentStatus} className={control}>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
          </select>
        </Field>
      </FormSection>

      <section className="rounded-sm border border-midnight/10 bg-white p-6">
        <div className="grid gap-5">
          <Field label="Customer’s instructions" id="customerNotes" error={fieldError("customerNotes")} hint="What the customer asked for. The chauffeur sees this.">
            <textarea id="customerNotes" name="customerNotes" rows={3} maxLength={5000} defaultValue={booking.notes ?? ""} className={`${control} resize-y`} />
          </Field>
          <Field label="Note for the record" id="note" hint="Why you made this change. Kept in the history, never emailed.">
            <textarea id="note" name="note" rows={2} maxLength={2000} className={`${control} resize-y`} />
          </Field>
        </div>
      </section>

      {state.status === "error" ? <ErrorBanner message={state.message} /> : null}

      <div className="flex flex-wrap items-center gap-4">
        <SaveButton />
        <Link
          href={`/bookings/${booking.id}`}
          className="px-2 py-3 font-sans text-[15px] text-charcoal/70 underline-offset-4 hover:text-midnight hover:underline"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

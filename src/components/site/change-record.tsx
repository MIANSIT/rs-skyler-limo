"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { AddressField } from "@/components/site/address-field";
import { ButtonOnDark } from "@/components/ui/button";
import { DateField, TimeField } from "@/components/ui/date-time-field";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type {
  Changeability,
  ChangeableBooking,
  ChangeableQuote,
  FleetVehicle,
} from "@/lib/api/types";
import { contact } from "@/lib/content";
import { changeStep, type ChangeState } from "@/lib/public/change-actions";
import { isoToNewYork, todayInNewYork } from "@/lib/public/new-york-time";

/**
 * "Change this booking" on the tracking page, on its deep-midnight ground.
 *
 * A code goes to the email on the booking; the right code opens the booking in
 * a form; saving updates the same booking under the same reference. Every
 * button here is outlined — the lookup above holds the page's one
 * gold action.
 */

function money(cents: number | null): string {
  return cents === null ? "" : `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function Submit({
  intent,
  children,
  pendingLabel,
}: {
  intent: string;
  children: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <ButtonOnDark type="submit" name="intent" value={intent} disabled={pending}>
      {pending ? pendingLabel : children}
    </ButtonOnDark>
  );
}

/** A plain text button, for the steps that are not the main one. */
function TextButton({ intent, children }: { intent: string; children: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      formNoValidate
      disabled={pending}
      className="font-sans text-[14px] font-medium text-white underline underline-offset-4 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function Alert({ children }: { children: string }) {
  return (
    <p role="alert" className="border-l-2 border-red-300 bg-red-500/10 px-4 py-3 text-[14px] leading-[1.6] text-red-200">
      {children}
    </p>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return <h3 className="font-sans text-[17px] font-semibold text-white">{children}</h3>;
}

export function ChangeRecord({
  kind,
  reference,
  phone,
  change,
  fleet,
  placesEnabled,
}: {
  kind: "booking" | "quote";
  reference: string;
  /** The phone number the lookup used; the API checks it again on every step. */
  phone: string;
  change: Changeability;
  fleet: FleetVehicle[];
  placesEnabled: boolean;
}) {
  const [state, action] = useActionState<ChangeState, FormData>(changeStep, { step: "start" });
  const noun = kind === "booking" ? "booking" : "request";

  if (!change.allowed) {
    return (
      <p className="mt-6 border-t border-white/15 pt-6 text-[15px] leading-[1.7] text-white/75">
        {change.reason}
      </p>
    );
  }

  return (
    <form action={action} className="mt-6 flex flex-col gap-5 border-t border-white/15 pt-6">
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="phone" value={phone} />

      {state.step === "start" ? (
        <>
          <div>
            <Heading>{`Need to change your ${noun}?`}</Heading>
            <p className="mt-2 max-w-lg text-[15px] leading-[1.7] text-white/75">
              We will email a 6-digit code to the address on the {noun}. Enter it
              here and you can change the details yourself.
            </p>
          </div>
          {state.error ? <Alert>{state.error}</Alert> : null}
          <div>
            <Submit intent="send-code" pendingLabel="Sending the code…">
              {`Change this ${noun}`}
            </Submit>
          </div>
        </>
      ) : null}

      {state.step === "code" ? <CodeStep state={state} /> : null}

      {state.step === "edit" && state.details.kind === "booking" ? (
        <BookingEdit
          key={state.attempt}
          details={state.details}
          values={state.values}
          error={state.error}
          fields={state.fields}
          fleet={fleet}
          placesEnabled={placesEnabled}
        />
      ) : null}

      {state.step === "edit" && state.details.kind === "quote" ? (
        <QuoteEdit key={state.attempt} details={state.details} values={state.values} error={state.error} fields={state.fields} />
      ) : null}

      {state.step === "confirm-fare" ? (
        <>
          <div>
            <Heading>This change moves your fare</Heading>
            <dl className="mt-4 grid max-w-md grid-cols-2 gap-4">
              <div>
                <dt className="font-sans text-[13px] font-medium tracking-[0.08em] text-white/60 uppercase">Was</dt>
                <dd className="font-display mt-1 text-[24px] font-semibold text-white/60 tabular-nums line-through">
                  {state.previous.totalCents === null ? "Not priced" : money(state.previous.totalCents)}
                </dd>
              </div>
              <div>
                <dt className="font-sans text-[13px] font-medium tracking-[0.08em] text-white/60 uppercase">Now</dt>
                <dd className="font-display mt-1 text-[24px] font-semibold text-white tabular-nums">
                  {state.fare.totalCents === null ? "Priced by our team" : money(state.fare.totalCents)}
                </dd>
              </div>
            </dl>
            <p className="mt-3 max-w-lg text-[15px] leading-[1.7] text-white/75">{state.fare.reason}</p>
          </div>
          {state.error ? <Alert>{state.error}</Alert> : null}
          <div className="flex flex-wrap items-center gap-4">
            <Submit intent="confirm" pendingLabel="Saving…">
              Save with the new fare
            </Submit>
            <Submit intent="back" pendingLabel="Going back…">
              Go back
            </Submit>
          </div>
        </>
      ) : null}

      {state.step === "confirm-price-reset" ? (
        <>
          <div>
            <Heading>Your agreed price will be cleared</Heading>
            <p className="mt-2 max-w-lg text-[15px] leading-[1.7] text-white/75">
              We priced this request at{" "}
              <span className="font-semibold text-white tabular-nums">{money(state.agreedPriceCents)}</span>. The
              date, passengers or details you changed mean that price no longer fits, so a reservations agent will
              send you a new one.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Submit intent="confirm" pendingLabel="Saving…">
              Save and ask for a new price
            </Submit>
            <Submit intent="back" pendingLabel="Going back…">
              Go back
            </Submit>
          </div>
        </>
      ) : null}

      {state.step === "saved" ? (
        <div role="status">
          <Heading>
            Saved. Your {noun} <span className="whitespace-nowrap tabular-nums">{reference}</span> is updated.
          </Heading>
          <ul className="mt-4 flex flex-col gap-3">
            {state.changes.map((item) => (
              <li key={item.label} className="text-[15px] leading-[1.6]">
                <span className="font-sans text-[13px] font-medium tracking-[0.08em] text-white/60 uppercase">
                  {item.label}
                </span>
                <span className="block text-white/50 line-through">{item.before}</span>
                <span className="block text-white tabular-nums">{item.after}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 max-w-lg text-[15px] leading-[1.7] text-white/75">
            {state.statusChanged
              ? `Because the ${noun} changed, a reservations agent will confirm it with you again. `
              : ""}
            We have emailed you the details. Look it up again to see the {noun} as it is now.
            {state.phoneChanged ? " Use your new phone number next time." : ""}
          </p>
        </div>
      ) : null}
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* The code                                                                   */
/* -------------------------------------------------------------------------- */

function CodeStep({ state }: { state: Extract<ChangeState, { step: "code" }> }) {
  const [now, setNow] = useState(() => Date.now());

  // A one-second tick for the resend countdown, stopped once it reaches zero.
  const waitUntil = state.sentAt + state.resendAfterSeconds * 1000;
  useEffect(() => {
    if (now >= waitUntil) return;
    const timer = setTimeout(() => setNow(Date.now()), 1000);
    return () => clearTimeout(timer);
  }, [now, waitUntil]);
  const wait = Math.max(0, Math.ceil((waitUntil - now) / 1000));

  return (
    <>
      <div>
        <Heading>Enter the code we emailed you</Heading>
        <p className="mt-2 max-w-lg text-[15px] leading-[1.7] text-white/75">
          We sent a 6-digit code to <span className="font-semibold text-white">{state.maskedEmail}</span>. It works
          for {state.expiresInMinutes} minutes.
        </p>
      </div>

      {state.notice ? (
        <p role="status" className="text-[14px] text-green-300">
          {state.notice}
        </p>
      ) : null}

      <Field tone="dark" label="Code" id="change-code" error={state.error}>
        <Input tone="dark"
          id="change-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          placeholder="123456"
          className="max-w-44 font-mono text-[20px] tracking-[0.3em] tabular-nums"
        />
      </Field>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Submit intent="verify" pendingLabel="Checking…">
          Continue
        </Submit>
        {wait > 0 ? (
          <span className="font-sans text-[14px] text-white/60 tabular-nums">Resend in {wait}s</span>
        ) : (
          <TextButton intent="send-code">Send a new code</TextButton>
        )}
        <TextButton intent="cancel">Cancel</TextButton>
      </div>

      {/* The address on the booking may simply be wrong. Masked, so the owner
          can spot their own typo without the page revealing it to anyone. */}
      <div className="border-l-2 border-white/25 pl-4 text-[14px] leading-[1.7] text-white/75">
        <p className="font-semibold text-white">Didn&rsquo;t get the code?</p>
        <p>
          Check your spam folder. It went to <span className="font-semibold">{state.maskedEmail}</span>. If that
          address is wrong, call us on{" "}
          <a href={contact.phoneHref} className="text-white underline underline-offset-4 tabular-nums">
            {contact.phone}
          </a>{" "}
          and we will correct it.
        </p>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* The booking form                                                           */
/* -------------------------------------------------------------------------- */

function BookingEdit({
  details,
  values,
  error,
  fields = {},
  fleet,
  placesEnabled,
}: {
  details: ChangeableBooking;
  values?: Record<string, string>;
  error?: string;
  fields?: Record<string, string>;
  fleet: FleetVehicle[];
  placesEnabled: boolean;
}) {
  const start = isoToNewYork(details.pickupAt);
  const [date, setDate] = useState(values?.date ?? start.date);
  const [time, setTime] = useState(values?.time ?? start.time);
  const [vehicle, setVehicle] = useState(values?.vehicle ?? details.vehicleClass);
  const [sessionToken] = useState(() => crypto.randomUUID());

  const chosen = fleet.find((item) => item.slug === vehicle);
  // A vehicle no longer on the site still shows, so the booking reads true.
  const vehicles = fleet.some((item) => item.slug === details.vehicleClass)
    ? fleet
    : [...fleet, { slug: details.vehicleClass, name: details.vehicleClass, passengerCapacity: details.passengers, maxChildSeats: details.childSeats } as FleetVehicle];
  const maxSeats = chosen?.maxChildSeats ?? details.childSeats;

  const isAirport = details.tripType === "airport";
  const editPickup = !isAirport || details.airportDirection === "to-airport";
  const editDestination = !isAirport || details.airportDirection !== "to-airport";
  const value = (key: string, fallback: string | number | null) => values?.[key] ?? String(fallback ?? "");

  return (
    <>
      <div>
        <Heading>Change your booking</Heading>
        <p className="mt-2 max-w-lg text-[15px] leading-[1.7] text-white/75">
          Edit what has changed and save. Pickup times are New York time. To change the trip type or the airport, call
          us on{" "}
          <a href={contact.phoneHref} className="text-white underline underline-offset-4 tabular-nums">
            {contact.phone}
          </a>
          .
        </p>
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field tone="dark" label="Date" id="change-date" error={fields.pickupAt}>
          <DateField tone="dark"
            id="change-date"
            name="date"
            required
            min={todayInNewYork()}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
        <Field tone="dark" label="Time" id="change-time" hint="New York time.">
          <TimeField tone="dark" id="change-time" name="time" required value={time} onChange={(event) => setTime(event.target.value)} />
        </Field>

        {editPickup ? (
          <Field tone="dark" label="Pick-up address" id="change-pickup" error={fields.pickup} className="sm:col-span-2">
            <AddressField tone="dark"
              id="change-pickup"
              name="pickup"
              required
              enabled={placesEnabled}
              sessionToken={sessionToken}
              defaultValue={value("pickup", details.pickup)}
            />
          </Field>
        ) : (
          <input type="hidden" name="pickup" value={details.pickup} />
        )}

        {editDestination ? (
          <Field tone="dark"
            label={details.tripType === "hourly" ? "Where to, roughly" : "Drop-off address"}
            id="change-destination"
            error={fields.destination}
            className="sm:col-span-2"
          >
            <AddressField tone="dark"
              id="change-destination"
              name="destination"
              required
              enabled={placesEnabled}
              sessionToken={sessionToken}
              defaultValue={value("destination", details.destination)}
            />
          </Field>
        ) : (
          <input type="hidden" name="destination" value={details.destination} />
        )}
        <input type="hidden" name="placesSessionToken" value={sessionToken} />

        <Field tone="dark" label="Vehicle class" id="change-vehicle" className="sm:col-span-2">
          <Select tone="dark" id="change-vehicle" name="vehicle" required value={vehicle} onChange={(event) => setVehicle(event.target.value)}>
            {vehicles.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name} · up to {item.passengerCapacity}
              </option>
            ))}
          </Select>
        </Field>

        <Field tone="dark" label="Passengers" id="change-passengers" error={fields.passengers}>
          <Input tone="dark"
            id="change-passengers"
            name="passengers"
            type="number"
            min={1}
            max={chosen?.passengerCapacity ?? 60}
            required
            defaultValue={value("passengers", details.passengers)}
          />
        </Field>
        <Field tone="dark" label="Bags" id="change-bags" error={fields.bags}>
          <Input tone="dark" id="change-bags" name="bags" type="number" min={0} max={60} required defaultValue={value("bags", details.bags)} />
        </Field>

        {maxSeats > 0 ? (
          <Field tone="dark" label="Child seats" id="change-seats" error={fields.childSeats}>
            <Select tone="dark" id="change-seats" name="childSeats" defaultValue={value("childSeats", Math.min(details.childSeats, maxSeats))}>
              {Array.from({ length: maxSeats + 1 }, (_, count) => (
                <option key={count} value={String(count)}>
                  {count === 0 ? "None" : String(count)}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <input type="hidden" name="childSeats" value="0" />
        )}

        {isAirport ? (
          <>
            <Field tone="dark" label="Airline" id="change-airline">
              <Input tone="dark" id="change-airline" name="airline" defaultValue={value("airline", details.airline)} />
            </Field>
            <Field tone="dark" label="Flight number" id="change-flight" error={fields.flightNumber}>
              <Input tone="dark" id="change-flight" name="flight" defaultValue={value("flight", details.flightNumber)} className="uppercase" />
            </Field>
          </>
        ) : null}

        <Field tone="dark" label="Your name" id="change-name" error={fields.customerName}>
          <Input tone="dark" id="change-name" name="name" required autoComplete="name" defaultValue={value("name", details.customerName)} />
        </Field>
        <Field tone="dark" label="Phone" id="change-phone" error={fields.customerPhone} hint="You will need it to look the booking up.">
          <Input tone="dark"
            id="change-phone"
            name="customerPhone"
            type="tel"
            required
            autoComplete="tel"
            defaultValue={value("customerPhone", details.customerPhone)}
          />
        </Field>

        <Field tone="dark" label="Instructions for your chauffeur" id="change-notes" className="sm:col-span-2">
          <Textarea tone="dark" id="change-notes" name="notes" defaultValue={value("notes", details.notes)} />
        </Field>
      </div>

      <p className="text-[14px] leading-[1.6] text-white/70">
        The email address stays as it is, because that is where your codes go. To change it, call us.
      </p>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Submit intent="save" pendingLabel="Saving…">
          Save changes
        </Submit>
        <TextButton intent="cancel">Cancel</TextButton>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* The quote-request form                                                     */
/* -------------------------------------------------------------------------- */

function QuoteEdit({
  details,
  values,
  error,
  fields = {},
}: {
  details: ChangeableQuote;
  values?: Record<string, string>;
  error?: string;
  fields?: Record<string, string>;
}) {
  const [eventDate, setEventDate] = useState(values?.eventDate ?? details.eventDate ?? "");
  const value = (key: string, fallback: string | number | null) => values?.[key] ?? String(fallback ?? "");

  return (
    <>
      <div>
        <Heading>Change your request</Heading>
        <p className="mt-2 max-w-lg text-[15px] leading-[1.7] text-white/75">
          Edit what has changed and save. For a different kind of service, send a new request.
        </p>
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field tone="dark" label="Date" id="change-event-date" error={fields.eventDate} hint="Leave empty if it is not fixed yet.">
          <DateField tone="dark"
            id="change-event-date"
            name="eventDate"
            min={todayInNewYork()}
            value={eventDate}
            onChange={(event) => setEventDate(event.target.value)}
          />
        </Field>
        <Field tone="dark" label="Passengers" id="change-q-passengers" error={fields.passengers}>
          <Input tone="dark" id="change-q-passengers" name="passengers" type="number" min={1} max={500} defaultValue={value("passengers", details.passengers)} />
        </Field>
        <Field tone="dark" label="Company" id="change-company" className="sm:col-span-2">
          <Input tone="dark" id="change-company" name="company" autoComplete="organization" defaultValue={value("company", details.company)} />
        </Field>
        <Field tone="dark" label="Your name" id="change-q-name" error={fields.customerName}>
          <Input tone="dark" id="change-q-name" name="name" required autoComplete="name" defaultValue={value("name", details.customerName)} />
        </Field>
        <Field tone="dark" label="Phone" id="change-q-phone" error={fields.customerPhone} hint="You will need it to look the request up.">
          <Input tone="dark" id="change-q-phone" name="customerPhone" type="tel" required autoComplete="tel" defaultValue={value("customerPhone", details.customerPhone)} />
        </Field>
        <Field tone="dark" label="What you need" id="change-details" error={fields.details} className="sm:col-span-2">
          <Textarea tone="dark" id="change-details" name="details" required rows={6} defaultValue={value("details", details.details)} />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Submit intent="save" pendingLabel="Saving…">
          Save changes
        </Submit>
        <TextButton intent="cancel">Cancel</TextButton>
      </div>
    </>
  );
}

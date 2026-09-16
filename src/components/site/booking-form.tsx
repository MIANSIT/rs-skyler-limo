"use client";

import Link from "next/link";
import { useActionState, useCallback, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { AddressField } from "@/components/site/address-field";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { clsx } from "@/lib/clsx";
import type { BookingOptions, FleetVehicle } from "@/lib/api/types";
import { submitBooking, type BookingFormState } from "@/lib/public/actions";

type TripType = "airport" | "point-to-point" | "hourly";

const tripTypes: { value: TripType; label: string }[] = [
  { value: "airport", label: "Airport" },
  { value: "point-to-point", label: "Point to point" },
  { value: "hourly", label: "Hourly" },
];

/**
 * The five boroughs, offered when Places is not configured.
 *
 * Selecting one is what makes a fixed airport fare available in that case —
 * it is the customer telling us the trip is inside the city, which Google
 * would otherwise have told us.
 */
/** Mirrors `bookingServiceTypes` in `api/src/schemas.ts`. */
const SERVICE_TYPES = [
  { value: "personal", label: "Personal travel" },
  { value: "corporate", label: "Corporate / business" },
  { value: "wedding", label: "Wedding" },
  { value: "event", label: "Event" },
  { value: "other", label: "Something else" },
] as const;

const BOROUGHS = [
  "Manhattan",
  "Brooklyn",
  "Queens",
  "The Bronx",
  "Staten Island",
] as const;

function SubmitButton({ fixed }: { fixed: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="cta"
      size="lg"
      disabled={pending}
      className="sm:w-auto"
    >
      {pending ? "Sending…" : fixed ? "Book at this fare" : "Request a quote"}
    </Button>
  );
}

export function BookingForm({
  fleet,
  options,
}: {
  fleet: FleetVehicle[];
  options: BookingOptions;
}) {
  const [trip, setTrip] = useState<TripType>("airport");
  const [vehicle, setVehicle] = useState(fleet[0]?.slug ?? "");
  const [childSeats, setChildSeats] = useState(0);
  const [airport, setAirport] = useState(options.airports[0]?.code ?? "");
  const [direction, setDirection] = useState<"from-airport" | "to-airport">(
    "from-airport",
  );
  const [borough, setBorough] = useState<string>("");
  const [cityPlaceId, setCityPlaceId] = useState<string | null>(null);

  const [state, formAction] = useActionState<BookingFormState, FormData>(
    submitBooking,
    { status: "idle" },
  );

  /**
   * One token for the whole run of keystrokes plus the details lookup. Google
   * bills per session rather than per request when the same token is carried
   * through, and a fresh one per render would defeat that.
   *
   * Created on the first keystroke, not during render and not on mount. A
   * random value produced while rendering runs twice — once on the server,
   * once on the client — and the two never agree, which is a hydration
   * mismatch on the hidden input's `value`. Creating it in an event handler
   * sidesteps that, and has the better billing shape too: no session exists
   * until somebody actually looks an address up.
   */
  const [sessionToken, setSessionToken] = useState("");

  const startPlacesSession = useCallback(() => {
    setSessionToken((current) =>
      current
        ? current
        : typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `t-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
  }, []);

  const selected = useMemo(
    () => fleet.find((item) => item.slug === vehicle) ?? fleet[0],
    [fleet, vehicle],
  );

  const maxChildSeats = selected?.maxChildSeats ?? 0;
  const seatsInRange = Math.min(childSeats, maxChildSeats);
  if (seatsInRange !== childSeats) setChildSeats(seatsInRange);

  /**
   * The fare preview.
   *
   * A preview only — the server decides again on submission against the live
   * rate card, and this number is never sent. It exists so the customer is not
   * asked to book blind, and so the button can say what will actually happen.
   */
  const published = useMemo(() => {
    if (trip !== "airport" || !airport || !selected) return null;
    return (
      options.rates.find(
        (rate) =>
          rate.airportCode === airport && rate.vehicleSlug === selected.slug,
      ) ?? null
    );
  }, [trip, airport, selected, options.rates]);

  // Without Places, the borough dropdown is what establishes "inside the city".
  const insideCity = options.placesEnabled ? Boolean(cityPlaceId) : Boolean(borough);
  const isFixed = Boolean(published) && insideCity;

  const seatFee = (seatsInRange * options.childSeatFeeCents) / 100;
  const fareTotal = published ? published.priceCents / 100 + seatFee : null;

  /**
   * Which end of the trip each address box is.
   *
   * On an airport run there is only one address to give — the other end is the
   * airport — and which end it is depends on the direction of travel. Derived
   * here rather than inline so the `name` a field submits under cannot drift
   * from the label above it, which is exactly how pickup and destination got
   * reversed.
   */
  const cityField =
    trip === "airport"
      ? direction === "to-airport"
        ? ("pickup" as const)
        : ("destination" as const)
      : ("pickup" as const);

  const cityLabel =
    trip === "airport"
      ? direction === "to-airport"
        ? "Pickup address"
        : "Drop-off address"
      : trip === "hourly"
        ? "Starting from"
        : "Pickup";

  const fieldError = (name: string) =>
    state.status === "error" ? state.fields?.[name] : undefined;

  const prior = (name: string) =>
    state.status === "error" ? (state.values[name] ?? "") : "";

  const restore = (name: string) => ({ defaultValue: prior(name) });

  const formKey = state.status === "error" ? state.attempt : 0;

  if (state.status === "success") {
    return (
      <div className="bg-white p-6 shadow-[0_24px_60px_-24px_rgba(11,33,66,0.45)] md:p-8">
        <p className="font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/70 uppercase">
          {state.pricingMode === "fixed" ? "Booked" : "Request received"}
        </p>
        <p className="font-display mt-2 text-[30px] leading-none font-semibold text-midnight tabular-nums">
          {state.reference}
        </p>

        {state.pricingMode === "fixed" && state.quotedTotalCents !== null ? (
          <p className="mt-4 text-[15px] leading-[1.7] text-charcoal">
            Your fare is{" "}
            <strong className="font-semibold text-midnight tabular-nums">
              ${Math.round(state.quotedTotalCents / 100)}
            </strong>
            , fixed. A reservations agent confirms every booking by reply.
          </p>
        ) : (
          <p className="mt-4 text-[15px] leading-[1.7] text-charcoal">
            We price this kind of trip by hand rather than guess at it. A
            reservations agent will come back to you with a fare by phone or
            email, usually within the hour.
          </p>
        )}

        <p className="mt-4 text-[15px] leading-[1.7] text-charcoal">
          Keep this reference. You can check it any time on the{" "}
          <Link
            href="/track"
            className="text-midnight underline underline-offset-4"
          >
            tracking page
          </Link>{" "}
          with the phone number you gave us.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 shadow-[0_24px_60px_-24px_rgba(11,33,66,0.45)] md:p-8">
      <div
        role="tablist"
        aria-label="Trip type"
        className="flex border-b border-midnight/10"
      >
        {tripTypes.map((option) => {
          const active = trip === option.value;
          return (
            <button
              key={option.value}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setTrip(option.value)}
              className={clsx(
                "-mb-px border-b-2 px-4 py-3 font-sans text-[13px] font-medium tracking-[0.08em] uppercase transition-colors",
                active
                  ? "border-gold text-midnight"
                  : "border-transparent text-charcoal/60 hover:text-midnight",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <form
        key={formKey}
        action={formAction}
        className="mt-6 flex flex-col gap-5"
      >
        <input type="hidden" name="tripType" value={trip} />
        <input type="hidden" name="placesSessionToken" value={sessionToken} />
        {trip === "airport" ? (
          <>
            <input type="hidden" name="airportCode" value={airport} />
            <input type="hidden" name="airportDirection" value={direction} />
          </>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          {trip === "airport" ? (
            <>
              <Field label="Airport" id="airport">
                <Select
                  id="airport"
                  value={airport}
                  onChange={(event) => setAirport(event.target.value)}
                >
                  {options.airports.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Direction" id="direction">
                <Select
                  id="direction"
                  value={direction}
                  onChange={(event) =>
                    setDirection(event.target.value as typeof direction)
                  }
                >
                  <option value="from-airport">Picking up at the airport</option>
                  <option value="to-airport">Going to the airport</option>
                </Select>
              </Field>
            </>
          ) : null}

          <Field
            label={cityLabel}
            id="cityAddress"
            error={fieldError(cityField)}
            hint={
              options.placesEnabled
                ? "Start typing and pick your address from the list."
                : undefined
            }
            className="sm:col-span-2"
          >
            <AddressField
              id="cityAddress"
              name={cityField}
              placeholder="Address or landmark"
              required
              enabled={options.placesEnabled}
              sessionToken={sessionToken}
              defaultValue={prior(cityField)}
              onResolve={setCityPlaceId}
              onTypingStart={startPlacesSession}
            />
          </Field>

          {trip === "airport" && !options.placesEnabled ? (
            <Field
              label="Borough"
              id="statedBorough"
              hint="Fixed airport fares cover the five boroughs. Anywhere else, we quote."
              className="sm:col-span-2"
            >
              <Select
                id="statedBorough"
                name="statedBorough"
                value={borough}
                onChange={(event) => setBorough(event.target.value)}
              >
                <option value="">Outside New York City</option>
                {BOROUGHS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          {trip !== "airport" ? (
            <Field
              label={trip === "hourly" ? "Where to, roughly" : "Destination"}
              id="otherEnd"
              error={fieldError("destination")}
              className="sm:col-span-2"
            >
              <AddressField
                id="otherEnd"
                name="destination"
                placeholder="Address or landmark"
                required
                enabled={options.placesEnabled}
                sessionToken={sessionToken}
                defaultValue={prior("destination")}
                onTypingStart={startPlacesSession}
              />
            </Field>
          ) : null}

          <Field label="Date" id="date" error={fieldError("pickupAt")}>
            <Input id="date" name="date" type="date" required {...restore("date")} />
          </Field>

          <Field label="Time" id="time">
            <Input id="time" name="time" type="time" required {...restore("time")} />
          </Field>

          <Field label="Vehicle class" id="vehicle">
            <Select
              id="vehicle"
              name="vehicle"
              value={vehicle}
              onChange={(event) => setVehicle(event.target.value)}
            >
              {fleet.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name} · up to {item.passengerCapacity}
                </option>
              ))}
            </Select>
          </Field>

          {/*
            The occasion, not the shape of the journey — trip type above already
            covers that. It decides who in the business picks the booking up, so
            it is asked rather than inferred.
          */}
          <Field label="What is this for" id="serviceType">
            <Select
              id="serviceType"
              name="serviceType"
              defaultValue={prior("serviceType") || "personal"}
            >
              {SERVICE_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>

          {/*
            Airline and flight number together.

            The API has accepted an `airline` field and the column has existed
            since the first migration — the form simply never asked, so it was
            always null. The hint used to promise that we track the flight and
            move the pickup with it; nothing tracks flights, so it now says what
            the number is genuinely for.
          */}
          {trip === "airport" ? (
            <>
              <Field label="Airline" id="airline" hint="Optional.">
                <Input
                  id="airline"
                  name="airline"
                  placeholder="e.g. Delta"
                  maxLength={120}
                  autoComplete="off"
                  {...restore("airline")}
                />
              </Field>

              <Field
                label="Flight number"
                id="flight"
                hint="So your driver knows which arrival to meet."
              >
                <Input
                  id="flight"
                  name="flight"
                  placeholder="Optional"
                  maxLength={20}
                  {...restore("flight")}
                />
              </Field>
            </>
          ) : null}

          <Field label="Passengers" id="passengers">
            <Input
              id="passengers"
              name="passengers"
              type="number"
              min={1}
              max={selected?.passengerCapacity ?? 14}
              defaultValue={prior("passengers") || 1}
            />
          </Field>

          <Field label="Bags" id="bags">
            <Input
              id="bags"
              name="bags"
              type="number"
              min={0}
              max={selected?.luggageCapacity ?? 12}
              defaultValue={prior("bags") || 0}
            />
          </Field>

          {maxChildSeats > 0 ? (
            <Field
              label="Child seats"
              id="childSeats"
              hint={`$${options.childSeatFeeCents / 100} each, up to ${maxChildSeats}.`}
            >
              <Select
                id="childSeats"
                name="childSeats"
                value={String(seatsInRange)}
                onChange={(event) => setChildSeats(Number(event.target.value))}
              >
                {Array.from({ length: maxChildSeats + 1 }, (_, count) => (
                  <option key={count} value={count}>
                    {count === 0 ? "None" : `${count} seat${count > 1 ? "s" : ""}`}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <Field label="Name" id="name" error={fieldError("customerName")}>
            <Input id="name" name="name" autoComplete="name" required maxLength={160} {...restore("name")} />
          </Field>

          <Field
            label="Phone"
            id="phone"
            error={fieldError("customerPhone")}
            hint="You will need this to track the booking."
          >
            <Input id="phone" name="phone" type="tel" autoComplete="tel" required {...restore("phone")} />
          </Field>

          <Field label="Email" id="email" error={fieldError("customerEmail")} className="sm:col-span-2">
            <Input id="email" name="email" type="email" autoComplete="email" required {...restore("email")} />
          </Field>

          <div className="sm:col-span-2">
            <Field
              label="Anything we should know"
              id="notes"
              hint="Extra stop, a door to use, a flight you are connecting from. Optional."
            >
              <Textarea id="notes" name="notes" maxLength={5000} {...restore("notes")} />
            </Field>
          </div>
        </div>

        <div className="border-t border-midnight/10 pt-5">
          <Checkbox
            id="terms"
            name="terms"
            required
            error={fieldError("terms")}
            label={
              <>
                I accept the{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  className="font-medium text-midnight underline underline-offset-4"
                >
                  terms and conditions
                </Link>
                , including the cancellation window and how the final fare is
                calculated.
              </>
            }
          />
        </div>

        <div className="flex flex-col gap-4 border-t border-midnight/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {isFixed && fareTotal !== null ? (
              <>
                <p className="font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/70 uppercase">
                  Fixed fare · {selected?.name}
                </p>
                <p className="font-display mt-1 text-[30px] leading-none font-semibold text-midnight tabular-nums">
                  ${fareTotal}
                </p>
                <p className="mt-2 text-[13px] text-charcoal/70">
                  Tolls and gratuity included. Not an estimate.
                  {seatFee > 0 ? ` Includes $${seatFee} for child seats.` : ""}
                </p>
              </>
            ) : (
              <>
                <p className="font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/70 uppercase">
                  Priced by a person
                </p>
                <p className="mt-1 max-w-sm text-[15px] leading-[1.6] text-charcoal">
                  {trip === "airport"
                    ? "Fixed fares cover the five boroughs. We will price this one and come back to you."
                    : "Send the details and a reservations agent comes back with a fare, usually within the hour."}
                </p>
              </>
            )}
          </div>

          <SubmitButton fixed={isFixed} />
        </div>

        {state.status === "error" ? (
          <p
            role="alert"
            className="border-l-2 border-red-700 bg-red-700/5 px-4 py-3 text-[15px] text-red-800"
          >
            {state.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}

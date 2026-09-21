"use client";

import Link from "next/link";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFormStatus } from "react-dom";

import { AddressField } from "@/components/site/address-field";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { clsx } from "@/lib/clsx";
import type { BookingOptions, FleetVehicle } from "@/lib/api/types";
import { submitBooking, type BookingFormState } from "@/lib/public/actions";
import {
  clockLabel,
  deviceEquivalent,
  pickupProblems,
  shortDay,
  useNewYorkClock,
} from "@/lib/public/use-new-york-clock";

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

/**
 * The form as three short screens rather than one long one, so the hero card
 * never dwarfs the copy beside it. All ~18 fields stay mounted at once — only
 * `hidden` toggles — so nothing entered is lost moving back and forth, and
 * the single `<form>` still posts everything together on final submit.
 */
type Step = 1 | 2 | 3;

const STEPS: { id: Step; label: string }[] = [
  { id: 1, label: "Trip" },
  { id: 2, label: "Details" },
  { id: 3, label: "You" },
];

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
  // Airport and vehicle class start unset rather than defaulting to the
  // first item in each list: silently pre-picking one is how a customer
  // ends up booked from the wrong airport without ever having chosen it.
  // Direction and borough keep their defaults below — those are genuinely
  // meaningful defaults (the more common direction; "no borough assumed"),
  // not just "first in a list".
  const [vehicle, setVehicle] = useState("");
  const [childSeats, setChildSeats] = useState(0);
  const [airport, setAirport] = useState("");
  const [direction, setDirection] = useState<"from-airport" | "to-airport">(
    "from-airport",
  );
  const [borough, setBorough] = useState<string>("");
  const [cityPlaceId, setCityPlaceId] = useState<string | null>(null);

  const [step, setStep] = useState<Step>(1);
  const dateRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);

  // New York's date and time, known in the browser only. Empty until then.
  const { today, now } = useNewYorkClock();

  // Controlled, so the reason a pick-up is refused can be shown as soon as it
  // is chosen instead of only when the customer presses Continue.
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const problem = pickupProblems(pickupDate, pickupTime, today, now);

  // For someone booking from another time zone: what the chosen New York time
  // is on their own device. Empty when the device is on New York time already.
  const onYourDevice =
    pickupDate && pickupTime && !problem.date && !problem.time
      ? deviceEquivalent(pickupDate, pickupTime)
      : "";

  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);

  const [state, formAction] = useActionState<BookingFormState, FormData>(
    submitBooking,
    { status: "idle" },
  );

  // A server-side error can flag a field on step 1 or 2 while the customer is
  // sitting on step 3 — send them back to the top so the flagged field is
  // visible, rather than leaving an error nobody can see. Adjusted during
  // render (React's endorsed pattern for resetting state on a prop change)
  // rather than in an effect, so there is no extra cascading render.
  const [lastErrorAttempt, setLastErrorAttempt] = useState(0);
  if (state.status === "error" && state.attempt !== lastErrorAttempt) {
    setLastErrorAttempt(state.attempt);
    setStep(1);
  }

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

  /**
   * A past pick-up cannot be booked. The message is shown under the field, and
   * also set on the input itself so the step's existing `:invalid` check will
   * not move on until it clears. The server applies the same rule; this only
   * saves the round trip.
   */
  useEffect(() => {
    dateRef.current?.setCustomValidity(problem.date);
    timeRef.current?.setCustomValidity(problem.time);
  }, [problem.date, problem.time]);

  /**
   * Advances past the given step only if everything required in it is
   * filled — reusing the `required`/`type="email"` constraints already on
   * the inputs rather than a parallel set of rules. The first invalid field
   * gets the browser's own validation bubble and focus.
   */
  const goNext = (containerRef: React.RefObject<HTMLDivElement | null>, next: Step) => {
    const invalid = containerRef.current?.querySelector<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >(":invalid");

    if (invalid) {
      invalid.reportValidity();
      invalid.focus();
      return;
    }

    setStep(next);
  };

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
          Pick-up times are New York time.
        </p>

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

      {/* Step progress. A completed step is clickable to go back; the
          current and coming steps are not, so nobody can skip ahead of
          validation. Gold marks the active step as a border, never as this
          label's text colour. */}
      <div
        role="tablist"
        aria-label="Booking step"
        className="mt-5 flex items-center gap-2"
      >
        {STEPS.map((item, index) => {
          const active = step === item.id;
          const complete = step > item.id;
          return (
            <div key={item.id} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                role="tab"
                aria-selected={active}
                disabled={!complete}
                onClick={() => complete && setStep(item.id)}
                className={clsx(
                  "flex w-full items-center gap-2 border-b-2 pb-2 font-sans text-[13px] font-medium tracking-[0.06em] uppercase transition-colors",
                  active
                    ? "border-gold text-midnight"
                    : complete
                      ? "border-midnight/20 text-midnight/70 hover:border-midnight/40"
                      : "cursor-default border-midnight/10 text-charcoal/40",
                )}
              >
                <span className="tabular-nums">{item.id}</span>
                {item.label}
              </button>
              {index < STEPS.length - 1 ? (
                <span aria-hidden className="text-charcoal/20">
                  /
                </span>
              ) : null}
            </div>
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

        {/* Step 1 — Trip */}
        <div className={clsx("flex flex-col gap-5", step !== 1 && "hidden")}>
        <div ref={step1Ref} className="grid gap-5 sm:grid-cols-2">
          {trip === "airport" ? (
            <>
              <Field label="Airport" id="airport">
                <Select
                  id="airport"
                  required
                  value={airport}
                  onChange={(event) => setAirport(event.target.value)}
                >
                  <option value="" disabled>
                    Select airport
                  </option>
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

          <Field
            label="Date"
            id="date"
            error={fieldError("pickupAt") ?? (problem.date || undefined)}
            hint={today ? `Today is ${shortDay(today)} in New York.` : undefined}
          >
            <Input
              id="date"
              name="date"
              type="date"
              required
              ref={dateRef}
              min={today || undefined}
              value={pickupDate}
              onChange={(event) => setPickupDate(event.target.value)}
              aria-invalid={problem.date ? true : undefined}
              aria-describedby={problem.date ? "date-error" : undefined}
            />
          </Field>

          <Field
            label="Time"
            id="time"
            error={problem.time || undefined}
            hint="New York time."
          >
            <Input
              id="time"
              name="time"
              type="time"
              required
              ref={timeRef}
              value={pickupTime}
              onChange={(event) => setPickupTime(event.target.value)}
              aria-invalid={problem.time ? true : undefined}
              aria-describedby={problem.time ? "time-error" : undefined}
            />
          </Field>

          {today && now ? (
            <div className="flex flex-col gap-1 text-[13px] leading-[1.6] text-charcoal/70 sm:col-span-2">
              <p>
                It is <span className="tabular-nums">{clockLabel(now)}</span> on{" "}
                {shortDay(today)} in New York now.
              </p>
              {onYourDevice ? (
                <p>
                  That is{" "}
                  <span className="tabular-nums">{onYourDevice}</span> on your
                  device.
                </p>
              ) : null}
            </div>
          ) : null}

          <Field label="Vehicle class" id="vehicle">
            <Select
              id="vehicle"
              name="vehicle"
              required
              value={vehicle}
              onChange={(event) => setVehicle(event.target.value)}
            >
              <option value="" disabled>
                Select vehicle class
              </option>
              {fleet.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name} · up to {item.passengerCapacity}
                </option>
              ))}
            </Select>
          </Field>
        </div>

          <div className="flex justify-end border-t border-midnight/10 pt-5">
            <Button type="button" variant="primary" onClick={() => goNext(step1Ref, 2)}>
              Continue
            </Button>
          </div>
        </div>

        {/* Step 2 — Details */}
        <div className={clsx("flex flex-col gap-5", step !== 2 && "hidden")}>
        <div ref={step2Ref} className="grid gap-5 sm:grid-cols-2">
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

          <div className="flex items-center justify-between border-t border-midnight/10 pt-5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep(1)}
            >
              Back
            </Button>
            <Button type="button" variant="primary" onClick={() => goNext(step2Ref, 3)}>
              Continue
            </Button>
          </div>
        </div>

        {/* Step 3 — You */}
        <div className={clsx("flex flex-col gap-5", step !== 3 && "hidden")}>
          <div className="grid gap-5 sm:grid-cols-2">
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

          <div className="flex justify-start">
            <Button type="button" variant="secondary" onClick={() => setStep(2)}>
              Back
            </Button>
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

"use client";
import { formatReference } from "@/lib/public/reference";

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
import { EmailInput } from "@/components/site/email-input";
import { FormGuard } from "@/components/site/form-guard";
import { Button, ButtonOnDark } from "@/components/ui/button";
import { DateField, TimeField } from "@/components/ui/date-time-field";
import {
  Checkbox,
  Field,
  glassCard,
  Input,
  PhoneInput,
  RadioCards,
  Select,
  Textarea,
} from "@/components/ui/field";
import { clsx } from "@/lib/clsx";
import { useConversion } from "@/lib/use-conversion";
import type { BookingOptions, FleetVehicle } from "@/lib/api/types";
import { submitBooking, type BookingFormState } from "@/lib/public/actions";
import {
  clockLabel,
  deviceEquivalent,
  pickupProblems,
  shortDay,
  useNewYorkClock,
} from "@/lib/public/use-new-york-clock";

import { type TripType, tripTypes } from "@/lib/public/trip-types";
import { formatRate, withTax } from "@/lib/public/tax";
import { formatFare } from "@/lib/content";
import { TripSummary } from "@/components/site/trip-summary";

/** Mirrors `bookingServiceTypes` in `api/src/schemas.ts`. */
const SERVICE_TYPES = [
  { value: "personal", label: "Personal travel" },
  { value: "corporate", label: "Corporate / business" },
  { value: "wedding", label: "Wedding" },
  { value: "event", label: "Event" },
  { value: "other", label: "Something else" },
] as const;

/**
 * Mirrors `paymentMethods` in `api/src/schemas.ts`. Offered on every booking:
 * whichever way the trip is priced, it is paid by card or in cash on the day.
 *
 * Card goes through Stripe Checkout: a fixed fare straight after booking, a
 * quoted trip from the tracking page once it has a price.
 */
/**
 * Cash on delivery is switched off for new bookings but kept in the code, the
 * API and the admin, so existing cash bookings still read correctly and turning
 * it back on is this one flag. If card payment is unavailable it is offered
 * anyway: a form with no way to pay cannot be submitted.
 */
const CASH_ON_DELIVERY_ENABLED = false;

const PAYMENT_OPTIONS = [
  {
    value: "card",
    label: "Card (Stripe)",
    description:
      "Paid securely through Stripe. A fixed fare straight after booking; a quoted trip once we price it.",
  },
  {
    value: "cash",
    label: "Cash on Delivery",
    description: "Paid in cash to your chauffeur at the end of the trip.",
  },
];

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

/**
 * What a field submits under, for reporting a problem against it. Custom
 * controls (`Select`, `DateField`, `TimeField`) hide a real form control
 * behind their own markup, and the airport select has no `name` at all — its
 * value travels in a hidden input — so each one also carries `data-field`.
 */
function fieldKey(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  return field.name || field.dataset.field || field.id;
}

/**
 * Our own wording for the browser's validity flags.
 *
 * `validationMessage` is the browser's, and on a visually hidden carrier the
 * bubble that normally carries it is never drawn — which is exactly why
 * nothing appeared on a phone. The message is shown under the field instead,
 * so it has to read like the rest of the form rather than like Chrome.
 */
function messageFor(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  const validity = field.validity;
  if (validity.valueMissing) return "Please fill this in.";
  if (validity.typeMismatch)
    return field.type === "email"
      ? "Enter a complete email address."
      : "This does not look right.";
  if (validity.rangeUnderflow || validity.rangeOverflow || validity.stepMismatch)
    return "Outside the range we can take.";
  if (validity.tooShort || validity.tooLong) return "Check the length.";
  // A custom message we set ourselves — the past pick-up rule — reads fine.
  return field.validationMessage || "Check this.";
}

/** Every invalid control in `container`, keyed by `fieldKey`. */
function collectInvalid(container: HTMLElement | null | undefined) {
  const found: Record<string, string> = {};
  container
    ?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      "input, select, textarea",
    )
    .forEach((field) => {
      if (field.disabled || field.type === "hidden" || field.checkValidity()) return;
      const key = fieldKey(field);
      if (key && !found[key]) found[key] = messageFor(field);
    });
  return found;
}

/**
 * Brings the first flagged field into view.
 *
 * The invalid control may be one of the hidden carriers, which cannot be
 * focused or scrolled to; the visible trigger beside it is what the customer
 * sees, so that is what gets focus.
 */
function revealFirst(container: HTMLElement | null | undefined) {
  const field = container?.querySelector<HTMLElement>(":invalid");
  if (!field) return;
  const visible =
    field.closest("div")?.querySelector<HTMLElement>('button[role="combobox"]') ?? field;

  visible.scrollIntoView({ block: "center", behavior: "smooth" });
  // `offsetParent` is null for the hidden carriers and for a step that is
  // still `display: none`; focusing those does nothing useful.
  if (visible.offsetParent !== null) visible.focus({ preventScroll: true });
}

/**
 * `tone="dark"` is the frosted-glass card used in the homepage hero, over
 * video; `"light"` (the default) is the plain white card the standalone
 * `/book` page still uses. One component, one set of fields and validation —
 * only the chrome around it changes, via the shared primitives' own `tone`
 * prop (see `components/ui/field.tsx`).
 *
 * `initialTrip` and `initialVehicle` carry the choice made on the homepage
 * hero's booking card through to `/book`, so the customer does not pick the
 * same two things twice. A vehicle slug not in the fleet is ignored.
 */
export function BookingForm({
  fleet,
  options,
  tone = "light",
  initialTrip = "airport",
  initialVehicle = "",
  withSummary = false,
}: {
  fleet: FleetVehicle[];
  options: BookingOptions;
  tone?: "light" | "dark";
  initialTrip?: TripType;
  initialVehicle?: string;
  /** Show the live "Your trip" panel beside the form (`/book`). */
  withSummary?: boolean;
}) {
  const dark = tone === "dark";

  const [trip, setTrip] = useState<TripType>(initialTrip);
  // Airport and vehicle class start unset rather than defaulting to the
  // first item in each list: silently pre-picking one is how a customer
  // ends up booked from the wrong airport without ever having chosen it.
  // Direction keeps its default below — the more common direction is a
  // genuinely meaningful default, not just "first in a list".
  const [vehicle, setVehicle] = useState(() =>
    fleet.some((item) => item.slug === initialVehicle) ? initialVehicle : "",
  );
  const [childSeats, setChildSeats] = useState(0);
  const [airport, setAirport] = useState("");
  const [direction, setDirection] = useState<"from-airport" | "to-airport">(
    "from-airport",
  );
  const [cityPlaceId, setCityPlaceId] = useState<string | null>(null);
  // Where the chosen address sits, as the API answered for that place id.
  // Keyed by id so an answer for an address the customer has since replaced is
  // never read for the new one. `isManhattan` is what the fare turns on;
  // `isNewYorkCity` only decides how the "why not" is worded.
  const [cityCheck, setCityCheck] = useState<{
    placeId: string;
    isNewYorkCity: boolean | null;
    isManhattan: boolean | null;
  } | null>(null);
  // The address text as typed, for the trip summary only — the fields
  // themselves still submit their own values.
  const [cityText, setCityText] = useState("");
  const [otherText, setOtherText] = useState("");

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
  const step3Ref = useRef<HTMLDivElement>(null);

  /**
   * Fields the browser refuses, keyed by the name they submit under, filled
   * when Continue or Book is pressed.
   *
   * The browser's own `reportValidity()` bubble used to be the only feedback
   * here, and it is drawn by the browser or not at all: iOS Safari never
   * draws one, and every select, date and time field is a custom control
   * whose real input is visually hidden, so on a phone a missing field
   * produced no bubble, no focus ring and no message — Continue simply did
   * nothing. These marks drive a red border on each field and its message
   * underneath, which renders the same everywhere.
   */
  const [invalid, setInvalid] = useState<Record<string, string>>({});

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
    // An airport the operator prices by hand publishes no fare. The API
    // already withholds its rates, so this only states the rule where the
    // preview is read rather than leaving it to an empty lookup.
    if (options.airports.find((item) => item.code === airport)?.quoteOnly) {
      return null;
    }
    return (
      options.rates.find(
        (rate) =>
          rate.airportCode === airport && rate.vehicleSlug === selected.slug,
      ) ?? null
    );
  }, [trip, airport, selected, options.airports, options.rates]);

  /** Set when the chosen airport is quoted whatever is on its rate card. */
  const quoteOnlyAirport =
    trip === "airport" && airport
      ? (options.airports.find((item) => item.code === airport)?.quoteOnly ?? false)
      : false;

  // Ask once per chosen address. Without the answer the preview cannot tell a
  // Manhattan pickup from a Hoboken one, and would offer a fare the server
  // then turns into a quote on submission.
  useEffect(() => {
    if (!cityPlaceId || !sessionToken) return;
    if (cityCheck?.placeId === cityPlaceId) return;

    const controller = new AbortController();
    fetch(
      `/api/places/resolve?placeId=${encodeURIComponent(cityPlaceId)}&session=${encodeURIComponent(sessionToken)}`,
      { signal: controller.signal },
    )
      .then((response) =>
        response.ok ? response.json() : { isNewYorkCity: null, isManhattan: null },
      )
      .then((data: { isNewYorkCity: boolean | null; isManhattan: boolean | null }) =>
        setCityCheck({
          placeId: cityPlaceId,
          isNewYorkCity: data.isNewYorkCity,
          isManhattan: data.isManhattan,
        }),
      )
      .catch(() => {
        // Aborted, or offline: the preview stays a quote, which is safe.
      });

    return () => controller.abort();
  }, [cityPlaceId, sessionToken, cityCheck]);

  // Only an address the API has placed in Manhattan gets the published fare —
  // see `FIXED_FARE_AREA` in `api/src/services/pricing.ts`, which is the rule
  // this previews. Until the API answers, or when it cannot, the trip previews
  // as a quote, the same direction `decideFare` fails in.
  const answered =
    cityPlaceId !== null && cityCheck?.placeId === cityPlaceId ? cityCheck : null;
  const cityInManhattan = answered?.isManhattan === true;
  // A known address in one of the other four boroughs. Worth separating: those
  // customers are covered, just quoted, and saying otherwise would be false.
  const cityInOuterBorough =
    answered?.isManhattan === false && answered.isNewYorkCity === true;
  const isFixed = Boolean(published) && cityInManhattan;

  const seatFeeCents = seatsInRange * options.childSeatFeeCents;
  // The rate plus child seats, then sales tax on the lot — the same sum the
  // server does on submission, at the rate the API published with the rates.
  const fare = published
    ? withTax(published.priceCents + seatFeeCents, options.taxRate)
    : null;

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

  /**
   * Card is offered only when the API says Stripe is configured. `prior` is
   * filtered through the same list so a restored "card" from a submission made
   * before the key was removed cannot select an option that is no longer there.
   */
  const paymentOptions = useMemo(
    () =>
      PAYMENT_OPTIONS.filter((option) =>
        option.value === "card"
          ? options.cardPaymentsEnabled
          : CASH_ON_DELIVERY_ENABLED || !options.cardPaymentsEnabled,
      ),
    [options.cardPaymentsEnabled],
  );

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

  const stepRefs: Record<Step, React.RefObject<HTMLDivElement | null>> = {
    1: step1Ref,
    2: step2Ref,
    3: step3Ref,
  };

  /**
   * Advances past the given step only if everything required in it is
   * filled — reusing the `required`/`type="email"` constraints already on
   * the inputs rather than a parallel set of rules. Anything missing is
   * flagged red with its message, and the first one is scrolled to.
   */
  const goNext = (step: Step, next: Step) => {
    const container = stepRefs[step].current;
    const found = collectInvalid(container);

    if (Object.keys(found).length > 0) {
      setInvalid(found);
      revealFirst(container);
      return;
    }

    setInvalid({});
    setStep(next);
  };

  /**
   * The same check across all three steps on final submit.
   *
   * Steps the customer is not on are `display: none` rather than unmounted,
   * and a `display: none` required field still fails constraint validation —
   * the browser then refuses the submit with nothing but a console warning,
   * because it has no field it can focus. So the step holding the problem is
   * opened first, then flagged.
   */
  const guardSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    for (const step of [1, 2, 3] as const) {
      const container = stepRefs[step].current;
      const found = collectInvalid(container);
      if (Object.keys(found).length === 0) continue;

      event.preventDefault();
      setInvalid(found);
      setStep(step);
      // After the step has been un-hidden, or the field cannot be focused.
      requestAnimationFrame(() => revealFirst(container));
      return;
    }

    setInvalid({});
  };

  /**
   * Keeps the marks honest once they are up: a field that has since been
   * filled loses its red as soon as it is, rather than staying red until the
   * next Continue. Only existing marks are cleared — a field nobody has
   * reached yet is never flagged mid-typing.
   *
   * Typing reaches this through the form's own `input` event. The custom
   * select, date and time controls write their hidden carrier's value
   * imperatively and fire no DOM event, so each of their handlers calls this
   * directly; the carrier is already up to date by then.
   */
  const recheck = useCallback(() => {
    setInvalid((current) => {
      const keys = Object.keys(current);
      if (keys.length === 0) return current;

      const found = collectInvalid(stepRefs[step].current);
      const next = Object.fromEntries(
        keys.filter((key) => key in found).map((key) => [key, current[key]!]),
      );
      return Object.keys(next).length === keys.length ? current : next;
    });
    // `stepRefs` is rebuilt each render but always holds the same three refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* Step/section dividers, and every other hairline inside the card, derive
     from midnight on the light card and from white on the dark one — the
     same "border derived from the ground colour" rule `Rule` in
     `ui/section.tsx` already follows. */
  const divider = dark ? "border-white/15" : "border-midnight/10";
  const cardChrome = dark
    ? glassCard
    : "bg-white shadow-[0_24px_60px_-24px_rgba(11,33,66,0.45)]";
  const heading = dark ? "text-white" : "text-midnight";
  const body = dark ? "text-white/75" : "text-charcoal";

  // Called before the early return below: a hook cannot sit behind a branch.
  // A no-op unless analytics is configured and the visitor accepted it.
  useConversion(
    "booking_submitted",
    state.status === "success" ? state.reference : null,
    { pricing_mode: state.status === "success" ? state.pricingMode : "" },
  );

  if (state.status === "success") {
    return (
      <div className={clsx(cardChrome, "p-6 md:p-8")}>
        <p
          className={clsx(
            "font-sans text-[13px] font-medium tracking-[0.08em] uppercase",
            dark ? "text-white/60" : "text-charcoal/70",
          )}
        >
          {state.pricingMode === "fixed" ? "Booked" : "Request received"}
        </p>
        <p
          className={clsx(
            "font-display mt-2 text-[30px] leading-none font-semibold tabular-nums",
            heading,
          )}
        >
          {formatReference(state.reference)}
        </p>

        {state.pricingMode === "fixed" && state.quotedTotalCents !== null ? (
          <p className={clsx("mt-4 text-[15px] leading-[1.7]", body)}>
            Your fare is{" "}
            <strong className={clsx("font-semibold tabular-nums", heading)}>
              {formatFare(state.quotedTotalCents)}
            </strong>
            {state.taxCents > 0 ? ` including ${formatFare(state.taxCents)} sales tax` : ""}, fixed. A
            reservations agent confirms every booking by reply.
          </p>
        ) : (
          <p className={clsx("mt-4 text-[15px] leading-[1.7]", body)}>
            We price this kind of trip by hand rather than guess at it. A
            reservations agent will come back to you with a fare by phone or
            email, usually within the hour.
          </p>
        )}

        <p className={clsx("mt-4 text-[15px] leading-[1.7]", body)}>
          Pick-up times are New York time.
          {state.paymentMethod === "cash"
            ? " Payment is cash on delivery: pay your chauffeur at the end of the trip."
            : state.pricingMode === "quote"
              ? " Once we have priced the trip you can pay by card from the tracking page."
              : " You can pay by card from the tracking page."}
        </p>

        <p className={clsx("mt-4 text-[15px] leading-[1.7]", body)}>
          Keep this reference. You can check it any time on the{" "}
          <Link
            href={`/track?reference=${encodeURIComponent(state.reference)}`}
            className={clsx(
              "underline underline-offset-4",
              dark ? "text-white" : "text-midnight",
            )}
          >
            tracking page
          </Link>{" "}
          with the phone number you gave us.
        </p>
      </div>
    );
  }

  const card = (
    <div className={clsx(cardChrome, "p-6 md:p-8")}>
      <div role="tablist" aria-label="Trip type" className={clsx("flex border-b", divider)}>
        {tripTypes.map((option) => {
          const active = trip === option.value;
          return (
            <button
              key={option.value}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => {
                setTrip(option.value);
                // The fields on offer change with the trip type; a mark left
                // on one that is no longer rendered would never clear.
                setInvalid({});
              }}
              className={clsx(
                "-mb-px border-b-2 px-4 py-3 font-sans text-[13px] font-medium tracking-[0.08em] uppercase transition-colors",
                active
                  ? clsx("border-gold", heading)
                  : dark
                    ? "border-transparent text-white/50 hover:text-white"
                    : "border-transparent text-charcoal/70 hover:text-midnight",
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
      <div role="tablist" aria-label="Booking step" className="mt-5 flex items-center gap-2">
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
                    ? clsx("border-gold", heading)
                    : complete
                      ? dark
                        ? "border-white/30 text-white/70 hover:border-white/50"
                        : "border-midnight/20 text-midnight/70 hover:border-midnight/40"
                      : dark
                        ? "cursor-default border-white/15 text-white/35"
                        : "cursor-default border-midnight/10 text-charcoal/40",
                )}
              >
                <span className="tabular-nums">{item.id}</span>
                {item.label}
              </button>
              {index < STEPS.length - 1 ? (
                <span aria-hidden className={dark ? "text-white/25" : "text-charcoal/20"}>
                  /
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/*
        `noValidate`: the browser's own interactive validation is what used to
        stop here silently. It runs before `submit` fires, refuses the submit
        when a required field in a hidden step fails, and then has nothing it
        can focus or draw a bubble on — so nothing happened at all. The
        constraints stay on the fields and are still read through
        `checkValidity()`; only the browser's unreliable reporting of them is
        switched off, and `guardSubmit` reports them instead.
      */}
      <form
        key={formKey}
        action={formAction}
        noValidate
        onSubmit={guardSubmit}
        onInput={recheck}
        className="mt-6 flex flex-col gap-5"
      >
        <FormGuard />
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
              <Field label="Airport" id="airport" tone={tone} error={invalid.airport}>
                <Select
                  id="airport"
                  tone={tone}
                  required
                  aria-invalid={invalid.airport ? true : undefined}
                  aria-describedby={invalid.airport ? "airport-error" : undefined}
                  value={airport}
                  onChange={(event) => {
                    setAirport(event.target.value);
                    recheck();
                  }}
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

              <Field label="Direction" id="direction" tone={tone}>
                <Select
                  id="direction"
                  tone={tone}
                  value={direction}
                  onChange={(event) => {
                    setDirection(event.target.value as typeof direction);
                    // The one address box swaps which end of the trip it is,
                    // and with it the name it submits under.
                    setInvalid({});
                  }}
                >
                  <option value="from-airport">From the airport</option>
                  <option value="to-airport">To the airport</option>
                </Select>
              </Field>
            </>
          ) : null}

          <Field
            label={cityLabel}
            id="cityAddress"
            error={fieldError(cityField) ?? invalid[cityField]}
            tone={tone}
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
              tone={tone}
              defaultValue={prior(cityField)}
              onResolve={setCityPlaceId}
              onTypingStart={startPlacesSession}
              onTextChange={setCityText}
              aria-invalid={invalid[cityField] ? true : undefined}
            />
          </Field>

          {trip !== "airport" ? (
            <Field
              label={trip === "hourly" ? "Where to, roughly" : "Destination"}
              id="otherEnd"
              error={fieldError("destination") ?? invalid.destination}
              tone={tone}
              className="sm:col-span-2"
            >
              <AddressField
                id="otherEnd"
                name="destination"
                placeholder="Address or landmark"
                required
                enabled={options.placesEnabled}
                sessionToken={sessionToken}
                tone={tone}
                defaultValue={prior("destination")}
                onTypingStart={startPlacesSession}
                onTextChange={setOtherText}
                aria-invalid={invalid.destination ? true : undefined}
              />
            </Field>
          ) : null}

          <Field
            label="Date"
            id="date"
            tone={tone}
            error={fieldError("pickupAt") ?? (problem.date || undefined) ?? invalid.date}
            hint={today ? `Today is ${shortDay(today)} in New York.` : undefined}
          >
            <DateField
              id="date"
              name="date"
              tone={tone}
              required
              ref={dateRef}
              min={today || undefined}
              value={pickupDate}
              onChange={(event) => {
                setPickupDate(event.target.value);
                recheck();
              }}
              aria-invalid={problem.date || invalid.date ? true : undefined}
              aria-describedby={problem.date || invalid.date ? "date-error" : undefined}
            />
          </Field>

          <Field
            label="Time"
            id="time"
            tone={tone}
            error={(problem.time || undefined) ?? invalid.time}
            hint="New York time."
          >
            <TimeField
              id="time"
              name="time"
              tone={tone}
              required
              ref={timeRef}
              value={pickupTime}
              onChange={(event) => {
                setPickupTime(event.target.value);
                recheck();
              }}
              aria-invalid={problem.time || invalid.time ? true : undefined}
              aria-describedby={problem.time || invalid.time ? "time-error" : undefined}
            />
          </Field>

          {today && now ? (
            <div
              className={clsx(
                "flex flex-col gap-1 text-[13px] leading-[1.6] sm:col-span-2",
                dark ? "text-white/60" : "text-charcoal/70",
              )}
            >
              <p>
                It is <span className="tabular-nums">{clockLabel(now)}</span> on{" "}
                {shortDay(today)} in New York now.
              </p>
              {onYourDevice ? (
                <p>
                  That is <span className="tabular-nums">{onYourDevice}</span> on your
                  device.
                </p>
              ) : null}
            </div>
          ) : null}

          <Field label="Vehicle class" id="vehicle" tone={tone} error={invalid.vehicle}>
            <Select
              id="vehicle"
              name="vehicle"
              tone={tone}
              required
              aria-invalid={invalid.vehicle ? true : undefined}
              aria-describedby={invalid.vehicle ? "vehicle-error" : undefined}
              value={vehicle}
              onChange={(event) => {
                setVehicle(event.target.value);
                recheck();
              }}
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

          <div className={clsx("flex justify-end border-t pt-5", divider)}>
            {dark ? (
              <ButtonOnDark type="button" onClick={() => goNext(1, 2)}>
                Continue
              </ButtonOnDark>
            ) : (
              <Button type="button" variant="primary" onClick={() => goNext(1, 2)}>
                Continue
              </Button>
            )}
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
          <Field label="What is this for" id="serviceType" tone={tone}>
            <Select
              id="serviceType"
              name="serviceType"
              tone={tone}
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
              <Field label="Airline" id="airline" tone={tone} hint="Optional.">
                <Input
                  id="airline"
                  name="airline"
                  tone={tone}
                  placeholder="e.g. Delta"
                  maxLength={120}
                  autoComplete="off"
                  {...restore("airline")}
                />
              </Field>

              <Field
                label="Flight number"
                id="flight"
                tone={tone}
                hint="So your driver knows which arrival to meet."
              >
                <Input
                  id="flight"
                  name="flight"
                  tone={tone}
                  placeholder="Optional"
                  maxLength={20}
                  {...restore("flight")}
                />
              </Field>
            </>
          ) : null}

          <Field label="Passengers" id="passengers" tone={tone} error={invalid.passengers}>
            <Input
              id="passengers"
              name="passengers"
              type="number"
              tone={tone}
              min={1}
              max={selected?.passengerCapacity ?? 14}
              defaultValue={prior("passengers") || 1}
              aria-invalid={invalid.passengers ? true : undefined}
              aria-describedby={invalid.passengers ? "passengers-error" : undefined}
            />
          </Field>

          <Field label="Bags" id="bags" tone={tone} error={invalid.bags}>
            <Input
              id="bags"
              name="bags"
              type="number"
              tone={tone}
              min={0}
              max={selected?.luggageCapacity ?? 12}
              defaultValue={prior("bags") || 0}
              aria-invalid={invalid.bags ? true : undefined}
              aria-describedby={invalid.bags ? "bags-error" : undefined}
            />
          </Field>

          {maxChildSeats > 0 ? (
            <Field
              label="Child seats"
              id="childSeats"
              tone={tone}
              hint={`${formatFare(options.childSeatFeeCents)} each, up to ${maxChildSeats}.`}
            >
              <Select
                id="childSeats"
                name="childSeats"
                tone={tone}
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
              tone={tone}
              hint="Extra stop, a door to use, a flight you are connecting from. Optional."
            >
              <Textarea id="notes" name="notes" tone={tone} maxLength={5000} {...restore("notes")} />
            </Field>
          </div>
        </div>

          <div className={clsx("flex items-center justify-between border-t pt-5", divider)}>
            {dark ? (
              <>
                <ButtonOnDark type="button" onClick={() => setStep(1)}>
                  Back
                </ButtonOnDark>
                <ButtonOnDark type="button" onClick={() => goNext(2, 3)}>
                  Continue
                </ButtonOnDark>
              </>
            ) : (
              <>
                <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="button" variant="primary" onClick={() => goNext(2, 3)}>
                  Continue
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Step 3 — You */}
        <div ref={step3Ref} className={clsx("flex flex-col gap-5", step !== 3 && "hidden")}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Name"
              id="name"
              tone={tone}
              error={fieldError("customerName") ?? invalid.name}
            >
              <Input
                id="name"
                name="name"
                tone={tone}
                autoComplete="name"
                required
                maxLength={160}
                aria-invalid={invalid.name ? true : undefined}
                aria-describedby={invalid.name ? "name-error" : undefined}
                {...restore("name")}
              />
            </Field>

            <Field
              label="Phone"
              id="phone"
              tone={tone}
              error={fieldError("customerPhone") ?? invalid.phone}
              hint="You will need this to track the booking."
            >
              <PhoneInput
                id="phone"
                name="phone"
                tone={tone}
                required
                aria-invalid={invalid.phone ? true : undefined}
                aria-describedby={invalid.phone ? "phone-error" : undefined}
                {...restore("phone")}
              />
            </Field>

            <Field
              label="Email"
              id="email"
              tone={tone}
              error={fieldError("customerEmail") ?? invalid.email}
              className="sm:col-span-2"
            >
              <EmailInput
                id="email"
                tone={tone}
                defaultValue={prior("email")}
                sendsWhat="your confirmation and any updates"
                aria-invalid={invalid.email ? true : undefined}
              />
            </Field>
          </div>

          {/*
            Only the methods that actually work.

            With no Stripe key configured the API cannot issue a payment link,
            so offering "Card (Stripe)" produced a booking saved as `card` that
            could never be paid. The server decides, via `cardPaymentsEnabled`
            on `/api/booking-options`; add the key and the option returns with
            no code change.
          */}
          <div className={clsx("border-t pt-5", divider)}>
            <RadioCards
              name="paymentMethod"
              legend="How you will pay"
              options={paymentOptions}
              defaultValue={
                paymentOptions.some((o) => o.value === prior("paymentMethod"))
                  ? prior("paymentMethod")
                  : (paymentOptions[0]?.value ?? "cash")
              }
              tone={tone}
            />
          </div>

          <div className={clsx("border-t pt-5", divider)}>
            <Checkbox
              id="terms"
              name="terms"
              tone={tone}
              required
              error={fieldError("terms") ?? invalid.terms}
              label={
                <>
                  I accept the{" "}
                  <Link
                    href="/terms"
                    target="_blank"
                    className={clsx(
                      "font-medium underline underline-offset-4",
                      dark ? "text-white" : "text-midnight",
                    )}
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
            {dark ? (
              <ButtonOnDark type="button" onClick={() => setStep(2)}>
                Back
              </ButtonOnDark>
            ) : (
              <Button type="button" variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
            )}
          </div>

          <div className={clsx("flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-center sm:justify-between", divider)}>
            <div>
              {isFixed && fare !== null ? (
                <>
                  <p
                    className={clsx(
                      "font-sans text-[13px] font-medium tracking-[0.08em] uppercase",
                      dark ? "text-white/60" : "text-charcoal/70",
                    )}
                  >
                    Fixed fare · {selected?.name}
                  </p>
                  <p className={clsx("font-display mt-1 text-[30px] leading-none font-semibold tabular-nums", heading)}>
                    {formatFare(fare.totalCents)}
                  </p>
                  <p className={clsx("mt-2 text-[13px] tabular-nums", dark ? "text-white/55" : "text-charcoal/70")}>
                    {formatFare(fare.subtotalCents)} fare
                    {seatFeeCents > 0 ? ` (incl. ${formatFare(seatFeeCents)} child seats)` : ""} +{" "}
                    {formatFare(fare.taxCents)} sales tax ({formatRate(fare.taxRate)}).
                  </p>
                  <p className={clsx("mt-1 text-[13px]", dark ? "text-white/55" : "text-charcoal/70")}>
Your estimated fare is based on the trip details provided above. The final fare may vary if you change your pickup or drop-off location, add or remove stops, select a different vehicle, or if the route changes and requires additional tolls.                  </p>
                </>
              ) : (
                <>
                  <p
                    className={clsx(
                      "font-sans text-[13px] font-medium tracking-[0.08em] uppercase",
                      dark ? "text-white/60" : "text-charcoal/70",
                    )}
                  >
                    Priced by a person
                  </p>
                  <p className={clsx("mt-1 max-w-sm text-[15px] leading-[1.6]", body)}>
                    {quoteOnlyAirport
                      ? "This airport is priced by hand. Send the details and a reservations agent comes back with a fare."
                      : trip !== "airport"
                        ? "Send the details and a reservations agent comes back with a fare, usually within the hour."
                        : cityInOuterBorough
                          ? // Covered, simply not on the published card. Saying
                            // "we don't cover you" to a customer in Brooklyn
                            // would be false, and would lose the booking.
                            "We serve all five boroughs, but published fares cover Manhattan. A reservations agent will price this one, usually within the hour."
                          : "Published airport fares cover Manhattan. Send the details and we will price this one for you."}
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
            className={clsx(
              "border-l-2 px-4 py-3 text-[15px]",
              dark
                ? "border-red-300 bg-red-300/10 text-red-200"
                : "border-red-700 bg-red-700/5 text-red-800",
            )}
          >
            {state.message}
          </p>
        ) : null}
      </form>
    </div>
  );

  if (!withSummary) return card;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
      {card}
      <div className="lg:sticky lg:top-28">
        <TripSummary
          trip={trip}
          vehicle={vehicle ? (selected ?? null) : null}
          airportName={options.airports.find((item) => item.code === airport)?.name ?? null}
          direction={direction}
          cityText={cityText}
          otherText={trip === "airport" ? "" : otherText}
          date={pickupDate}
          time={pickupTime}
          fare={isFixed ? fare : null}
        />
      </div>
    </div>
  );
}

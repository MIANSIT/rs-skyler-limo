"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  createAirport,
  deleteAirport,
  updateAirport,
  type AirportFormState,
} from "@/lib/admin/airport-actions";
import type { AdminAirport } from "@/lib/api/types";

const inputClass =
  "w-full rounded-sm border border-midnight/20 bg-white px-3 py-2 font-sans text-[15px] text-midnight focus:border-midnight focus:outline-none";
const labelClass =
  "font-sans text-[12px] font-medium tracking-[0.08em] text-charcoal/60 uppercase";

function Submit({ children, gold }: { children: string; gold?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={
        gold
          ? "rounded-sm bg-gold px-6 py-2.5 font-sans text-[15px] font-semibold text-midnight transition-colors hover:bg-gold/90 disabled:opacity-60"
          : "rounded-sm border border-midnight/25 px-4 py-2 font-sans text-[14px] font-medium text-midnight transition-colors hover:border-midnight hover:bg-grey disabled:opacity-60"
      }
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

/**
 * A labelled on/off switch that is a real checkbox underneath.
 *
 * The input keeps its name and its `checked` state in the posted `FormData`,
 * so the server action reads it exactly as it read the plain checkboxes this
 * replaced — the track and knob are a `peer`-driven span over an `sr-only`
 * box, not a `role="switch"` button needing its own hidden field. Midnight
 * when on: gold is reserved for the page's one primary action.
 */
function Switch({
  id,
  name,
  defaultChecked,
  label,
  hint,
}: {
  id: string;
  name: string;
  defaultChecked?: boolean;
  label: string;
  hint?: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input
        id={id}
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      {/* The knob is a child of the track, not a sibling of the input, so its
          `peer-checked` variant is written on the track and reaches in. */}
      <span
        aria-hidden
        className="mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full border border-midnight/20 bg-midnight/10 p-0.5 transition-colors peer-checked:border-midnight peer-checked:bg-midnight peer-checked:[&>span]:translate-x-4 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-midnight"
      >
        <span className="h-4 w-4 rounded-full bg-white shadow-sm transition-transform" />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="font-sans text-[14px] leading-tight text-charcoal/80">{label}</span>
        {hint ? (
          <span className="font-sans text-[13px] leading-[1.5] text-charcoal/60">{hint}</span>
        ) : null}
      </span>
    </label>
  );
}

function Message({ state }: { state: AirportFormState }) {
  if (state.status === "saved") {
    return (
      <p role="status" className="font-sans text-[14px] text-green-800">
        {state.message}
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <p
        role="alert"
        className="border-l-2 border-red-700 bg-red-700/5 px-4 py-2 font-sans text-[14px] leading-[1.6] text-red-800"
      >
        {state.message}
      </p>
    );
  }
  return null;
}

function AddAirport() {
  const [state, formAction] = useActionState<AirportFormState, FormData>(
    createAirport,
    { status: "idle" },
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-sm border border-midnight/10 bg-white p-6"
    >
      <h2 className="font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase">
        Add an airport
      </h2>

      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <div className="flex flex-col gap-2">
          <label htmlFor="new-code" className={labelClass}>
            Code
          </label>
          <input
            id="new-code"
            name="code"
            required
            maxLength={8}
            placeholder="BOS"
            autoComplete="off"
            className={`${inputClass} uppercase`}
          />
          {state.status === "error" && state.fields?.code ? (
            <p className="font-sans text-[13px] text-red-800">{state.fields.code}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="new-name" className={labelClass}>
            Name shown to customers
          </label>
          <input
            id="new-name"
            name="name"
            required
            maxLength={120}
            placeholder="Boston Logan (BOS)"
            autoComplete="off"
            className={inputClass}
          />
          {state.status === "error" && state.fields?.name ? (
            <p className="font-sans text-[13px] text-red-800">{state.fields.name}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Switch
          id="new-is-active"
          name="isActive"
          defaultChecked
          label="Offer it on the booking form"
        />
        <Switch
          id="new-quote-only"
          name="quoteOnly"
          label="Quote only — no published fare"
          hint="Customers see “Get quote” instead of a price and a person prices the trip."
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Submit gold>Add airport</Submit>
        <Message state={state} />
      </div>
      <p className="font-sans text-[13px] leading-[1.6] text-charcoal/60">
        The code is permanent — rates and bookings refer to it. The name can be
        changed at any time.
      </p>
    </form>
  );
}

function DeleteButton({ airport }: { airport: AdminAirport }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction] = useActionState<AirportFormState, FormData>(
    deleteAirport,
    { status: "idle" },
  );

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-sm border border-red-700/40 px-4 py-2 font-sans text-[14px] font-medium text-red-800 transition-colors hover:border-red-700 hover:bg-red-700/5"
      >
        Delete
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="code" value={airport.code} />
      <p className="max-w-xs font-sans text-[13px] leading-normal text-charcoal/80">
        Delete {airport.code}
        {airport.rateCount > 0
          ? ` and its ${airport.rateCount} published fare${airport.rateCount === 1 ? "" : "s"}`
          : ""}
        ? Hiding it is reversible; this is not.
      </p>
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-sm bg-red-800 px-4 py-2 font-sans text-[14px] font-semibold text-white hover:bg-red-900"
        >
          Yes, delete
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-sm border border-midnight/25 px-4 py-2 font-sans text-[14px] text-midnight hover:bg-grey"
        >
          Cancel
        </button>
      </div>
      <Message state={state} />
    </form>
  );
}

function AirportRow({ airport }: { airport: AdminAirport }) {
  const [state, formAction] = useActionState<AirportFormState, FormData>(
    updateAirport,
    { status: "idle" },
  );
  const id = `airport-${airport.code}`;

  return (
    <li className="flex flex-col gap-4 border-b border-midnight/10 p-5 last:border-0 lg:flex-row lg:items-start lg:justify-between">
      <form action={formAction} className="flex flex-1 flex-col gap-3">
        <input type="hidden" name="code" value={airport.code} />

        <div className="flex flex-wrap items-end gap-3">
          <div className="w-20 pb-2 font-sans text-[16px] font-semibold text-midnight">
            {airport.code}
          </div>
          <div className="flex min-w-[14rem] flex-1 flex-col gap-1.5">
            <label htmlFor={id} className="sr-only">
              Name for {airport.code}
            </label>
            <input
              id={id}
              name="name"
              defaultValue={airport.name}
              required
              maxLength={120}
              className={inputClass}
            />
          </div>
          <Submit>Save</Submit>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:gap-8">
          <Switch
            id={`${id}-active`}
            name="isActive"
            defaultChecked={airport.isActive}
            label="On the booking form"
          />
          <Switch
            id={`${id}-quote-only`}
            name="quoteOnly"
            defaultChecked={airport.quoteOnly}
            label="Quote only — no published fare"
            hint="Customers see “Get quote” instead of a price. The rates below are kept."
          />
        </div>

        <p className="font-sans text-[13px] text-charcoal/60">
          {airport.rateCount} fare{airport.rateCount === 1 ? "" : "s"} on its rate
          card ·{" "}
          {airport.bookingCount} booking{airport.bookingCount === 1 ? "" : "s"}
          {airport.isActive ? "" : " · hidden from customers"}
          {airport.quoteOnly
            ? " · quoted by hand"
            : airport.rateCount === 0
              ? " · no fare published, so it quotes"
              : ""}
        </p>
        <Message state={state} />
      </form>

      <DeleteButton airport={airport} />
    </li>
  );
}

export function AirportManager({ airports }: { airports: AdminAirport[] }) {
  return (
    <div className="flex flex-col gap-8">
      {airports.length === 0 ? (
        <p className="rounded-sm border border-midnight/10 bg-white px-6 py-10 text-center font-sans text-[15px] text-charcoal/60">
          No airports yet. Add one below and it appears on the Rates page.
        </p>
      ) : (
        <ul className="rounded-sm border border-midnight/10 bg-white">
          {airports.map((airport) => (
            <AirportRow key={airport.code} airport={airport} />
          ))}
        </ul>
      )}

      <AddAirport />
    </div>
  );
}

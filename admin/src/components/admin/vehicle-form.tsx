"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  createVehicle,
  updateVehicle,
  type FleetFormState,
} from "@/lib/admin/fleet-actions";
import type { Amenity, Vehicle, VehicleCategory } from "@/lib/api/types";
import { clsx } from "@/lib/clsx";

const categoryLabels: Record<VehicleCategory, string> = {
  sedan: "Sedan",
  suv: "SUV",
  "premium-suv": "Premium SUV",
  van: "Van",
  sprinter: "Sprinter",
};

const control =
  "w-full rounded-sm border border-midnight/20 bg-white px-4 py-2.5 font-sans text-[15px] text-midnight transition-colors placeholder:text-charcoal/40 hover:border-midnight/40 focus:border-midnight focus:outline-none";

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="font-sans text-[13px] font-medium tracking-[0.06em] text-charcoal/70 uppercase"
    >
      {children}
    </label>
  );
}

function Field({
  label,
  id,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  id: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="font-sans text-[13px] text-red-800">{error}</p>
      ) : hint ? (
        <p className="font-sans text-[13px] text-charcoal/60">{hint}</p>
      ) : null}
    </div>
  );
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-gold px-6 py-3 font-sans text-[15px] font-semibold text-midnight transition-colors hover:bg-gold/90 disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

export function VehicleForm({
  vehicle,
  amenities,
  categories,
}: {
  /** Absent when creating. */
  vehicle?: Vehicle;
  amenities: Amenity[];
  categories: readonly VehicleCategory[];
}) {
  const isEdit = Boolean(vehicle);

  const [state, formAction] = useActionState<FleetFormState, FormData>(
    isEdit ? updateVehicle : createVehicle,
    { status: "idle" },
  );

  const fieldError = (name: string) =>
    state.status === "error" ? state.fields?.[name] : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {vehicle ? <input type="hidden" name="id" value={vehicle.id} /> : null}

      <section className="rounded-sm border border-midnight/10 bg-white p-6">
        <h2 className="font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase">
          The class
        </h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field
            label="Name"
            id="name"
            hint="What a customer reads — “Luxury Sedan”."
            error={fieldError("name")}
          >
            <input
              id="name"
              name="name"
              required
              maxLength={120}
              defaultValue={vehicle?.name ?? ""}
              className={control}
            />
          </Field>

          <Field
            label="URL slug"
            id="slug"
            hint={
              isEdit
                ? "Stored on every past booking. Changing it is safe, but old links break."
                : "Lowercase and hyphens — becomes /fleet#luxury-sedan."
            }
            error={fieldError("slug")}
          >
            <input
              id="slug"
              name="slug"
              required
              maxLength={60}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              defaultValue={vehicle?.slug ?? ""}
              className={clsx(control, "font-mono text-[14px]")}
            />
          </Field>

          <Field label="Category" id="category" error={fieldError("category")}>
            <select
              id="category"
              name="category"
              defaultValue={vehicle?.category ?? categories[0]}
              className={clsx(control, "appearance-none pr-10")}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {categoryLabels[category] ?? category}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Vehicle or model"
            id="model"
            hint="Optional. “Cadillac XTS or similar” — only if it is true."
            error={fieldError("model")}
          >
            <input
              id="model"
              name="model"
              maxLength={160}
              defaultValue={vehicle?.model ?? ""}
              className={control}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-sm border border-midnight/10 bg-white p-6">
        <h2 className="font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase">
          Capacity and fare
        </h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Passengers"
            id="passengerCapacity"
            error={fieldError("passengerCapacity")}
          >
            <input
              id="passengerCapacity"
              name="passengerCapacity"
              type="number"
              min={1}
              max={60}
              required
              defaultValue={vehicle?.passengerCapacity ?? 3}
              className={clsx(control, "tabular-nums")}
            />
          </Field>

          <Field
            label="Large cases"
            id="luggageCapacity"
            error={fieldError("luggageCapacity")}
          >
            <input
              id="luggageCapacity"
              name="luggageCapacity"
              type="number"
              min={0}
              max={60}
              required
              defaultValue={vehicle?.luggageCapacity ?? 2}
              className={clsx(control, "tabular-nums")}
            />
          </Field>

          <Field
            label="Child seats"
            id="maxChildSeats"
            hint="Most this class can fit."
            error={fieldError("maxChildSeats")}
          >
            <input
              id="maxChildSeats"
              name="maxChildSeats"
              type="number"
              min={0}
              max={4}
              defaultValue={vehicle?.maxChildSeats ?? 0}
              className={clsx(control, "tabular-nums")}
            />
          </Field>

          <Field
            label="From (USD)"
            id="baseFare"
            hint="Whole dollars."
            error={fieldError("baseFareCents")}
          >
            <input
              id="baseFare"
              name="baseFare"
              type="number"
              min={0}
              step="1"
              required
              defaultValue={
                vehicle ? Math.round(vehicle.baseFareCents / 100) : 95
              }
              className={clsx(control, "tabular-nums")}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-sm border border-midnight/10 bg-white p-6">
        <h2 className="font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase">
          Copy
        </h2>

        <div className="mt-5 flex flex-col gap-5">
          <Field
            label="Best for"
            id="bestFor"
            hint="One sentence, shown on the card."
            error={fieldError("bestFor")}
          >
            <textarea
              id="bestFor"
              name="bestFor"
              required
              rows={2}
              maxLength={500}
              defaultValue={vehicle?.bestFor ?? ""}
              className={clsx(control, "resize-y")}
            />
          </Field>

          <Field
            label="Detail"
            id="detail"
            hint="A short paragraph. Plain sentences, no exclamation points."
            error={fieldError("detail")}
          >
            <textarea
              id="detail"
              name="detail"
              required
              rows={4}
              maxLength={5000}
              defaultValue={vehicle?.detail ?? ""}
              className={clsx(control, "resize-y")}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-sm border border-midnight/10 bg-white p-6">
        <h2 className="font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase">
          Amenities
        </h2>
        <p className="mt-2 font-sans text-[14px] text-charcoal/70">
          Tick only what this class actually provides. Everything ticked here
          appears on the public fleet page as a promise.
        </p>

        <div className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {amenities.map((amenity) => (
            <div key={amenity.key} className="flex items-start gap-3">
              <input
                id={`amenity-${amenity.key}`}
                type="checkbox"
                name="amenities"
                value={amenity.key}
                defaultChecked={vehicle?.amenities.includes(amenity.key)}
                className="mt-1 h-4.5 w-4.5 shrink-0 cursor-pointer rounded-xs border border-midnight/30 accent-midnight"
              />
              <label
                htmlFor={`amenity-${amenity.key}`}
                className="cursor-pointer font-sans text-[15px] leading-[1.5] text-midnight"
              >
                {amenity.label}
                {amenity.hint ? (
                  <span className="block text-[13px] text-charcoal/60">
                    {amenity.hint}
                  </span>
                ) : null}
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-sm border border-midnight/10 bg-white p-6">
        <h2 className="font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase">
          Visibility
        </h2>

        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-8">
          <div className="flex items-start gap-3">
            <input
              id="isActive"
              type="checkbox"
              name="isActive"
              defaultChecked={vehicle?.isActive ?? true}
              className="mt-1 h-4.5 w-4.5 shrink-0 cursor-pointer rounded-xs border border-midnight/30 accent-midnight"
            />
            <label
              htmlFor="isActive"
              className="cursor-pointer font-sans text-[15px] leading-[1.5] text-midnight"
            >
              Show on the website
              <span className="block text-[13px] text-charcoal/60">
                Unticking removes it from the fleet page and the booking form
                immediately. Past bookings keep their history.
              </span>
            </label>
          </div>

          <Field
            label="Order"
            id="displayOrder"
            hint="Lower shows first."
            error={fieldError("displayOrder")}
            className="sm:w-28"
          >
            <input
              id="displayOrder"
              name="displayOrder"
              type="number"
              min={0}
              max={9999}
              defaultValue={vehicle?.displayOrder ?? 0}
              className={clsx(control, "tabular-nums")}
            />
          </Field>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-5">
        <SaveButton label={isEdit ? "Save changes" : "Add vehicle"} />

        {state.status === "saved" ? (
          <p role="status" className="font-sans text-[14px] text-green-800">
            {state.message}
          </p>
        ) : null}

        {state.status === "error" ? (
          <p
            role="alert"
            className="border-l-2 border-red-700 bg-red-700/5 px-4 py-2.5 font-sans text-[14px] text-red-800"
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

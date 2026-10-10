"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { saveHeroText, type HeroFormState } from "@/lib/admin/hero-actions";
import type { HeroText } from "@/lib/api/types";

function SaveButton() {
  const { pending } = useFormStatus();
  // Midnight text on gold, per the brand.
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-gold px-6 py-3 font-sans text-[15px] font-semibold text-midnight transition-colors hover:bg-gold/90 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save hero text"}
    </button>
  );
}

const inputClass =
  "w-full rounded-sm border border-midnight/20 bg-white px-3 py-2.5 font-sans text-[15px] text-midnight focus:border-midnight focus:outline-none";
const labelClass =
  "font-sans text-[13px] font-medium tracking-[0.06em] text-charcoal/70 uppercase";

export function HeroTextForm({ text }: { text: HeroText }) {
  const [state, formAction] = useActionState<HeroFormState, FormData>(saveHeroText, {
    status: "idle",
  });

  const fieldError = (name: string) =>
    state.status === "error" && state.fields?.[name] ? (
      <p className="font-sans text-[13px] text-red-800">{state.fields[name]}</p>
    ) : null;

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="eyebrow" className={labelClass}>
          Small line above the headline
        </label>
        <input
          id="eyebrow"
          name="eyebrow"
          maxLength={80}
          defaultValue={text.eyebrow}
          className={inputClass}
        />
        {fieldError("eyebrow")}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="headline" className={labelClass}>
          Headline
        </label>
        <input
          id="headline"
          name="headline"
          maxLength={60}
          defaultValue={text.headline}
          className={inputClass}
        />
        {fieldError("headline")}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="lineOne" className={labelClass}>
          First line under the headline
        </label>
        <textarea
          id="lineOne"
          name="lineOne"
          rows={2}
          maxLength={200}
          defaultValue={text.lineOne}
          className={inputClass}
        />
        {fieldError("lineOne")}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="lineTwo" className={labelClass}>
          Second line
        </label>
        <input
          id="lineTwo"
          name="lineTwo"
          maxLength={200}
          defaultValue={text.lineTwo}
          className={inputClass}
        />
        {fieldError("lineTwo")}
        <p className="font-sans text-[13px] text-charcoal/60">
          Leave a field empty to go back to its original wording.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-5">
        <SaveButton />
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

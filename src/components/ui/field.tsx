import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { clsx } from "@/lib/clsx";

const control =
  "w-full rounded-sm border border-midnight/20 bg-white px-4 py-3 font-sans text-[15px] text-midnight transition-colors placeholder:text-charcoal/45 hover:border-midnight/40 focus:border-midnight focus:outline-none";

export function Label({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="font-sans text-[13px] font-medium tracking-[0.08em] uppercase text-charcoal/70"
    >
      {children}
    </label>
  );
}

export function Field({
  label,
  id,
  hint,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-[13px] text-charcoal/70">{hint}</p> : null}
    </div>
  );
}

export function Input({
  className,
  ...props
}: ComponentPropsWithoutRef<"input">) {
  return <input className={clsx(control, className)} {...props} />;
}

export function Select({
  className,
  ...props
}: ComponentPropsWithoutRef<"select">) {
  return (
    <select
      className={clsx(control, "appearance-none pr-10", className)}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: ComponentPropsWithoutRef<"textarea">) {
  return (
    <textarea
      className={clsx(control, "min-h-28 resize-y", className)}
      {...props}
    />
  );
}

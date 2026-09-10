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
  error,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  /** A validation message from the server. Replaces the hint while present. */
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-red-800">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-charcoal/70">{hint}</p>
      ) : null}
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

/**
 * Consent controls sit on their own: label to the right, error below the pair.
 * The box takes midnight rather than gold — the view's one gold action is the
 * submit button, and a gold tick would compete with it.
 */
export function Checkbox({
  id,
  label,
  error,
  className,
  ...props
}: {
  id: string;
  label: ReactNode;
  error?: string;
} & Omit<ComponentPropsWithoutRef<"input">, "type" | "id">) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={clsx(
            "mt-0.5 h-4.5 w-4.5 shrink-0 cursor-pointer rounded-xs border border-midnight/30 accent-midnight",
            error && "border-red-700",
            className,
          )}
          {...props}
        />
        <label
          htmlFor={id}
          className="cursor-pointer text-[15px] leading-[1.6] text-charcoal"
        >
          {label}
        </label>
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-red-800">
          {error}
        </p>
      ) : null}
    </div>
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

import type { ReactNode } from "react";

import { clsx } from "@/lib/clsx";

/**
 * The pieces the booking and quote edit forms share, in the same visual
 * language as the vehicle form: midnight hairline controls, uppercase labels,
 * and the server's field message in red under the field it belongs to.
 */

export const control =
  "w-full rounded-sm border border-midnight/20 bg-white px-4 py-2.5 font-sans text-[15px] text-midnight transition-colors placeholder:text-charcoal/40 hover:border-midnight/40 focus:border-midnight focus:outline-none";

export function Field({
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
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <label
        htmlFor={id}
        className="font-sans text-[13px] font-medium tracking-[0.06em] text-charcoal/70 uppercase"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="font-sans text-[13px] text-red-800">{error}</p>
      ) : hint ? (
        <p className="font-sans text-[13px] text-charcoal/60">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-sm border border-midnight/10 bg-white p-6">
      <h2 className="font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase">
        {title}
      </h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="border-l-2 border-red-700 bg-red-700/5 px-4 py-3 font-sans text-[14px] text-red-800"
    >
      {message}
    </p>
  );
}

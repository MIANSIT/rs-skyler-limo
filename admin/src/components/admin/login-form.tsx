"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { signIn, type LoginState } from "@/lib/admin/actions";

/**
 * On a midnight ground gold carries text at 6.8:1, so the one gold action on
 * this screen is the submit button — gold fill, midnight label, per the
 * palette's only sanctioned CTA pairing.
 */
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-sm bg-gold px-6 py-3.5 font-sans text-[15px] font-semibold text-midnight transition-colors hover:bg-gold/90 disabled:opacity-60"
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

// The autofill rules matter: browsers paint a saved email or password pale blue
// with dark text, which erased the white show/hide icon. The inset shadow
// repaints the midnight ground and the fill colour keeps the text white.
const field =
  "w-full rounded-sm border border-white/25 bg-white/5 px-4 py-3 font-sans text-[15px] text-white transition-colors placeholder:text-white/35 hover:border-white/40 focus:border-gold focus:outline-none autofill:shadow-[inset_0_0_0_1000px_var(--color-midnight)] autofill:[-webkit-text-fill-color:white]";

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(
    signIn,
    undefined,
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="email"
          className="font-sans text-[13px] font-medium tracking-[0.08em] text-white/60 uppercase"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          // React blanks uncontrolled fields once the action resolves; this
          // puts the address back so a mistyped password costs one field.
          defaultValue={state?.email ?? ""}
          key={state?.email ?? ""}
          className={field}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="password"
          className="font-sans text-[13px] font-medium tracking-[0.08em] text-white/60 uppercase"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className={`${field} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-white/60 transition-colors hover:text-white focus-visible:text-gold focus-visible:outline-none"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
              {showPassword ? <path d="M4 4l16 16" /> : null}
            </svg>
          </button>
        </div>
      </div>

      {state?.error ? (
        <p
          role="alert"
          className="border-l-2 border-red-400 bg-red-400/10 px-4 py-3 font-sans text-[14px] text-red-200"
        >
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}

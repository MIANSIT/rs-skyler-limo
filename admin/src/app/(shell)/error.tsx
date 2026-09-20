"use client";

/**
 * Shared by every dashboard page — Bookings, Quotes, Fleet, Rates, Hero
 * slider — so it can't name one specific cause; it used to hard-code "the
 * booking service", which was simply wrong on any other page and left the
 * operator guessing at what actually failed.
 *
 * `error.message` is shown for the same reason: this is an authenticated,
 * staff-only tool, not a public page, so there is no reason to hide it. In
 * development it is the real failure. In production Next.js already redacts
 * Server Component/Action error details to a generic safe string before it
 * ever reaches here — so this never leaks anything sensitive — but even that
 * generic string is more honest than a guessed, possibly-wrong cause.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="font-display text-[28px] font-semibold text-midnight">
        This screen could not load
      </h1>
      <p className="mt-3 font-sans text-[15px] text-charcoal/70">
        {error.message || "Something went wrong reaching the API."}
      </p>
      <p className="mt-2 font-sans text-[14px] text-charcoal/60">
        Anything already saved is unaffected — this is just the screen
        failing to load.
      </p>

      {error.digest ? (
        <p className="mt-4 font-sans text-[13px] text-charcoal/50 tabular-nums">
          Reference {error.digest}
        </p>
      ) : null}

      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-sm bg-gold px-6 py-3 font-sans text-[15px] font-semibold text-midnight transition-colors hover:bg-gold/90"
      >
        Try again
      </button>
    </div>
  );
}

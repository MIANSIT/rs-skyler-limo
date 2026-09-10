"use client";

/**
 * The dashboard's most likely failure is the API being down — a restart, a
 * MySQL blip. Say that plainly and offer a retry, rather than showing an empty
 * table that reads as "no bookings today".
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
        The dashboard could not load
      </h1>
      <p className="mt-3 font-sans text-[15px] text-charcoal/70">
        The booking service did not answer. Bookings already submitted are safe —
        this screen simply cannot reach them right now.
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

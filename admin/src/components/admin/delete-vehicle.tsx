"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { deleteVehicle, type FleetFormState } from "@/lib/admin/fleet-actions";

function ConfirmButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-red-800 px-5 py-2.5 font-sans text-[14px] font-semibold text-white transition-colors hover:bg-red-900 disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Yes, delete permanently"}
    </button>
  );
}

/**
 * Deletion is behind a two-step confirm and typing the vehicle's name.
 *
 * Not ceremony for its own sake: this removes photo files from disk and cannot
 * be undone, and it sits on the same page as a dozen ordinary Save buttons.
 * Hiding is the reversible option and the copy points there first.
 */
export function DeleteVehicle({ id, name }: { id: number; name: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  const [state, formAction] = useActionState<FleetFormState, FormData>(
    deleteVehicle,
    { status: "idle" },
  );

  return (
    <section className="rounded-sm border border-red-700/25 bg-white p-6">
      <h2 className="font-sans text-[13px] font-semibold tracking-[0.08em] text-red-800 uppercase">
        Delete this vehicle
      </h2>
      <p className="mt-2 max-w-2xl font-sans text-[14px] leading-[1.6] text-charcoal/80">
        Permanent, and it removes the uploaded photos from the server. If the
        class is simply out of service, untick{" "}
        <strong className="font-semibold text-midnight">
          Show on the website
        </strong>{" "}
        above instead — that is reversible and keeps its history.
      </p>

      {open ? (
        <form action={formAction} className="mt-5 flex flex-col gap-4">
          <input type="hidden" name="id" value={id} />

          <div className="flex flex-col gap-2">
            <label
              htmlFor="confirm-name"
              className="font-sans text-[13px] font-medium tracking-[0.06em] text-charcoal/70 uppercase"
            >
              Type “{name}” to confirm
            </label>
            <input
              id="confirm-name"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              className="w-full max-w-sm rounded-sm border border-red-700/40 bg-white px-4 py-2.5 font-sans text-[15px] text-midnight focus:border-red-700 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {typed.trim() === name ? <ConfirmButton /> : null}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setTyped("");
              }}
              className="rounded-sm border border-midnight/25 px-5 py-2.5 font-sans text-[14px] font-medium text-midnight transition-colors hover:border-midnight hover:bg-grey"
            >
              Cancel
            </button>
          </div>

          {state.status === "error" ? (
            <p
              role="alert"
              className="max-w-2xl border-l-2 border-red-700 bg-red-700/5 px-4 py-3 font-sans text-[14px] leading-[1.6] text-red-800"
            >
              {state.message}
            </p>
          ) : null}
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-5 rounded-sm border border-red-700/40 px-5 py-2.5 font-sans text-[14px] font-medium text-red-800 transition-colors hover:border-red-700 hover:bg-red-700/5"
        >
          Delete {name}
        </button>
      )}
    </section>
  );
}

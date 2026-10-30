"use client";

import { useEffect, useId, useRef } from "react";

export type ConfirmTone = "primary" | "danger";

/**
 * An in-page confirmation, in place of the browser's `window.confirm`.
 *
 * Built on the native `<dialog>` opened with `showModal()`, which already traps
 * focus, makes the page behind inert, closes on Esc and paints a `::backdrop`.
 * A click on the backdrop closes it too. Focus lands on the safe button
 * ("keep") for a destructive action and on the confirm button otherwise, so
 * pressing Enter by reflex never destroys anything.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  note,
  confirmLabel,
  cancelLabel = "Go back",
  tone = "primary",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  /** A second, quieter line — here, whether the customer will be emailed. */
  note?: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // Several dialogs live on one page (one per button), so each needs its own id.
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      // Esc fires `cancel`; keep React's state in step with the element.
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      // The dialog box fills the element, so a click whose target is the
      // element itself landed on the backdrop.
      onClick={(event) => {
        if (event.target === ref.current) onCancel();
      }}
      aria-labelledby={titleId}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-sm border border-midnight/10 bg-white p-0 text-midnight shadow-2xl backdrop:bg-midnight/60 backdrop:backdrop-blur-sm"
    >
      <div className="p-6 sm:p-7">
        <h2
          id={titleId}
          className="font-display text-[24px] leading-tight font-semibold text-midnight"
        >
          {title}
        </h2>
        <p className="mt-3 font-sans text-[15px] leading-[1.6] text-charcoal/80">{body}</p>
        {note ? (
          <p className="mt-3 border-l-2 border-gold bg-grey px-3 py-2 font-sans text-[14px] text-charcoal">
            {note}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-2.5 border-t border-midnight/10 bg-grey/60 px-6 py-4 sm:flex-row sm:justify-end sm:px-7">
        <button
          type="button"
          autoFocus={tone === "danger"}
          onClick={onCancel}
          className="rounded-sm border border-midnight/25 bg-white px-5 py-2.5 font-sans text-[14px] font-medium text-midnight transition-colors hover:border-midnight hover:bg-grey focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-midnight"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          autoFocus={tone !== "danger"}
          onClick={onConfirm}
          className={
            tone === "danger"
              ? "rounded-sm bg-red-800 px-5 py-2.5 font-sans text-[14px] font-semibold text-white transition-colors hover:bg-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800"
              : "rounded-sm bg-gold px-5 py-2.5 font-sans text-[14px] font-semibold text-midnight transition-colors hover:bg-gold/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-midnight"
          }
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

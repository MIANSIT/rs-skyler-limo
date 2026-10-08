"use client";

import { useEffect, useRef } from "react";

import { trackConversion, type ConversionEvent } from "@/lib/analytics";

/**
 * Reports a conversion exactly once per successful submission.
 *
 * Keyed on the reference rather than on a boolean, so a second booking in the
 * same session — a different reference on the same mounted form — is counted
 * again, while a re-render of the same confirmation is not. Firing in render
 * would count every repaint; a `useRef` of the last reference reported is what
 * makes "once" true rather than approximately true.
 *
 * A no-op when analytics is unconfigured or consent was declined, so a form
 * can call it unconditionally.
 */
export function useConversion(
  event: ConversionEvent,
  reference: string | null | undefined,
  detail: Record<string, string | number> = {},
): void {
  const reported = useRef<string | null>(null);

  useEffect(() => {
    if (!reference || reported.current === reference) return;
    reported.current = reference;
    trackConversion(event, { ...detail, reference });
    // `detail` is a fresh object each render; including it would fire on every
    // repaint. The reference is what identifies a distinct conversion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, reference]);
}

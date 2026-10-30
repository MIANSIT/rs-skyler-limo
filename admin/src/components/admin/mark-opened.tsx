"use client";

import { useEffect, useRef } from "react";

import { markOpened } from "@/lib/admin/actions";

/**
 * Renders nothing. When an operator opens a New booking or quote request it
 * moves it to Pending, once. Lives in an effect rather than the page so a
 * prefetch of the link cannot count as "opened".
 *
 * Always rendered, and `status` is read only on mount: if it were rendered just
 * while the status is New, "Reopen as new" would remount it and the page would
 * flip straight back to Pending. Reopening keeps it New until the next visit.
 */
export function MarkOpened({
  kind,
  id,
  status,
}: {
  kind: "booking" | "quote";
  id: number;
  status: string;
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    if (status === "new") void markOpened(kind, id);
    // Mount only: a later status change must not count as opening the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

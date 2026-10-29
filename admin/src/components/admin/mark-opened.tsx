"use client";

import { useEffect, useRef } from "react";

import { markOpened } from "@/lib/admin/actions";

/**
 * Renders nothing. When an operator opens a New booking or quote request it
 * moves it to Pending, once. Lives in an effect rather than the page so a
 * prefetch of the link cannot count as "opened".
 */
export function MarkOpened({ kind, id }: { kind: "booking" | "quote"; id: number }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void markOpened(kind, id);
  }, [kind, id]);

  return null;
}

"use client";

import {
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

/**
 * The layer every field popup opens into — `Select`'s listbox, `DateField`'s
 * calendar, `TimeField`'s columns, `AddressField`'s suggestions.
 *
 * They used to be `absolute top-full` inside the field's own wrapper, which
 * works right up until the form sits in a glass card. `glassCard` carries
 * `backdrop-blur-xl`, and `backdrop-filter` creates a stacking context: a
 * `z-20` inside the card cannot paint above anything *outside* it. On `/book`
 * the trip summary is the card's next sibling in the grid and carries the same
 * blur, so below `lg` — where the grid collapses to one column and the summary
 * stacks directly underneath — it painted straight over the open vehicle-class
 * list. Two of the four options were unreachable and the customer could not get
 * past step 1 on a phone. `overflow-clip` on the page section, and Safari's
 * clipping of descendants under a rounded `backdrop-filter`, are the same
 * problem arriving by two more routes.
 *
 * A popup in `document.body` has none of those ancestors. It is positioned
 * from the trigger's viewport rect instead of from the DOM, which also buys
 * the thing the absolute version never had: it flips above the field when the
 * space below it is short, and it is never taller than the viewport. That is
 * what makes these fields usable on a phone, where a field near the fold has
 * no room beneath it at all.
 *
 * Positioned, not merely portalled: `position: fixed` resolves against the
 * layout viewport, the same origin `getBoundingClientRect` reports in, so the
 * two agree while the page scrolls, the window resizes, or iOS slides the URL
 * bar away.
 */

/** The `mt-1` these popups used to carry, as a number we can measure with. */
const GAP = 4;

/** Breathing room kept between a popup and the edge of the viewport. */
const EDGE = 8;

/** Above the sticky header (`z-50`) and the mobile booking sheet (`z-50`). */
export const popoverLayer = "fixed z-[60]";

/** What a popup is given before it has been measured, and while closed. */
const HIDDEN: CSSProperties = { visibility: "hidden" };

/**
 * `useLayoutEffect` warns when a component is rendered on the server. These
 * popups only ever render after a tap, so the effect is client-only in
 * practice — this keeps the warning out of the build log without changing
 * when the work runs in a browser.
 */
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

type Placement = {
  /** `"anchor"` matches the trigger's width; a number is a fixed px width. */
  width: "anchor" | number;
  /** The popup's own cap, honoured when the viewport has more room than this. */
  maxHeight?: number;
};

/**
 * The inline style for a popup anchored to `anchorRef`. Empty — and hidden —
 * until the first measurement lands, which happens before paint.
 */
export function usePopoverStyle(
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean,
  { width, maxHeight = 256 }: Placement,
): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>(HIDDEN);

  useIsomorphicLayoutEffect(() => {
    if (!open) return;

    const place = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      // A trigger with no box has nothing to anchor to — a step the form has
      // switched away from, say. Leave the popup hidden rather than drawing a
      // zero-width list in the corner.
      if (rect.width === 0 && rect.height === 0) return;

      // `clientWidth`/`clientHeight` are the layout viewport minus any
      // classic scrollbar — the box `position: fixed` resolves against.
      const vw = document.documentElement.clientWidth;
      const vh = document.documentElement.clientHeight;

      const w = Math.min(width === "anchor" ? rect.width : width, vw - EDGE * 2);
      // Start under the field, then pull back inside whichever edge it crosses.
      const left = Math.max(EDGE, Math.min(rect.left, vw - w - EDGE));

      const below = vh - rect.bottom - GAP - EDGE;
      const above = rect.top - GAP - EDGE;
      // Drop up only when there is genuinely more room there: a list that
      // flips on every other field reads as a glitch.
      const dropUp = above > below && below < maxHeight;
      const height = Math.min(maxHeight, Math.max(dropUp ? above : below, 160));

      setStyle({
        width: w,
        left,
        maxHeight: height,
        // The clamp is what keeps a popup on screen when the field itself is
        // near an edge: it then overlaps the field, exactly as a native
        // select's list does rather than hanging off the bottom.
        ...(dropUp
          ? { bottom: Math.max(EDGE, Math.min(vh - rect.top + GAP, vh - EDGE - height)) }
          : { top: Math.max(EDGE, Math.min(rect.bottom + GAP, vh - EDGE - height)) }),
      });
    };

    place();

    // Capture phase: the scroll that moves the field is just as often a
    // scrollable ancestor (the booking sheet) as the window.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    // iOS moves the visual viewport without scrolling the layout one when the
    // keyboard opens or the URL bar collapses.
    const visual = window.visualViewport;
    visual?.addEventListener("resize", place);
    visual?.addEventListener("scroll", place);

    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      visual?.removeEventListener("resize", place);
      visual?.removeEventListener("scroll", place);
    };
  }, [open, width, maxHeight, anchorRef]);

  // While closed the popup is not rendered at all, so the last measurement is
  // simply not handed out — and a reopen re-measures in the layout effect
  // above, before paint, so it never flashes at coordinates it has outgrown.
  return open ? style : HIDDEN;
}

/** Renders `children` into `document.body`, outside every clipping ancestor. */
export function PopoverLayer({ children }: { children: ReactNode }) {
  // Only reached from an open popup, which only opens after a tap — but the
  // guard keeps this safe if one is ever rendered open on the server.
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

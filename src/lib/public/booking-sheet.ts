"use client";

import { useSyncExternalStore } from "react";

/**
 * The mobile booking sheet's state, shared between the page that renders the
 * sheet (the homepage hero) and the button that opens it (`MobileActionBar`,
 * which lives in the layout and knows nothing about the page).
 *
 * `available` is true only while a sheet is mounted, so the bar's Book button
 * opens the sheet on the homepage and still links to `/book` everywhere else.
 */
type State = { available: boolean; open: boolean };

let state: State = { available: false, open: false };
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const serverState: State = { available: false, open: false };

export function useBookingSheet() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => serverState,
  );
}

export const bookingSheet = {
  register() {
    set({ available: true });
    return () => set({ available: false, open: false });
  },
  open: () => set({ open: true }),
  close: () => set({ open: false }),
};

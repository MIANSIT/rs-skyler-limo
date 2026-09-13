"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Input } from "@/components/ui/field";
import { clsx } from "@/lib/clsx";
import type { PlaceSuggestion } from "@/lib/api/types";

/**
 * An address box that suggests real places.
 *
 * A plain text field when Places is not configured — the same input, the same
 * name, just no dropdown. That is the whole fallback: the form still submits,
 * the trip still gets booked, and the operator confirms the address by phone
 * the way they do today.
 *
 * Suggestions are fetched through our own server, never Google directly, so no
 * API key reaches the browser.
 */
export function AddressField({
  id,
  name,
  placeholder,
  required,
  defaultValue = "",
  enabled,
  sessionToken,
  onResolve,
  onTypingStart,
}: {
  id: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  enabled: boolean;
  sessionToken: string;
  /** Called with the chosen place id, or null when the text is typed freehand. */
  onResolve?: (placeId: string | null) => void;
  /** Fired on the first keystroke so the parent can open a billing session. */
  onTypingStart?: () => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [placeId, setPlaceId] = useState<string | null>(null);

  const listId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  // Bumped on every keystroke so a slow response cannot overwrite a newer one.
  const requestId = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    // The token is generated after mount, so the very first render has none.
    // Querying without one would bill as a fresh session per keystroke.
    if (!sessionToken) return;
    // A chosen suggestion should not immediately re-query with its own text.
    if (placeId) return;
    // Too short to query. Nothing is cleared here — what renders is derived
    // below, so a synchronous setState in this effect body is unnecessary and
    // would only cause a cascading render.
    if (value.trim().length < 3) return;

    const mine = ++requestId.current;
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/places?q=${encodeURIComponent(value)}&session=${encodeURIComponent(sessionToken)}`,
          { signal: controller.signal },
        );
        if (!response.ok) return;

        const data = (await response.json()) as { suggestions: PlaceSuggestion[] };
        if (mine !== requestId.current) return;

        setSuggestions(data.suggestions ?? []);
        setOpen((data.suggestions ?? []).length > 0);
        setActive(-1);
      } catch {
        // An aborted or failed lookup leaves the typed text alone; the customer
        // can still submit it.
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, enabled, sessionToken, placeId]);

  // Clicking away closes the list without choosing anything.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  /**
   * What actually renders. Derived rather than stored so deleting back to two
   * characters hides the list immediately, without an effect having to react
   * to it.
   */
  const visible = value.trim().length >= 3 ? suggestions : [];

  const choose = (suggestion: PlaceSuggestion) => {
    const text = [suggestion.primary, suggestion.secondary]
      .filter(Boolean)
      .join(", ");

    setValue(text);
    setPlaceId(suggestion.placeId);
    onResolve?.(suggestion.placeId);
    setOpen(false);
    setSuggestions([]);
  };

  return (
    <div ref={boxRef} className="relative">
      <Input
        id={id}
        name={name}
        value={value}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        role={enabled ? "combobox" : undefined}
        aria-expanded={enabled ? open : undefined}
        aria-controls={enabled ? listId : undefined}
        aria-autocomplete={enabled ? "list" : undefined}
        onChange={(event) => {
          onTypingStart?.();
          setValue(event.target.value);
          // Editing the text invalidates the resolved place, and with it the
          // fixed fare that depended on knowing the borough.
          if (placeId) {
            setPlaceId(null);
            onResolve?.(null);
          }
        }}
        onKeyDown={(event) => {
          if (!open || visible.length === 0) return;

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((index) => (index + 1) % visible.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) =>
              index <= 0 ? visible.length - 1 : index - 1,
            );
          } else if (event.key === "Enter" && active >= 0) {
            event.preventDefault();
            choose(visible[active]!);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />

      {/* Travels with the form so the server can re-resolve the borough. */}
      <input type="hidden" name={`${name}PlaceId`} value={placeId ?? ""} />

      {enabled && open && visible.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full right-0 left-0 z-20 mt-1 max-h-64 overflow-y-auto border border-midnight/20 bg-white shadow-[0_18px_40px_-20px_rgba(11,33,66,0.45)]"
        >
          {visible.map((suggestion, index) => (
            <li key={suggestion.placeId} role="option" aria-selected={index === active}>
              <button
                type="button"
                // `onMouseDown` rather than `onClick`: the input's blur would
                // otherwise close the list before the click landed.
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(suggestion);
                }}
                className={clsx(
                  "block w-full px-4 py-2.5 text-left transition-colors",
                  index === active ? "bg-grey" : "hover:bg-grey",
                )}
              >
                <span className="block text-[15px] text-midnight">
                  {suggestion.primary}
                </span>
                {suggestion.secondary ? (
                  <span className="block text-[13px] text-charcoal/60">
                    {suggestion.secondary}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

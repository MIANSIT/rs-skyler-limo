"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Input, popupByTone, scrollbarByTone } from "@/components/ui/field";
import { PopoverLayer, popoverLayer, usePopoverStyle } from "@/components/ui/popover";
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
  tone = "light",
  onResolve,
  onTypingStart,
  onTextChange,
  "aria-invalid": ariaInvalid,
}: {
  id: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  enabled: boolean;
  sessionToken: string;
  /** Only the text field itself — the suggestion list below stays a plain
   *  light popover regardless, the same way a native or Google address
   *  dropdown always does, so it reads clearly over any page. */
  tone?: "light" | "dark";
  /** Called with the chosen place id, or null when the text is typed freehand. */
  onResolve?: (placeId: string | null) => void;
  /** Fired on the first keystroke so the parent can open a billing session. */
  onTypingStart?: () => void;
  /** The text as it stands, typed or picked — for a live trip summary. */
  onTextChange?: (text: string) => void;
  /** Flagged by the form when this address is missing, so the box itself
   *  turns red beside the message `Field` shows. */
  "aria-invalid"?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [placeId, setPlaceId] = useState<string | null>(null);

  const listId = useId();
  const dark = tone === "dark";

  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
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
      // The list renders into `document.body` (see `ui/popover.tsx`), so a tap
      // on a suggestion is not inside `boxRef` and would otherwise close the
      // list before the choice landed.
      const target = event.target as Node;
      if (boxRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
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

  const listStyle = usePopoverStyle(inputRef, enabled && open && visible.length > 0, {
    width: "anchor",
  });

  const choose = (suggestion: PlaceSuggestion) => {
    const text = [suggestion.primary, suggestion.secondary]
      .filter(Boolean)
      .join(", ");

    setValue(text);
    onTextChange?.(text);
    setPlaceId(suggestion.placeId);
    onResolve?.(suggestion.placeId);
    setOpen(false);
    setSuggestions([]);
  };

  return (
    <div ref={boxRef} className="relative">
      <Input
        ref={inputRef}
        id={id}
        name={name}
        value={value}
        placeholder={placeholder}
        required={required}
        tone={tone}
        autoComplete="off"
        aria-invalid={ariaInvalid}
        aria-describedby={ariaInvalid ? `${id}-error` : undefined}
        role={enabled ? "combobox" : undefined}
        aria-expanded={enabled ? open : undefined}
        aria-controls={enabled ? listId : undefined}
        aria-autocomplete={enabled ? "list" : undefined}
        onChange={(event) => {
          onTypingStart?.();
          setValue(event.target.value);
          onTextChange?.(event.target.value);
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
        <PopoverLayer>
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            style={listStyle}
            className={clsx(
              popoverLayer,
              "overflow-y-auto rounded-sm border shadow-[0_18px_40px_-20px_rgba(11,33,66,0.45)]",
              popupByTone[tone],
              scrollbarByTone[tone],
            )}
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
                    // 44px tall: a suggestion is a touch target first.
                    "block min-h-11 w-full px-4 py-2.5 text-left transition-colors",
                    dark
                      ? index === active
                        ? "bg-white/10"
                        : "hover:bg-white/10"
                      : index === active
                        ? "bg-grey"
                        : "hover:bg-grey",
                  )}
                >
                  <span
                    className={clsx("block text-[15px]", dark ? "text-white" : "text-midnight")}
                  >
                    {suggestion.primary}
                  </span>
                  {suggestion.secondary ? (
                    <span
                      className={clsx(
                        "block text-[13px]",
                        dark ? "text-white/60" : "text-charcoal/70",
                      )}
                    >
                      {suggestion.secondary}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </PopoverLayer>
      ) : null}
    </div>
  );
}

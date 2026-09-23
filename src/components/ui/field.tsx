"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";

import { ChevronDownIcon } from "@/components/ui/icon";
import { clsx } from "@/lib/clsx";

export type Tone = "light" | "dark";

/**
 * The dark variant is a glass input sitting on an already-glass card (the
 * booking form's dark tone) — translucent white fill rather than a flat
 * charcoal block, so a field still reads as "a box to type in" against a
 * moving hero video. Never gold: gold stays the one accent reserved for the
 * submit button. Exported so `date-time-field.tsx`'s custom date and time
 * pickers share the identical box treatment without redeclaring it.
 */
export const controlByTone: Record<Tone, string> = {
  light:
    "border-midnight/20 bg-white text-midnight placeholder:text-charcoal/45 hover:border-midnight/40 focus:border-midnight",
  dark: "border-white/25 bg-white/10 text-white placeholder:text-white/40 hover:border-white/45 focus:border-white/70",
};

export const control =
  "w-full rounded-sm border px-4 py-3 font-sans text-[15px] transition-colors focus:outline-none";

/** The popup a control opens below itself — `Select`'s listbox, and the same
 *  ground `date-time-field.tsx` uses for its calendar and time list. */
export const popupByTone: Record<Tone, string> = {
  light: "border-midnight/20 bg-white",
  dark: "border-white/15 bg-charcoal/95 backdrop-blur-xl",
};

/**
 * A scrollbar is native, OS-drawn chrome too — Windows' own light-grey,
 * boxy-arrow scrollbar inside `Select`'s listbox or `TimeField`'s hour/minute
 * columns is exactly the same class of problem as the select/date/time
 * popups this file and `date-time-field.tsx` already replaced, except a
 * scrollbar is one native surface CSS genuinely reaches: `scrollbar-color`
 * (Firefox) and the `::-webkit-scrollbar*` pseudo-elements (Chrome, Edge,
 * Safari) restyle it in place, so there is no need to build a custom
 * scrolling widget the way there was for those other three.
 */
export const scrollbarByTone: Record<Tone, string> = {
  light:
    "[scrollbar-width:thin] [scrollbar-color:rgba(11,33,66,0.25)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-midnight/20 [&::-webkit-scrollbar-thumb]:hover:bg-midnight/35",
  dark: "[scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.3)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/25 [&::-webkit-scrollbar-thumb]:hover:bg-white/40",
};

const labelByTone: Record<Tone, string> = {
  light: "text-charcoal/70",
  dark: "text-white/65",
};

const hintByTone: Record<Tone, string> = {
  light: "text-charcoal/70",
  dark: "text-white/55",
};

/** `text-red-800` fails contrast on a dark ground; this is its dark counterpart. */
const errorByTone: Record<Tone, string> = {
  light: "text-red-800",
  dark: "text-red-300",
};

export function Label({
  htmlFor,
  tone = "light",
  children,
}: {
  htmlFor: string;
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={clsx(
        "font-sans text-[13px] font-medium tracking-[0.08em] uppercase",
        labelByTone[tone],
      )}
    >
      {children}
    </label>
  );
}

export function Field({
  label,
  id,
  hint,
  error,
  tone = "light",
  children,
  className,
}: {
  label: string;
  id: string;
  hint?: string;
  /** A validation message from the server. Replaces the hint while present. */
  error?: string;
  tone?: Tone;
  children: ReactNode;
  /** Lets the calling layout span grid columns without a wrapper element. */
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <Label htmlFor={id} tone={tone}>
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className={clsx("text-[13px]", errorByTone[tone])}>
          {error}
        </p>
      ) : hint ? (
        <p className={clsx("text-[13px]", hintByTone[tone])}>{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({
  tone = "light",
  className,
  ...props
}: { tone?: Tone } & ComponentProps<"input">) {
  return <input className={clsx(control, controlByTone[tone], className)} {...props} />;
}

/* -------------------------------------------------------------------------- */
/* Select                                                                     */
/* -------------------------------------------------------------------------- */

type OptionData = { value: string; label: string; disabled: boolean };

/**
 * `<option>` children, read the way a browser reads them: a missing `value`
 * falls back to the option's own text (`styleguide`'s `<option>Luxury
 * Sedan</option>` relies on exactly this). The label itself is flattened
 * through `Children.toArray` rather than read as a single string — an
 * option like `{item.name} · up to {item.passengerCapacity}` is three
 * separate child nodes (string, string, number) to React, not one string,
 * and reading only a single-string child silently rendered every fleet
 * vehicle's option as blank.
 */
function readOptions(children: ReactNode): OptionData[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child) || child.type !== "option") return [];
    const props = child.props as { value?: string; children?: ReactNode; disabled?: boolean };
    const label = Children.toArray(props.children)
      .map((part) => (typeof part === "string" || typeof part === "number" ? String(part) : ""))
      .join("");
    return [{ value: String(props.value ?? label), label, disabled: Boolean(props.disabled) }];
  });
}

function firstSelectable(options: OptionData[]): number {
  return options.findIndex((option) => !option.disabled);
}

/** Next selectable index in `dir` (±1) from `from`, wrapping around. Stays put
 *  if every option is disabled, which never happens in practice here. */
function stepSelectable(options: OptionData[], from: number, dir: 1 | -1): number {
  const count = options.length;
  if (count === 0) return -1;
  let index = from;
  for (let tries = 0; tries < count; tries += 1) {
    index = (index + dir + count) % count;
    if (!options[index]?.disabled) return index;
  }
  return from;
}

/**
 * Looks and behaves like a `<select>` — same label association, same
 * required/validity behaviour, same value in the posted `FormData` — but
 * owns every pixel a browser would otherwise draw itself: the open dropdown,
 * which is what sent us here. A `<select>`'s popup, a date input's calendar
 * and a time input's clock icon are native, OS-drawn surfaces that ignore
 * page CSS (`color-scheme` nudges them but different browsers honour it to
 * different degrees) — a `<select>` is the one of those three an app can
 * fully replace, since it has no OS-level input concern (typing a date by
 * hand, say) forcing it to stay native.
 *
 * A real `<select>` still exists in the DOM, visually hidden and unreachable
 * by Tab (`aria-hidden`, `tabIndex={-1}`, `pointer-events-none`) — that is
 * what carries `name`/`required`/`disabled` into the posted `FormData` and
 * into the browser's own constraint validation, so
 * `goNext`'s`querySelector(':invalid')` in `booking-form.tsx` keeps working
 * unmodified. Everything visible and interactive is the button and list
 * below it, built to the WAI-ARIA "Select-Only Combobox" pattern.
 */
export function Select({
  tone = "light",
  className,
  children,
  value,
  defaultValue,
  onChange,
  id,
  name,
  required,
  disabled,
  autoFocus,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedby,
}: { tone?: Tone } & ComponentPropsWithoutRef<"select">) {
  const options = useMemo(() => readOptions(children), [children]);
  const isControlled = value !== undefined;

  const initial = String(
    (isControlled ? value : defaultValue) ??
      options[firstSelectable(options)]?.value ??
      options[0]?.value ??
      "",
  );
  const [internalValue, setInternalValue] = useState(initial);
  const current = isControlled ? String(value ?? "") : internalValue;
  const selected = options.find((option) => option.value === current);

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const carrierRef = useRef<HTMLSelectElement>(null);

  // Click (or tap) outside closes without choosing anything — the same
  // pattern `AddressField`'s suggestion list already uses.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const commit = (nextValue: string) => {
    if (!isControlled) setInternalValue(nextValue);
    // The hidden native select is the actual form field; its value is set
    // imperatively rather than through a `value` prop so this component
    // never fights React for who owns it.
    if (carrierRef.current) carrierRef.current.value = nextValue;
    // Every call site's handler only reads `event.target.value` — this is
    // the minimal shape that satisfies that without a real native event.
    onChange?.({ target: { value: nextValue } } as React.ChangeEvent<HTMLSelectElement>);
  };

  const openAt = (index: number) => {
    setActiveIndex(index >= 0 ? index : firstSelectable(options));
    setOpen(true);
  };

  return (
    <div ref={wrapRef} className="relative">
      <select
        ref={carrierRef}
        // No `id`: the label below is associated with the visible button,
        // which is what a user (or a screen reader's forms list) actually
        // operates. A second element sharing `id` would be invalid HTML and
        // would make `htmlFor` resolution ambiguous.
        name={name}
        required={required}
        disabled={disabled}
        defaultValue={current}
        aria-hidden="true"
        tabIndex={-1}
        // A no-op: this element is never operated directly (`pointer-events:
        // none`, unreachable by Tab), so it never actually fires `change` on
        // its own — this only satisfies React's controlled/uncontrolled
        // input lint, which cannot see that.
        onChange={() => {}}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      >
        {options.map((option, index) => (
          <option key={`${option.value}-${index}`} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        id={id}
        ref={triggerRef}
        disabled={disabled}
        autoFocus={autoFocus}
        // The WAI-ARIA "select-only combobox" pattern: a `role="combobox"`
        // trigger is what makes `aria-invalid` (and `aria-expanded`) valid
        // here — the plain, implicit "button" role does not support them.
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedby}
        aria-activedescendant={
          open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
        }
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          const currentIndex = options.findIndex((option) => option.value === current);
          openAt(currentIndex);
        }}
        onKeyDown={(event) => {
          if (!open) {
            if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
              event.preventDefault();
              openAt(options.findIndex((option) => option.value === current));
            }
            return;
          }

          if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
            return;
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((from) => stepSelectable(options, from, event.key === "ArrowDown" ? 1 : -1));
            return;
          }
          if (event.key === "Home") {
            event.preventDefault();
            setActiveIndex(firstSelectable(options));
            return;
          }
          if (event.key === "End") {
            event.preventDefault();
            const lastSelectable = [...options].map((o, i) => i).reverse().find((i) => !options[i]?.disabled);
            setActiveIndex(lastSelectable ?? -1);
            return;
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            const chosen = options[activeIndex];
            if (chosen && !chosen.disabled) commit(chosen.value);
            setOpen(false);
            return;
          }
          if (event.key === "Tab") {
            setOpen(false);
            return;
          }
          // Typeahead — jump to the next option starting with the typed
          // letter, the same shortcut a native select offers.
          if (event.key.length === 1 && /[a-z0-9]/i.test(event.key)) {
            const letter = event.key.toLowerCase();
            const from = activeIndex + 1;
            const ahead = options.findIndex(
              (option, index) =>
                index >= from && !option.disabled && option.label.toLowerCase().startsWith(letter),
            );
            const wrapped =
              ahead >= 0
                ? ahead
                : options.findIndex(
                    (option) => !option.disabled && option.label.toLowerCase().startsWith(letter),
                  );
            if (wrapped >= 0) setActiveIndex(wrapped);
          }
        }}
        className={clsx(
          control,
          controlByTone[tone],
          "flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <span className={clsx("truncate", !selected && "opacity-60")}>
          {selected?.label ?? options[0]?.label ?? ""}
        </span>
        <ChevronDownIcon
          className={clsx(
            "h-4 w-4 shrink-0 transition-transform",
            open && "rotate-180",
            tone === "dark" ? "text-white/50" : "text-charcoal/50",
          )}
        />
      </button>

      {open ? (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className={clsx(
            "absolute top-full right-0 left-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-sm border shadow-[0_18px_40px_-20px_rgba(11,33,66,0.45)]",
            popupByTone[tone],
            scrollbarByTone[tone],
          )}
        >
          {options.map((option, index) => {
            const isSelected = option.value === current;
            const isActive = index === activeIndex;
            return (
              <li
                key={`${option.value}-${index}`}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  disabled={option.disabled}
                  onMouseEnter={() => !option.disabled && setActiveIndex(index)}
                  onClick={() => {
                    commit(option.value);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className={clsx(
                    "block w-full px-4 py-2.5 text-left text-[15px] transition-colors",
                    option.disabled
                      ? clsx("cursor-default", tone === "dark" ? "text-white/35" : "text-charcoal/35")
                      : clsx(
                          isSelected && "font-medium",
                          tone === "dark" ? "text-white" : "text-midnight",
                          isActive && (tone === "dark" ? "bg-white/10" : "bg-grey"),
                        ),
                  )}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Consent controls sit on their own: label to the right, error below the pair.
 * The box takes midnight rather than gold on light grounds — the view's one
 * gold action is the submit button, and a gold tick would compete with it.
 * On dark it takes white for the same reason, one level down: midnight is
 * unreadable against a charcoal card.
 */
export function Checkbox({
  id,
  label,
  error,
  tone = "light",
  className,
  ...props
}: {
  id: string;
  label: ReactNode;
  error?: string;
  tone?: Tone;
} & Omit<ComponentPropsWithoutRef<"input">, "type" | "id">) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={clsx(
            "mt-0.5 h-4.5 w-4.5 shrink-0 cursor-pointer rounded-xs border",
            tone === "dark"
              ? "border-white/40 accent-white"
              : "border-midnight/30 accent-midnight",
            error && (tone === "dark" ? "border-red-300" : "border-red-700"),
            className,
          )}
          {...props}
        />
        <label
          htmlFor={id}
          className={clsx(
            "cursor-pointer text-[15px] leading-[1.6]",
            tone === "dark" ? "text-white/80" : "text-charcoal",
          )}
        >
          {label}
        </label>
      </div>
      {error ? (
        <p id={`${id}-error`} className={clsx("text-[13px]", errorByTone[tone])}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Textarea({
  tone = "light",
  className,
  ...props
}: { tone?: Tone } & ComponentPropsWithoutRef<"textarea">) {
  return (
    <textarea
      className={clsx(control, controlByTone[tone], "min-h-28 resize-y", className)}
      {...props}
    />
  );
}

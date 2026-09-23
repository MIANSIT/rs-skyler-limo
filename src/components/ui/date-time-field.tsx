"use client";

import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import { control, controlByTone, popupByTone, scrollbarByTone, type Tone } from "@/components/ui/field";
import { CalendarIcon, ChevronDownIcon, ClockIcon } from "@/components/ui/icon";
import { clsx } from "@/lib/clsx";

/**
 * Custom replacements for `<input type="date">` and `<input type="time">`.
 *
 * `color-scheme: dark` (see `field.tsx`'s history) turned out not to be
 * enough — a browser's calendar and clock popups are native, OS-drawn
 * surfaces, and how much they actually honour that hint varies by browser.
 * These two own every pixel instead, the same reasoning that produced
 * `Select`'s custom listbox. Each still keeps a real, visually hidden native
 * input as the thing that actually carries `name`/`required`/the posted
 * value and participates in constraint validation — `ref` forwards to that
 * element, so `dateRef.current?.setCustomValidity(...)` in `booking-form.tsx`
 * and `quote-form.tsx` keeps working exactly as it did against a real
 * `<input type="date">`.
 */

/* -------------------------------------------------------------------------- */
/* Plain Y-M-D grid arithmetic — never touches a timezone, so `Date` is safe  */
/* to use as a scratch calculator as long as components are re-read locally. */
/* -------------------------------------------------------------------------- */

type YMD = { y: number; m: number; d: number }; // `m` is 1–12

function parseISO(iso: string): YMD | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function toISO({ y, m, d }: YMD): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function todayYMD(): YMD {
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

function startWeekday(y: number, m: number): number {
  return new Date(y, m - 1, 1).getDay();
}

function compareYMD(a: YMD, b: YMD): number {
  if (a.y !== b.y) return a.y - b.y;
  if (a.m !== b.m) return a.m - b.m;
  return a.d - b.d;
}

function addMonths({ y, m, d }: YMD, delta: number): YMD {
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (((total % 12) + 12) % 12) + 1;
  return { y: ny, m: nm, d: Math.min(d, daysInMonth(ny, nm)) };
}

function addDays(v: YMD, delta: number): YMD {
  const date = new Date(v.y, v.m - 1, v.d + delta);
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function formatDisplay(ymd: YMD): string {
  return `${MONTH_NAMES[ymd.m - 1]!.slice(0, 3)} ${ymd.d}, ${ymd.y}`;
}

type DateFieldProps = {
  id: string;
  name?: string;
  tone?: Tone;
  required?: boolean;
  /** `""` or an ISO `YYYY-MM-DD`, matching `<input type="date">`.value. */
  value: string;
  /** ISO `YYYY-MM-DD` floor — days before it are shown but disabled. */
  min?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(function DateField(
  {
    id,
    name,
    tone = "light",
    required,
    value,
    min,
    onChange,
    "aria-invalid": ariaInvalid,
    "aria-describedby": ariaDescribedby,
  },
  forwardedRef,
) {
  const selected = parseISO(value);
  const minYMD = min ? parseISO(min) : null;
  const today = todayYMD();
  const anchor = selected ?? minYMD ?? today;

  const [open, setOpen] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const carrierRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof forwardedRef === "function") forwardedRef(carrierRef.current);
    else if (forwardedRef) forwardedRef.current = carrierRef.current;
  });

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const commit = (v: YMD) => {
    const iso = toISO(v);
    if (carrierRef.current) carrierRef.current.value = iso;
    onChange({ target: { value: iso } } as ChangeEvent<HTMLInputElement>);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const clear = () => {
    if (carrierRef.current) carrierRef.current.value = "";
    onChange({ target: { value: "" } } as ChangeEvent<HTMLInputElement>);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={carrierRef}
        type="date"
        name={name}
        required={required}
        defaultValue={value}
        aria-hidden="true"
        tabIndex={-1}
        onChange={() => {}}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      />

      <button
        type="button"
        id={id}
        ref={triggerRef}
        role="combobox"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`${id}-dialog`}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedby}
        onClick={() => setOpen((was) => !was)}
        onKeyDown={(event) => {
          if (!open && (event.key === "Enter" || event.key === " " || event.key === "ArrowDown")) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={clsx(
          control,
          controlByTone[tone],
          "flex items-center justify-between gap-2 text-left",
        )}
      >
        <span className={clsx(!selected && "opacity-60")}>
          {selected ? formatDisplay(selected) : "mm/dd/yyyy"}
        </span>
        <CalendarIcon
          className={clsx("h-4 w-4 shrink-0", tone === "dark" ? "text-white/50" : "text-charcoal/50")}
        />
      </button>

      {/* Mounted fresh each time the popup opens (see `CalendarPopup`) —
          that is what gives it a clean starting month/focused day without
          an effect resetting state on every open, which
          `react-hooks/set-state-in-effect` correctly refuses. */}
      {open ? (
        <CalendarPopup
          id={id}
          tone={tone}
          anchor={anchor}
          today={today}
          selected={selected}
          minYMD={minYMD}
          onCommit={commit}
          onClear={clear}
          onClose={() => {
            setOpen(false);
            triggerRef.current?.focus();
          }}
        />
      ) : null}
    </div>
  );
});

function CalendarPopup({
  id,
  tone,
  anchor,
  today,
  selected,
  minYMD,
  onCommit,
  onClear,
  onClose,
}: {
  id: string;
  tone: Tone;
  anchor: YMD;
  today: YMD;
  selected: YMD | null;
  minYMD: YMD | null;
  onCommit: (v: YMD) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [viewMonth, setViewMonth] = useState<YMD>(anchor);
  const [focusDay, setFocusDay] = useState<YMD>(anchor);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());

  // Focused day gets real DOM focus once, on mount — this component remounts
  // fresh every time the popup opens, which is what re-anchors it without an
  // effect resetting state on an `open` change.
  useEffect(() => {
    dayRefs.current.get(toISO(focusDay))?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDisabledDay = (v: YMD) => Boolean(minYMD && compareYMD(v, minYMD) < 0);

  const moveFocus = (next: YMD) => {
    setFocusDay(next);
    if (next.y !== viewMonth.y || next.m !== viewMonth.m) setViewMonth(next);
    dayRefs.current.get(toISO(next))?.focus();
  };

  // The 7-wide grid: enough leading days from the previous month to align
  // the 1st under its real weekday, then every day of the month, then just
  // enough trailing days to finish the last row. All padding days are shown
  // (matching how a native calendar fills the grid) but are not interactive.
  const first = { y: viewMonth.y, m: viewMonth.m, d: 1 };
  const leading = startWeekday(viewMonth.y, viewMonth.m);
  const total = daysInMonth(viewMonth.y, viewMonth.m);
  const cells: { ymd: YMD; inMonth: boolean }[] = [];
  for (let i = leading; i > 0; i -= 1) cells.push({ ymd: addDays(first, -i), inMonth: false });
  for (let d = 1; d <= total; d += 1) cells.push({ ymd: { ...viewMonth, d }, inMonth: true });
  while (cells.length % 7 !== 0) {
    cells.push({ ymd: addDays(cells[cells.length - 1]!.ymd, 1), inMonth: false });
  }

  return (
    <div
      id={`${id}-dialog`}
      role="dialog"
      aria-label="Choose a date"
      className={clsx(
        "absolute top-full left-0 z-20 mt-1 w-72 rounded-sm border p-4 shadow-[0_18px_40px_-20px_rgba(11,33,66,0.45)]",
        popupByTone[tone],
      )}
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => moveFocus(addMonths(focusDay, -1))}
          className={clsx(
            "rounded-sm p-1.5 transition-colors",
            tone === "dark" ? "text-white/70 hover:bg-white/10" : "text-charcoal hover:bg-grey",
          )}
        >
          <ChevronDownIcon className="h-4 w-4 rotate-90" />
        </button>
        <p className={clsx("font-sans text-[14px] font-semibold", tone === "dark" ? "text-white" : "text-midnight")}>
          {MONTH_NAMES[viewMonth.m - 1]} {viewMonth.y}
        </p>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => moveFocus(addMonths(focusDay, 1))}
          className={clsx(
            "rounded-sm p-1.5 transition-colors",
            tone === "dark" ? "text-white/70 hover:bg-white/10" : "text-charcoal hover:bg-grey",
          )}
        >
          <ChevronDownIcon className="h-4 w-4 -rotate-90" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <span
            key={label}
            className={clsx(
              "font-sans text-[11px] font-medium tracking-[0.04em] uppercase",
              tone === "dark" ? "text-white/40" : "text-charcoal/50",
            )}
          >
            {label}
          </span>
        ))}

        {cells.map(({ ymd, inMonth }) => {
          const iso = toISO(ymd);
          const isToday = compareYMD(ymd, today) === 0;
          const isSelected = selected ? compareYMD(ymd, selected) === 0 : false;
          const isFocusable = compareYMD(ymd, focusDay) === 0;
          const disabledDay = isDisabledDay(ymd);

          return (
            <button
              key={iso}
              ref={(node) => {
                if (node) dayRefs.current.set(iso, node);
                else dayRefs.current.delete(iso);
              }}
              type="button"
              role="gridcell"
              aria-label={formatDisplay(ymd)}
              aria-selected={isSelected}
              aria-current={isToday ? "date" : undefined}
              aria-disabled={disabledDay || !inMonth || undefined}
              tabIndex={isFocusable ? 0 : -1}
              disabled={disabledDay}
              onClick={() => inMonth && onCommit(ymd)}
              onFocus={() => setFocusDay(ymd)}
              onKeyDown={(event) => {
                const steps: Record<string, () => void> = {
                  ArrowLeft: () => moveFocus(addDays(focusDay, -1)),
                  ArrowRight: () => moveFocus(addDays(focusDay, 1)),
                  ArrowUp: () => moveFocus(addDays(focusDay, -7)),
                  ArrowDown: () => moveFocus(addDays(focusDay, 7)),
                  Home: () => moveFocus(addDays(focusDay, -startWeekday(focusDay.y, focusDay.m))),
                  End: () => moveFocus(addDays(focusDay, 6 - startWeekday(focusDay.y, focusDay.m))),
                  PageUp: () => moveFocus(addMonths(focusDay, event.shiftKey ? -12 : -1)),
                  PageDown: () => moveFocus(addMonths(focusDay, event.shiftKey ? 12 : 1)),
                };
                if (steps[event.key]) {
                  event.preventDefault();
                  steps[event.key]!();
                  return;
                }
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  if (!disabledDay) onCommit(ymd);
                  return;
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  onClose();
                }
              }}
              className={clsx(
                "mx-auto flex h-8 w-8 items-center justify-center rounded-full font-sans text-[13px] tabular-nums transition-colors",
                disabledDay && "cursor-not-allowed",
                !inMonth && (tone === "dark" ? "text-white/20" : "text-charcoal/25"),
                inMonth &&
                  disabledDay &&
                  (tone === "dark" ? "text-white/25" : "text-charcoal/30"),
                inMonth &&
                  !disabledDay &&
                  !isSelected &&
                  (tone === "dark"
                    ? "text-white hover:bg-white/10"
                    : "text-midnight hover:bg-grey"),
                isSelected && "bg-gold text-midnight font-semibold",
                !isSelected && isToday && inMonth && (tone === "dark" ? "ring-1 ring-white/40" : "ring-1 ring-midnight/30"),
              )}
            >
              {ymd.d}
            </button>
          );
        })}
      </div>

      <div
        className={clsx(
          "mt-3 flex items-center justify-between border-t pt-3",
          tone === "dark" ? "border-white/15" : "border-midnight/10",
        )}
      >
        <button
          type="button"
          onClick={onClear}
          className={clsx(
            "font-sans text-[13px] underline-offset-4 hover:underline",
            tone === "dark" ? "text-white/70" : "text-charcoal",
          )}
        >
          Clear
        </button>
        <button
          type="button"
          disabled={isDisabledDay(today)}
          onClick={() => onCommit(today)}
          className={clsx(
            "font-sans text-[13px] underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline",
            tone === "dark" ? "text-white" : "text-midnight",
          )}
        >
          Today
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* TimeField                                                                  */
/* -------------------------------------------------------------------------- */

type Period = "AM" | "PM";

function parseTime(hhmm: string): { hour12: number; minute: number; period: Period } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!match) return null;
  const h24 = Number(match[1]);
  const minute = Number(match[2]);
  const period: Period = h24 >= 12 ? "PM" : "AM";
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour12, minute, period };
}

function toHHMM(hour12: number, minute: number, period: Period): string {
  const h24 = period === "AM" ? hour12 % 12 : (hour12 % 12) + 12;
  return `${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS: Period[] = ["AM", "PM"];

/**
 * One column of a three-column spinner (Hour / Minute / AM·PM) — the same
 * shape as a native time input's own picker, which is the layout being kept
 * here; only the native white-on-blue chrome is being replaced. Roving
 * tabindex within the column, `Select`'s pattern one level down.
 */
function TimeColumn<T extends string | number>({
  label,
  options,
  format,
  value,
  onSelect,
  tone,
}: {
  label: string;
  options: T[];
  format: (option: T) => string;
  value: T | null;
  onSelect: (option: T) => void;
  tone: Tone;
}) {
  const initialIndex = value === null ? 0 : Math.max(0, options.indexOf(value));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Scroll the current value into view when the column mounts — it remounts
  // fresh each time the popup opens, since the popup itself is only rendered
  // while `open`.
  useEffect(() => {
    itemRefs.current[initialIndex]?.scrollIntoView({ block: "center" });
    // Only on mount: `initialIndex` is a starting point, not something later
    // value changes should re-trigger a scroll for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ul
      role="listbox"
      aria-label={label}
      className={clsx("max-h-56 flex-1 overflow-y-auto py-1", scrollbarByTone[tone])}
    >
      {options.map((option, index) => {
        const selected = value !== null && option === value;
        return (
          <li key={String(option)} role="option" aria-selected={selected}>
            <button
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              type="button"
              tabIndex={index === activeIndex ? 0 : -1}
              onFocus={() => setActiveIndex(index)}
              onClick={() => {
                setActiveIndex(index);
                onSelect(option);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  itemRefs.current[Math.min(options.length - 1, index + 1)]?.focus();
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  itemRefs.current[Math.max(0, index - 1)]?.focus();
                } else if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(option);
                }
              }}
              className={clsx(
                "block w-full px-2 py-1.5 text-center text-[14px] tabular-nums transition-colors",
                selected && "font-semibold",
                tone === "dark" ? "text-white" : "text-midnight",
                selected
                  ? tone === "dark"
                    ? "bg-white/10"
                    : "bg-grey"
                  : tone === "dark"
                    ? "hover:bg-white/5"
                    : "hover:bg-grey/60",
              )}
            >
              {format(option)}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

type TimeFieldProps = {
  id: string;
  name?: string;
  tone?: Tone;
  required?: boolean;
  /** `""` or `"HH:MM"` (24-hour), matching `<input type="time">`.value. */
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export const TimeField = forwardRef<HTMLInputElement, TimeFieldProps>(function TimeField(
  {
    id,
    name,
    tone = "light",
    required,
    value,
    onChange,
    "aria-invalid": ariaInvalid,
    "aria-describedby": ariaDescribedby,
  },
  forwardedRef,
) {
  const parsed = parseTime(value);

  const [open, setOpen] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const carrierRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof forwardedRef === "function") forwardedRef(carrierRef.current);
    else if (forwardedRef) forwardedRef.current = carrierRef.current;
  });

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  /**
   * Picking one part (say, the hour) commits a complete time immediately,
   * defaulting the other two parts if they have not been touched yet —
   * 12:00 AM, the same starting point a native picker shows before any
   * column has been scrolled. That keeps every click producing a valid,
   * submittable value rather than a stuck half-chosen state.
   */
  const commitPart = (patch: Partial<{ hour12: number; minute: number; period: Period }>) => {
    const base = parsed ?? { hour12: 12, minute: 0, period: "AM" as Period };
    const next = { ...base, ...patch };
    const hhmm = toHHMM(next.hour12, next.minute, next.period);
    if (carrierRef.current) carrierRef.current.value = hhmm;
    onChange({ target: { value: hhmm } } as ChangeEvent<HTMLInputElement>);
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={carrierRef}
        type="time"
        name={name}
        required={required}
        defaultValue={value}
        aria-hidden="true"
        tabIndex={-1}
        onChange={() => {}}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      />

      <button
        type="button"
        id={id}
        ref={triggerRef}
        role="combobox"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`${id}-dialog`}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedby}
        onClick={() => setOpen((was) => !was)}
        onKeyDown={(event) => {
          if (!open && ["Enter", " ", "ArrowDown"].includes(event.key)) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={clsx(
          control,
          controlByTone[tone],
          "flex items-center justify-between gap-2 text-left",
        )}
      >
        <span className={clsx(!parsed && "opacity-60")}>
          {parsed ? `${parsed.hour12}:${String(parsed.minute).padStart(2, "0")} ${parsed.period}` : "--:-- --"}
        </span>
        <ClockIcon
          className={clsx("h-4 w-4 shrink-0", tone === "dark" ? "text-white/50" : "text-charcoal/50")}
        />
      </button>

      {open ? (
        <div
          id={`${id}-dialog`}
          role="dialog"
          aria-label="Choose a time"
          className={clsx(
            "absolute top-full left-0 z-20 mt-1 flex w-48 divide-x overflow-hidden rounded-sm border shadow-[0_18px_40px_-20px_rgba(11,33,66,0.45)]",
            tone === "dark" ? "divide-white/15" : "divide-midnight/10",
            popupByTone[tone],
          )}
        >
          <TimeColumn
            label="Hour"
            options={HOURS}
            format={(hour) => String(hour)}
            value={parsed?.hour12 ?? null}
            onSelect={(hour12) => commitPart({ hour12 })}
            tone={tone}
          />
          <TimeColumn
            label="Minute"
            options={MINUTES}
            format={(minute) => String(minute).padStart(2, "0")}
            value={parsed?.minute ?? null}
            onSelect={(minute) => commitPart({ minute })}
            tone={tone}
          />
          <TimeColumn
            label="AM or PM"
            options={PERIODS}
            format={(period) => period}
            value={parsed?.period ?? null}
            onSelect={(period) => commitPart({ period })}
            tone={tone}
          />
        </div>
      ) : null}
    </div>
  );
});

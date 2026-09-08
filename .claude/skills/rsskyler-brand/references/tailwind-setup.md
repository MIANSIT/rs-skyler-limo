# Tailwind v4 + Next.js implementation

The canonical setup used by this repo. If you are adding to the existing app, these are already
in place — read this to match them, not to recreate them.

## Fonts (`app/layout.tsx`)

Both faces are on Google Fonts, so `next/font/google` self-hosts them with no network request
at runtime and no layout shift.

```tsx
import { Fraunces, Public_Sans } from "next/font/google";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--font-fraunces",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-public-sans",
});
```

Apply `${fraunces.variable} ${publicSans.variable}` to `<html>`. Fraunces is variable, so
italic and every weight from 100–900 come from the one file — never load a second Fraunces.

## Theme (`app/globals.css`)

Tailwind v4 is CSS-first: `@theme` declares tokens and Tailwind generates the utilities.

```css
@import "tailwindcss";

@theme {
  --color-midnight: #0b2142;
  --color-gold: #d4a017;
  --color-charcoal: #2c2c2f;
  --color-grey: #f5f5f5;

  --font-display: var(--font-fraunces), Georgia, serif;
  --font-sans: var(--font-public-sans), ui-sans-serif, system-ui, sans-serif;
}
```

That yields `bg-midnight`, `text-gold`, `border-charcoal`, `font-display`, `font-sans`, and
opacity modifiers like `bg-midnight/60` or `border-gold/30` — which is how you derive hairlines
and hover tints without adding a sixth color.

Do **not** add `--color-success` / `--color-error` tokens. Use Tailwind's stock
`text-green-700` / `text-red-700` so semantic states stay visibly outside the brand palette.

## Type scale

The guide gives px ranges, not a ratio scale. Map them to utilities directly:

| Role | Classes |
|---|---|
| H1 | `font-display text-[34px] md:text-[40px] font-semibold leading-tight` |
| H2 | `font-display text-[22px] md:text-[26px] font-semibold` |
| H3 | `font-sans text-[17px] font-semibold` |
| Body | `font-sans text-[15px] md:text-base leading-[1.7]` |
| UI label | `font-sans text-[13px] font-medium` |
| Rationale | `font-display italic text-[16px]` |

Hero display type may exceed the H1 range — the scale governs document hierarchy, and a
landing hero is a display setting. Keep it Fraunces Semibold and it stays in system.

Tabular figures: `tabular-nums` (Tailwind ships this). Apply to every fare, time, phone
number and invoice column.

Wordmark tracking: `tracking-[0.048em]` — the 4.8% the lockups document specifies.

## Component patterns

```tsx
// Primary — midnight fill, white text
className="bg-midnight text-white hover:bg-midnight/90"

// Secondary — white fill, midnight border and text
className="bg-white text-midnight border border-midnight hover:bg-grey"

// CTA — gold fill, MIDNIGHT text (never white)
className="bg-gold text-midnight hover:bg-gold/90"

// Link — midnight, underline on hover
className="text-midnight underline-offset-4 hover:underline"
```

Shared button base: `inline-flex items-center justify-center font-sans text-[15px]
font-semibold px-6 py-3 rounded-sm transition-colors focus-visible:outline-2
focus-visible:outline-offset-2 focus-visible:outline-gold`.

Gold is the correct focus ring on both light and dark grounds — it is a graphic element
there, not text, so the 2.4:1 gold-on-white limit does not apply.

Radii stay small (`rounded-sm`, `rounded-md`). Large pill radii read consumer-app, not
chauffeur service.

## Section rhythm

Alternate midnight and white sections to hold the 60/30/10 ratio across a long page. A
midnight section carries white text with gold only in eyebrows, rules and icons; a white
section carries midnight and charcoal text with gold only as a border or icon. Grey
(`bg-grey`) breaks up consecutive white sections without introducing a new hue.

Eyebrow label pattern, used above section headings throughout:

```tsx
<p className="font-sans text-[13px] font-medium tracking-[0.12em] uppercase text-gold">
  Airport Transfers
</p>
```

Gold on midnight is 6.8:1 and safe as text. On a white section, the same eyebrow must be
`text-charcoal` — gold there would fail contrast.

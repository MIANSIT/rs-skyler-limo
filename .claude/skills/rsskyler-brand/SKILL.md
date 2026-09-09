---
name: rsskyler-brand
description: Build or review any RSSkyler Limo frontend UI — pages, components, sections, emails, social templates — against the Brand Guidelines Edition 02, 2026. Load this BEFORE writing any JSX, Tailwind class, color value, or user-facing copy for this project. Triggers on: new page or component, restyling, "make it look premium/luxury", choosing a color, adding a CTA, writing headline or button copy, adding a font, reviewing a design.
---

# RSSkyler Limo — brand system

RSSkyler Limo is New York City's **accessible-luxury** chauffeur service — "the confidence of
a five-star hotel car, without the velvet-rope distance." Every rule below is downstream of
that one bet: premium enough for a high-net-worth client, approachable enough that a
first-time corporate booker never feels out of place.

Tagline: **Arrive in Style**.

## The five hard rules

Violating any of these is a brand defect, not a style preference.

1. **Five colors, no sixth.** Need a hairline, a hover, a disabled state? Derive it as a tint
   or opacity of one of the five. Introducing a new hue is the failure mode this guide exists
   to prevent.
2. **Gold text only on midnight or charcoal.** Gold on white is 2.4:1 and fails AA at every
   size. Elsewhere gold is a border, an icon, a small fill, a rule, or a large decorative
   numeral — never a sentence.
3. **Gold CTA buttons use midnight text, not white.** Gold + midnight is 9.9:1 (AAA);
   gold + white is ~1.9:1. This is an explicit correction the guide makes to its own earlier spec.
4. **60 / 30 / 10.** Midnight ~60% of a layout, white ~30%, gold ~10%. Gold is a highlight,
   never a field color.
5. **Fraunces for display, Public Sans for everything else.** No third typeface. Body text
   never gets set in Fraunces; buttons and UI labels never do either.

## Color tokens

| Token | Hex | Role |
|---|---|---|
| `midnight` | `#0B2142` | Primary. Headers, dark sections, primary buttons, body headings. ~60% |
| `gold` | `#D4A017` | Accent only. CTAs, rules, icons, numerals, active states. ~10% |
| `charcoal` | `#2C2C2F` | Secondary text & UI |
| `white` | `#FFFFFF` | Background, readability. ~30% |
| `grey` | `#F5F5F5` | Secondary backgrounds, panels, rationale boxes |

Semantic states use universal convention — green for success, red for error — and are the one
sanctioned exception to the five-color rule. Keep them muted enough to sit beside midnight.

Verified contrast (do not re-derive):

| Combination | Ratio | Verdict |
|---|---|---|
| Midnight on white | 16.0:1 | AAA, any size |
| White on midnight | 16.0:1 | AAA, any size |
| Charcoal on white | 13.9:1 | AAA, any size |
| Midnight on light grey | 14.7:1 | AAA, any size |
| Gold on midnight | 6.8:1 | AA, safe for body and UI text |
| Midnight on gold | 9.9:1 | AAA — the correct CTA pairing |
| **Gold on white** | **2.4:1** | **Fails AA at every size — graphic use only** |
| White on gold | ~1.9:1 | Fails — never ship this |

## Typography

**Fraunces** (display serif, variable) — H1–H3, pull quotes, the wordmark, rationale notes in
italic. **Public Sans** (humanist sans) — body, UI labels, buttons, tables, invoices, forms.

| Role | Face / weight | Size |
|---|---|---|
| H1 — page title | Fraunces Semibold | 34–40px |
| H2 — section title | Fraunces Semibold | 22–26px |
| H3 — subsection | Public Sans Semibold | 16–18px |
| Body | Public Sans Regular | 15–16px / 1.65–1.7 line-height |
| UI label / caption | Public Sans Medium | 12–13px |
| Rationale / pull-quote | Fraunces Italic | 15–17px |

Two additional rules:

- **Tabular figures** for anything compared at a glance — fares, invoices, flight times,
  itineraries. Use `font-variant-numeric: tabular-nums`.
- **16px floor for anything read outdoors** — greeting cards, door signage, a driver's in-app
  name display. Fraunces' fine serif detail softens under headlights and phone glare; the
  15px screen minimum in the scale above is for comfortable indoor reading only.

## The wordmark, the mark, and the lockup

**Wordmark** — `RSSKYLER` in Fraunces Semibold + `LIMO` in Fraunces Regular, one word, single
baseline, **4.8% letter-spacing**, all caps. The weight shift lets the eye read two parts of a
twelve-letter name without inserting a space the brand does not have.

- On light grounds: entire wordmark in midnight.
- On midnight or charcoal: `RSSKYLER` white, `LIMO` gold.

Set it as live text, not an image (`src/components/brand/wordmark.tsx`).

**Mark** — the gold RS monogram with the wheel set into the S, from `brand-assets/logo_design.pdf`.
The kit carries gold, reversed-white-on-dark, and solid-mono variants; the working file is
`brand-assets/rsskylerlimo-transparent-logo.png`. Note that the 2026 Brand Guidelines
deliberately *omit* a logo chapter — the mark was still being finalised when that document was
written — so the guide's typography, palette and voice rules govern, and the kit supplies the
mark itself. Vehicle livery placement and minimum sizes are still genuinely unspecified.

The full mark includes its own small "LIMOUSINE" line. `public/rsskyler-mark.png` is that mark
with the line painted out, so the lockup does not say the name twice. Paint it out — do not crop
it off: the line sits *beside* the S's bottom flourish, not below it, so a horizontal crop takes
the bottom of the S with it.

**Lockup** — mark, hairline divider, wordmark (`src/components/brand/logo.tsx`). Use it in the
header and footer. Use the mark alone only where the name already appears nearby, or as a
low-opacity watermark on a midnight field.

**Icons** — `src/app/icon.png` (512, favicon) and `src/app/apple-icon.png` (180) are the cropped
mark on a midnight ground with generous padding. Next.js emits the `<link>` tags from those
filenames; do not hand-write icon metadata. Regenerate with the same crop rather than shrinking
the full mark — the "LIMOUSINE" line and the wheel spokes do not survive to 32px.

## Component specs

| Element | Treatment |
|---|---|
| Primary button | Midnight fill, white text |
| Secondary button | White fill, midnight border and text |
| CTA / highlight button | Gold fill, **midnight** text |
| Links | Midnight, underline on hover |
| Success | Green |
| Error | Red |

Chrome that must be identical on every screen: **midnight header, white content, gold reserved
for the primary action only.** One gold action per view. If a screen appears to need two, one
of them is not actually primary.

Surfaces:
- *Primary surface* — midnight ground, white text, gold for icons and small accents only.
- *Light surface* — white or grey ground, charcoal or midnight text, gold as border or icon only.

## Digital design principles

- **Clarity first** — fare, vehicle class and pickup time are visible before the client asks.
- **Few taps to book** — the booking flow should feel shorter than describing the trip out loud.
- **Calm under pressure** — delays, driver changes and reroutes are communicated automatically
  and plainly, *ahead of* the client noticing something is wrong.
- **Consistent chrome** — see above.

Page jobs-to-be-done:

| Page | Job |
|---|---|
| Home / booking | Get a fare and a confirmed pickup in under a minute |
| Fleet | Show each vehicle class plainly enough to choose without calling support |
| Corporate | Explain accounts, billing and SLAs to a travel manager evaluating vendors |
| Weddings & Events | Feel like its own considered experience |
| Trip tracking | Answer "where is my car" before the client opens the app to ask |

## Voice

Five characteristics: **confident** (states plainly, never hedges), **professional**
(correct, considered, never sloppy), **welcoming** (speaks to a person, not an account
number), **discreet** (says only what's needed; never performs privacy, just practises it),
**efficient** (short sentences, no filler).

| Say | Avoid |
|---|---|
| "Your driver is five minutes out." | "Your transportation solution is being dispatched." |
| "We've got your flight tracked — no need to call." | "OMG your ride is almost here!! 🎉" |
| "Confirmed for 6:00 a.m. See you then." | Exclamation points, jargon, forced slang |

Taglines by context: *Arrive in Style* (primary — homepage, app, general marketing) ·
*Your City, Chauffeured* (corporate/commuter) · *Precision. Privacy. Presence.* (diplomatic &
high-discretion) · *Every Detail, Minded* (weddings & events).

Never write marketing copy that promises exclusivity or velvet-rope distance. "Exclusive" sits
in real tension with the accessible-luxury positioning and is not approved language.

## Imagery

Authentic over aspirational — RSSkyler's own fleet, own chauffeurs, real New York locations.
Never generic stock luxury.

- **Grade:** cool, slightly desaturated, midnight blue in the shadows. Never warm or orange-heavy.
- **Light:** golden hour and blue hour for exteriors — the gold-on-midnight relationship from
  the palette, found again in the sky.
- **Composition:** give the vehicle and the city room to breathe; no tight cluttered crops.
- **People:** candid over posed — a chauffeur opening a door mid-motion beats a static portrait.
- **Represent all five boroughs.** A livery shot outside a Brooklyn brownstone or at LaGuardia
  carries the same weight as one on Park Avenue. Cast should reflect who actually rides and
  actually drives in New York.

Avoid: stock photos of unrelated luxury cars, heavy filters or lens flares, studio-white
backgrounds that could belong to any brand.

## Content reference

Fleet: **Luxury Sedan** (1–2 passengers, airport transfers, point-to-point) · **Luxury SUV**
(small groups, extra luggage) · **Premium SUV** (top of fleet — VIP, diplomatic, flagship
corporate) · **Sprinter Van** (groups, wedding parties, event logistics).

Services: Airport Transfers (flight-tracked, JFK/LGA/EWR) · Hourly Charters · Corporate
Accounts (monthly billing, SLAs, dedicated contact) · Events · Weddings.

Wedding packages: **Classic** (one sedan or SUV, half-day) · **Signature** (couple's vehicle +
Sprinter for the party, full day, on-site coordinator) · **Bespoke** (full motorcade, multi-day,
named coordinator from first call to final drop-off). The wedding voice warms further: more
present tense, more sensory detail, less operational language.

Audiences: business travellers · diplomatic & executive clients · corporate accounts ·
wedding & event hosts.

## Implementation

For the Tailwind v4 `@theme` block, the `next/font` setup, and copy-paste component patterns,
read `references/tailwind-setup.md`. For the full chapter-by-chapter source detail, read
`references/brand-guidelines.md`.

Before you finish any UI work, run this check:

- [ ] Every color traces to one of the five tokens (or a green/red state).
- [ ] No gold text on a white or grey ground.
- [ ] Every gold button has midnight text.
- [ ] Exactly one gold action in the view.
- [ ] Headings are Fraunces; body, buttons and labels are Public Sans.
- [ ] Numeric columns use tabular figures.
- [ ] Copy is short, plain, and free of exclamation points and jargon.

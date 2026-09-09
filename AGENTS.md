<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# RSSkyler Limo

Marketing site, booking system and reservations dashboard for a New York City
chauffeur service. Two apps, deployed separately onto one server:

- **`src/`** — Next.js App Router, TypeScript, Tailwind v4, GSAP. Port 3000.
  Public pages under `src/app/(site)/`, the dashboard under `src/app/admin/`.
- **`api/`** — Express 5, MySQL, Zod. Port 4000, its own `package.json`. Run it
  with `npm run api:dev` from the repo root.

Three things that are easy to get wrong here:

- **Auth is checked in the DAL** (`src/lib/admin/dal.ts`), not in a layout. A
  layout does not re-render on navigation and does not stop its children
  rendering. `src/proxy.ts` (Middleware, renamed in Next 16) only does an
  optimistic cookie-presence check.
- **Chrome lives in route-group layouts.** The root layout is the document
  shell only. Putting a header there renders it over the dashboard too.
- **Timestamps are UTC in the database**, converted to `America/New_York` at
  the edge. See the `SET time_zone` note in `api/src/db.ts` before touching
  anything with a date in it. Money is integer cents.

`npm run check` lints and typechecks both apps. See the README for setup.

**Before writing any UI, load the `rsskyler-brand` skill.** It encodes the Brand
Guidelines (Edition 02, 2026) — five colours, two typefaces, contrast-verified
pairings, voice rules. The source PDFs are in `brand-assets/`; a full
transcription is at `.claude/skills/rsskyler-brand/references/brand-guidelines.md`.

The three rules broken most often:

- Gold text never sits on white or grey (2.4:1). On light grounds gold is a
  border, an icon, a rule, or a large decorative numeral.
- Gold buttons carry **midnight** text, never white.
- One gold action per view. The header CTA is outlined so the page's own primary
  action keeps the gold.

`/styleguide` renders every component with its contrast table — check changes
there. Fonts are loaded once in `src/app/layout.tsx`; colour tokens live in the
`@theme` block in `src/app/globals.css`.

The logo lockup is `src/components/brand/logo.tsx` (RS monogram + wordmark).
Favicon and app icon are `src/app/icon.png` / `src/app/apple-icon.png` — Next
emits the `<link>` tags from those filenames, so don't hand-write icon metadata.

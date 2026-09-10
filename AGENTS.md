<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# RSSkyler Limo

Marketing site, booking system and reservations dashboard for a New York City
chauffeur service. **Three separate apps**, each with its own `package.json`,
deployed onto one server:

- **`src/`** — the public site. Next.js App Router, Tailwind v4, GSAP. `:3000`,
  rsskylerlimo.com. Pages live under `src/app/(site)/`.
- **`admin/`** — the reservations dashboard. Next.js App Router, Tailwind v4.
  `:3001`, admin.rsskylerlimo.com. Its routes sit at *its own root*: `/`,
  `/bookings`, `/login` — there is no `/admin` prefix anywhere.
- **`api/`** — Express 5, MySQL, Zod. `:4000`, never exposed to the internet.

Run them with `npm run dev`, `npm run admin:dev`, `npm run api:dev` from the
repo root. `npm run check` lints and typechecks all three.

Things that are easy to get wrong here:

- **Work in the right app.** `admin/` and `api/` are excluded from the root
  `tsconfig.json` and ESLint config — editing dashboard code under `src/` will
  appear to typecheck and then not exist at runtime.
- **The brand layer is duplicated, deliberately.** The `@theme` block in
  `admin/src/app/globals.css` mirrors `src/app/globals.css`; so do `wordmark`,
  `clsx` and the API client. Change a colour in one, change it in the other.
- **Auth is checked in the DAL** (`admin/src/lib/admin/dal.ts`), not in a
  layout. A layout does not re-render on navigation and does not stop its
  children rendering. `admin/src/proxy.ts` (Middleware, renamed in Next 16)
  only does an optimistic cookie-presence check, and guards the whole origin.
- **Chrome lives in route-group layouts.** Each root layout is the document
  shell only. Putting a header there renders it over every page in that app.
- **Timestamps are UTC in the database**, converted to `America/New_York` at
  the edge. See the `SET time_zone` note in `api/src/db.ts` before touching
  anything with a date in it. Money is integer cents.

See the README for setup and `deploy/nginx.conf` for the two server blocks.

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

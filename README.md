# RSSkyler Limo

Marketing site, booking system and reservations dashboard for a New York City
chauffeur service.

Three applications, deployed as separate units onto one server:

| | | | |
|---|---|---|---|
| **Web** — `src/` | Next.js 16, App Router, Tailwind v4, GSAP | `:3000` | rsskylerlimo.com |
| **Admin** — `admin/` | Next.js 16, App Router, Tailwind v4 | `:3001` | admin.rsskylerlimo.com |
| **API** — `api/` | Express 5, MySQL, Zod | `:4000` | not exposed |

MySQL listens on localhost only. So does the API: the browser talks to one of
the two Next.js servers, and they talk to the API server-side. `deploy/nginx.conf`
has the two server blocks.

The admin app is self-contained — its own `package.json`, its own copy of the
brand tokens and wordmark, deployable without the other two. That means the
`@theme` block in `admin/src/app/globals.css` and the one in
`src/app/globals.css` must be changed together; `/styleguide` on the public site
is still the reference for what a token is allowed to do.

## Getting started

Requires Node 20+ and a running MySQL 8+.

```bash
npm install                # web app
npm run setup              # admin + API deps, database schema, sample data
```

`npm run setup` prints a development operator account and its password. Then, in
three terminals:

```bash
npm run api:dev            # http://localhost:4000
npm run dev                # http://localhost:3000
npm run admin:dev          # http://localhost:3001
```

Copy the environment templates before the first run:

```bash
cp .env.example .env.local            # web   → API_URL
cp admin/.env.example admin/.env.local # admin → API_URL
cp api/.env.example api/.env          # API   → database credentials
```

- `http://localhost:3000` — the public site
- `http://localhost:3001` — the reservations dashboard
- `http://localhost:3000/styleguide` — every component with its contrast table

## How the pieces fit

A customer submits the booking form. A Server Action posts it to
`POST /api/bookings`, which validates it, writes it, and returns a reference such
as `RS-4K2P9WD`. The customer sees that reference; `/track` exchanges it for a
status. Nothing else about the booking is readable without signing in.

An operator signs in at `admin.rsskylerlimo.com`. The API returns an opaque bearer token;
Next.js stores it in an httpOnly cookie on **its own** origin and forwards it to
the API on each request. The browser never holds a credential the API accepts,
which is why there is no cross-origin cookie to configure and no CSRF token to
manage on the API.

In production that cookie is named `__Host-rsskyler_admin`. The prefix is
enforced by the browser: it refuses the cookie unless it is Secure, `Path=/` and
carries no Domain attribute — so the session can never be widened to
`.rsskylerlimo.com` and start riding along on requests to the public site.

Authorisation is checked in `admin/src/lib/admin/dal.ts`, next to the data, on
every request — not in a layout, which does not re-render on navigation and
cannot stop its children rendering. `admin/src/proxy.ts` only does an optimistic
cookie-presence check so a signed-out visitor lands on the sign-in page; it
guards the whole origin by default, so a new route is protected by existing.

## Everyday commands

| Command | Does |
|---|---|
| `npm run dev` / `npm run admin:dev` / `npm run api:dev` | Run each app in watch mode |
| `npm run check` | Lint and typecheck all three apps |
| `npm run build:all` | Production builds, all three |
| `npm run api:migrate` | Apply `api/src/schema.sql` (idempotent) |
| `npm run api:seed` | Development sample data — refuses to run in production |
| `npm run api:create-admin` | Add a real operator account, interactively |
| `npm run plan:pdf` | Regenerate the client build plan PDF |

There is no self-service signup and no default password. Operator accounts are
created with `api:create-admin`.

## Times and money

Timestamps are stored and compared in UTC; every connection pins
`time_zone = '+00:00'` because MySQL otherwise writes the host's local clock
while the driver reads UTC. Anything that must be true *in New York* — the
"pickups today" count, every time the dashboard renders, the pickup time the
booking form submits — converts at the edge, in `America/New_York`.

Money is stored in integer cents. Never a float.

## Design

**Load the `rsskyler-brand` skill before writing any UI.** It encodes the Brand
Guidelines (Edition 02, 2026): five colours, two typefaces, contrast-verified
pairings, voice rules. See [AGENTS.md](AGENTS.md) for the rules broken most
often.

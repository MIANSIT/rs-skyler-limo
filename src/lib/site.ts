import "server-only";

/**
 * The one canonical origin for the public site.
 *
 * `www` is canonical and the apex 301s to it (see `deploy/nginx.conf`). Every
 * absolute URL the site emits — `metadataBase`, the sitemap, `Sitemap:` in
 * robots.txt — has to name the same host, or each one advertises a URL that
 * redirects and search engines spend their crawl budget on the hop.
 *
 * Server-only, so no `NEXT_PUBLIC_` prefix: metadata, `sitemap.ts` and
 * `robots.ts` are all evaluated on the server and the browser never needs it.
 * The variable is the same `SITE_BASE_URL` the API uses for tracking links, so
 * the two cannot disagree about where the site lives.
 */
export const siteUrl = (
  process.env.SITE_BASE_URL ?? "https://www.rsskylerlimo.com"
).replace(/\/$/, "");

/** The registered name, spelled one way. */
export const siteName = "RSSkyler Limo";

/**
 * What the business does, in one sentence.
 *
 * Lives here because two things say it — the `description` in the root
 * layout's metadata, which is the line Google prints under the result, and the
 * `description` on the LocalBusiness node. Said twice, they drift, and a
 * structured-data description contradicting the meta description is the kind
 * of mismatch that gets structured data ignored.
 *
 * So it has to be true. An earlier version of this sentence claimed
 * flight-tracked transfers; nothing in this system tracks a flight. A flight
 * number is collected and a person reads it.
 */
export const siteDescription =
  "Private, punctual chauffeured travel across all five boroughs. Airport transfers at published fixed fares, hourly charters, corporate accounts, weddings and events.";

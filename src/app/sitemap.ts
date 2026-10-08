import { readdirSync } from "node:fs";
import { join } from "node:path";

import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

/**
 * The marketing surface, and nothing else.
 *
 * Deliberately hand-listed rather than derived from the filesystem: a sitemap
 * is a claim that a URL is worth indexing, and `/styleguide`, `/track` and
 * `/review` are not — they are excluded here and in `robots.ts` both.
 *
 * No `lastModified`, `changeFrequency` or `priority`. Google ignores the last
 * two outright, and a `lastModified` of "whenever this built" is a date that
 * changes on every deploy without the page having changed — which teaches a
 * crawler to distrust the field. Add a real date per page when there is one.
 */
const routes = [
  "/",
  "/services",
  "/airport-transportation",
  "/jfk-airport-car-service",
  "/laguardia-airport-car-service",
  "/newark-airport-car-service",
  "/teterboro-airport-car-service",
  "/westchester-airport-car-service",
  "/service-areas",
  "/fleet",
  "/book",
  "/quote",
  "/corporate",
  "/weddings",
  "/about",
  "/reviews",
  "/faq",
  "/contact",
  "/accessibility",
  "/privacy",
  "/terms",
] as const;

/**
 * Pages that exist and are deliberately kept out of the sitemap.
 *
 * Every one of these is also disallowed in `robots.ts`, except the `/pay`
 * routes — those are reached only from a signed link in an email, so there is
 * nothing to crawl and nothing to forbid.
 */
const excluded = new Set([
  "/styleguide", // design reference, not customer-facing
  "/track", // per-customer lookup; needs a reference and a phone number
  "/review", // per-customer form, reached from a completed booking
  "/pay/[reference]", // signed payment link
  "/pay/complete",
  "/pay/cancelled",
]);

/**
 * Fails the build when a page is neither listed nor explicitly excluded.
 *
 * The list above is hand-written on purpose, and that is exactly how it fell
 * behind: nine marketing pages shipped — every airport page among them — and
 * none reached the sitemap, so the pages carrying the target searches were
 * invisible to Google while appearing perfectly finished in the repository.
 * Deciding per page stays manual; forgetting that a page exists does not.
 *
 * Wrapped in a try/catch because this reads `src/`, which is present when the
 * sitemap is generated at build time but need not be wherever the output is
 * eventually run. A sitemap is not worth a 500.
 */
function assertEveryPageIsAccountedFor(): void {
  let found: string[];
  try {
    found = readdirSync(join(process.cwd(), "src", "app", "(site)"), {
      recursive: true,
      withFileTypes: true,
    })
      .filter((entry) => entry.isFile() && entry.name === "page.tsx")
      .map((entry) => {
        const dir = entry.parentPath ?? entry.path;
        const rel = dir.split(`app${"/"}(site)`)[1] ?? "";
        return rel === "" ? "/" : rel;
      });
  } catch {
    return;
  }

  const listed = new Set<string>(routes);
  const missing = found.filter(
    (route) => !listed.has(route) && !excluded.has(route),
  );

  if (missing.length > 0) {
    throw new Error(
      `sitemap.ts: these pages are neither listed nor excluded: ${missing.join(", ")}. ` +
        "Add each one to `routes` if it should be indexed, or to `excluded` if it should not.",
    );
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  assertEveryPageIsAccountedFor();

  // Resolved through `URL` rather than concatenated, so the homepage comes out
  // as `https://www.rsskylerlimo.com/` — with the trailing slash that the
  // canonical Next derives from `metadataBase` also carries. A sitemap that
  // lists a URL one character off from the page's own canonical is a
  // contradiction a crawler has to resolve on its own.
  return routes.map((route) => ({
    url: new URL(route, siteUrl).toString(),
  }));
}

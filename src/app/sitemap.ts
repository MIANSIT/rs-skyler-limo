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

export default function sitemap(): MetadataRoute.Sitemap {
  // Resolved through `URL` rather than concatenated, so the homepage comes out
  // as `https://www.rsskylerlimo.com/` — with the trailing slash that the
  // canonical Next derives from `metadataBase` also carries. A sitemap that
  // lists a URL one character off from the page's own canonical is a
  // contradiction a crawler has to resolve on its own.
  return routes.map((route) => ({
    url: new URL(route, siteUrl).toString(),
  }));
}

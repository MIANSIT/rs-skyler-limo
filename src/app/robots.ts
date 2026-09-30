import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

/**
 * Public site only. The dashboard has its own, stricter, one in
 * `admin/src/app/robots.ts`, and nginx adds `X-Robots-Tag: noindex` across that
 * whole origin regardless.
 *
 * The disallowed paths are not secret — `/track` and `/review` both demand a
 * reference *and* the phone number on the booking. They are excluded because
 * they are per-customer and have nothing to rank for, so indexing them spends
 * crawl budget on pages that can only ever render a form.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/styleguide", "/track", "/review", "/api/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

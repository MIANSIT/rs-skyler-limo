import type { MetadataRoute } from "next";

/**
 * admin.rsskylerlimo.com is a private host. Nothing on it should ever appear in
 * a search result, so the whole origin is disallowed rather than individual
 * paths — a new route must not become indexable just because someone forgot to
 * add it here.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}

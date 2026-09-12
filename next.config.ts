import type { NextConfig } from "next";

/**
 * Where vehicle photography may be loaded from.
 *
 * `next/image` refuses remote hosts it has not been told about, and the uploads
 * host differs by environment: the API serves them itself in development, while
 * in production nginx serves them from the site's own origin (see
 * `deploy/nginx.conf`). Derived from the same variable the API is configured
 * with so the two cannot disagree.
 */
const uploadsBase =
  process.env.UPLOADS_BASE_URL ?? "http://127.0.0.1:4000/uploads";

const uploadsUrl = (() => {
  try {
    return new URL(uploadsBase);
  } catch {
    // A malformed value must not take the build down; images simply will not
    // load, which is visible and diagnosable.
    console.warn(`Ignoring unparseable UPLOADS_BASE_URL: ${uploadsBase}`);
    return null;
  }
})();

/**
 * True when uploads are served from this machine.
 *
 * Keyed on the actual host rather than `NODE_ENV`, because `next build` always
 * runs with `NODE_ENV=production` — including a local build — so testing the
 * environment would silently disable the exemption in development, which is
 * exactly where it is needed.
 */
function servedLocally(url: URL | null): boolean {
  if (!url) return false;

  return (
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "::1" ||
    url.hostname.endsWith(".localhost")
  );
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: uploadsUrl
      ? [
          {
            protocol: uploadsUrl.protocol.replace(":", "") as "http" | "https",
            hostname: uploadsUrl.hostname,
            port: uploadsUrl.port,
            pathname: `${uploadsUrl.pathname.replace(/\/$/, "")}/**`,
          },
        ]
      : [],

    /**
     * The image optimiser refuses private IPs by default, because fetching
     * arbitrary internal addresses is an SSRF primitive. In development the API
     * serves uploads from 127.0.0.1:4000, so the exemption is required there.
     *
     * It stays off for any real hostname: in production nginx serves uploads
     * from the site's own public origin, where this is neither needed nor
     * wanted.
     */
    dangerouslyAllowLocalIP: servedLocally(uploadsUrl),
  },
};

export default nextConfig;

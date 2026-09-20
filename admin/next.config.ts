import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Server Actions default to a 1MB request body, meant to guard against
   * accidental large payloads — far below a vehicle photo (up to 5MB) or a
   * hero video (up to 25MB, plus an optional poster image alongside it in
   * the same submission). Both upload forms post a `File` straight through
   * a Server Action, so the limit has to cover the largest of those with
   * headroom for multipart overhead.
   */
  experimental: {
    serverActions: {
      bodySizeLimit: "35mb",
    },
  },

  /**
   * This app is a sibling of the public site, not part of a workspace with it.
   *
   * Next detects the project root from the nearest lockfile and walks upward; it
   * finds the repo-root `package-lock.json` and assumes the root is one level
   * up, which pulls the public site and the API into module resolution and file
   * watching. Pinning it here keeps the three apps genuinely independent — and
   * silences the multiple-lockfile warning, which is the symptom of exactly
   * this.
   */
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;

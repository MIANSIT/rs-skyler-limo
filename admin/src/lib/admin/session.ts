import "server-only";

import { cookies } from "next/headers";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Whether this deployment is served over HTTPS.
 *
 * Defaults to true in production and can only be turned off deliberately. It
 * exists for one situation: a server reachable only by bare IP, where no
 * certificate can be issued yet. A `Secure` cookie is discarded by the browser
 * over plain HTTP, so leaving it on there does not fail loudly — sign-in simply
 * never sticks, which is a miserable thing to debug.
 *
 * Turning it off means the session token crosses the network in clear text.
 * That is acceptable for a preview host with no real customer data on it, and
 * unacceptable the moment the domain and certificate are in place.
 */
const secureCookies = isProduction && process.env.COOKIE_INSECURE !== "true";

if (isProduction && !secureCookies) {
  console.warn(
    "[admin] COOKIE_INSECURE=true — session cookies are being sent without " +
      "Secure. Only valid for a bare-IP preview. Remove it once HTTPS is on.",
  );
}

/**
 * The `__Host-` prefix is enforced by the browser, not by us: a cookie carrying
 * it is rejected unless it is Secure, has `Path=/`, and carries **no** Domain
 * attribute. That last rule is the one that matters here — it makes the session
 * cookie host-only, so it can never be widened to `.rsskylerlimo.com` and start
 * riding along on requests to the public site.
 *
 * The prefix requires Secure, so any deployment that cannot offer it — dev on
 * http://localhost, or a bare-IP preview — falls back to the bare name. Note
 * the consequence in dev: the two apps share the `localhost` host and differ
 * only by port, and cookies ignore ports, so locally this cookie *is* sent to
 * the public site on :3000. It is httpOnly and that app never reads it, and on
 * a real host with TLS the prefix rules it out entirely.
 */
export const SESSION_COOKIE = secureCookies
  ? "__Host-rsskyler_admin"
  : "rsskyler_admin";

/**
 * The API issues an opaque bearer token; this app keeps it in an httpOnly
 * cookie on its own origin and forwards it server-side. The browser never holds
 * a credential the API would accept, and the API never sees a cookie — so there
 * is no cross-origin cookie to configure and no CSRF token to manage on it.
 */
export async function setSessionCookie(token: string, expiresAt: string) {
  const store = await cookies();

  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Required by `__Host-`, and the reason the name changes without it.
    secure: secureCookies,
    sameSite: "lax",
    // Also required by `__Host-`; never narrow this.
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function getSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}

export async function clearSessionCookie() {
  const store = await cookies();

  // A bare `delete(name)` sends an expiry without `Secure`, and the browser
  // rejects any `__Host-` cookie that arrives without it — so the session would
  // survive its own sign-out. Overwrite with the identical attributes instead.
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

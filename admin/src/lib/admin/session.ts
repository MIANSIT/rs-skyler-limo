import "server-only";

import { cookies } from "next/headers";

const isProduction = process.env.NODE_ENV === "production";

/**
 * The `__Host-` prefix is enforced by the browser, not by us: a cookie carrying
 * it is rejected unless it is Secure, has `Path=/`, and carries **no** Domain
 * attribute. That last rule is the one that matters here — it makes the session
 * cookie host-only, so it can never be widened to `.rsskylerlimo.com` and start
 * riding along on requests to the public site.
 *
 * The prefix requires Secure, which http://localhost cannot satisfy, so dev
 * falls back to the bare name. Note the consequence in dev: the two apps share
 * the `localhost` host and differ only by port, and cookies ignore ports — so
 * locally this cookie *is* sent to the public site on :3000. It is httpOnly and
 * that app never reads it, and on real hosts the prefix rules it out entirely.
 */
export const SESSION_COOKIE = isProduction
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
    // Off on http://localhost, on everywhere else. Required by `__Host-`.
    secure: isProduction,
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
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

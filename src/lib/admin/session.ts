import "server-only";

import { cookies } from "next/headers";

export const SESSION_COOKIE = "rsskyler_admin";

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
    // Off on http://localhost, on everywhere else.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
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
  store.delete(SESSION_COOKIE);
}

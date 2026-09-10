import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/admin/session";

/**
 * An optimistic check only — it looks for the presence of a cookie, never at
 * whether the session behind it is valid. That question is settled by the DAL
 * on every request, close to the data. This exists so a signed-out visitor sees
 * the sign-in page instead of a dashboard shell that then redirects.
 *
 * Renamed from Middleware in Next.js 16; the behaviour is unchanged.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const { pathname } = request.nextUrl;

  // `/login` is always allowed through, even holding a cookie.
  //
  // The tempting version of this bounces a cookie-holder to `/`. It also hangs
  // the browser: a cookie whose session has expired or been revoked still looks
  // valid here — only the DAL can tell — so `/` renders, the DAL redirects to
  // `/login`, and this sends it straight back. The escape hatch must never be
  // guarded by an optimistic check.
  if (pathname === "/login") {
    return NextResponse.next();
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  /**
   * This whole origin is private, so the default is "guard it" and the
   * exclusions are only the things that must stay reachable to render the
   * sign-in page itself. A new route is protected by virtue of existing.
   */
  matcher: "/((?!_next/static|_next/image|favicon.ico|robots.txt).*)",
};

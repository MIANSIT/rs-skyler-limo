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

  if (pathname === "/admin/login") {
    if (hasSession) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};

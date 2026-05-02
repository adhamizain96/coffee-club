// Next 16 Proxy (formerly Middleware) — gates /admin/* and /api/admin/* behind
// a signed admin cookie. /admin/login, /api/admin/login, and /api/admin/logout
// always pass through: login so the user can never get locked out, and logout
// so it stays idempotent — clicking it with an expired/missing cookie still
// clears the browser cookie and bounces to /admin/login instead of 401-ing.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, verifyCookieValue } from "@/lib/admin-auth";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

const PROXY_BYPASS_PATHS = new Set([
  "/admin/login",
  "/api/admin/login",
  "/api/admin/logout",
]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PROXY_BYPASS_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (verifyCookieValue(cookie?.value)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return new Response(null, { status: 401 });
  }

  return NextResponse.redirect(new URL("/admin/login", request.url));
}

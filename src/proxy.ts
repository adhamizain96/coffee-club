// Next 16 Proxy (formerly Middleware) — gates /admin/* and /api/admin/* behind
// a signed admin cookie. /admin/login and /api/admin/login are always allowed
// through so the user can never get locked out.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, verifyCookieValue } from "@/lib/admin-auth";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
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

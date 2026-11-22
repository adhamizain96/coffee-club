// Next 16 Proxy (formerly Middleware). Two jobs:
//
// 1. Old cafe links: /cafes/<cuid> -> 308 /cafes/<slug>. Done here rather than
//    in the page because the detail route streams (it has loading.tsx), and a
//    redirect from a streamed page is a client-side meta refresh with a 200,
//    not a real 308. Only cuid-shaped segments hit the database; slug URLs pass
//    straight through.
//
// 2. Admin gate: /admin/* and /api/admin/* need a signed admin cookie.
//    /admin/login, /api/admin/login, and /api/admin/logout always pass through:
//    login so the user can never get locked out, and logout so it stays
//    idempotent — clicking it with an expired/missing cookie still clears the
//    browser cookie and bounces to /admin/login instead of 401-ing.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, verifyCookieValue } from "@/lib/admin-auth";
import { CUID_SHAPE } from "@/lib/slug";
import { prisma } from "@/lib/prisma";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/cafes/:path*"],
};

const PROXY_BYPASS_PATHS = new Set([
  "/admin/login",
  "/api/admin/login",
  "/api/admin/logout",
]);

async function redirectLegacyCafeId(request: NextRequest): Promise<NextResponse> {
  const segment = request.nextUrl.pathname.split("/")[2] ?? "";
  if (!CUID_SHAPE.test(segment)) return NextResponse.next();

  const cafe = await prisma.cafe.findUnique({
    where: { id: segment },
    select: { slug: true },
  });
  if (!cafe?.slug) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/cafes/${cafe.slug}`;
  return NextResponse.redirect(url, 308);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/cafes/")) {
    return redirectLegacyCafeId(request);
  }

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

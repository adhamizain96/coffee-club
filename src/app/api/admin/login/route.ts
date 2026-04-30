import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_COOKIE_MAX_AGE_SEC,
  constantTimePasswordMatch,
  signCookieValue,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let password = "";
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const fd = await request.formData();
      const v = fd.get("password");
      if (typeof v === "string") password = v;
    } else {
      const body = (await request.json().catch(() => null)) as
        | { password?: unknown }
        | null;
      if (typeof body?.password === "string") password = body.password;
    }
  } catch {
    // fall through with empty password
  }

  if (!constantTimePasswordMatch(password)) {
    return NextResponse.redirect(
      new URL("/admin/login?error=1", request.url),
      { status: 303 }
    );
  }

  const value = signCookieValue();
  if (!value) {
    return NextResponse.redirect(
      new URL("/admin/login?error=1", request.url),
      { status: 303 }
    );
  }

  const res = NextResponse.redirect(
    new URL("/admin/submissions", request.url),
    { status: 303 }
  );
  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE_SEC,
  });
  return res;
}

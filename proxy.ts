import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "mp_auth";

export default function proxy(request: NextRequest) {
  const passcode = process.env.APP_PASSCODE;
  const authed = passcode && request.cookies.get(AUTH_COOKIE)?.value === passcode;

  const { pathname } = request.nextUrl;
  const isPublic = pathname === "/login" || pathname === "/api/auth";

  if (!authed && !isPublic) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (authed && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};

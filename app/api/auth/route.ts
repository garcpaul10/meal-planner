import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "mp_auth";
const SIX_MONTHS_SECONDS = 60 * 60 * 24 * 180;

export async function POST(request: NextRequest) {
  const { passcode } = await request.json().catch(() => ({ passcode: "" }));

  if (!process.env.APP_PASSCODE || passcode !== process.env.APP_PASSCODE) {
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, passcode, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SIX_MONTHS_SECONDS,
    path: "/",
  });
  return response;
}

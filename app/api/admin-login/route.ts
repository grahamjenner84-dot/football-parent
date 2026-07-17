import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const SESSION_COOKIE = "fp_admin_session";
const AUTH_MESSAGE = "fp-admin-authed";

export async function POST(req: NextRequest) {
  let password: string | undefined;
  try {
    const body = await req.json();
    password = body.password;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const secret = process.env.ADMIN_SESSION_SECRET || "";
  const sessionValue = crypto
    .createHmac("sha256", secret)
    .update(AUTH_MESSAGE)
    .digest("hex");

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, sessionValue, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}

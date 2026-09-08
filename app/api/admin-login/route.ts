import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const SESSION_COOKIE = "fp_admin_session";
const NO_TRACK_COOKIE = "fp_no_track";
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

  // Separate, much longer-lived cookie whose only job is to keep this device
  // out of page_views (see app/api/page-view/route.ts). Deliberately not just
  // a longer maxAge on the session cookie above: that one grants admin
  // access, and a year-long auth window is a worse trade than re-entering a
  // password monthly.
  //
  // Value is a plain "1" rather than the session HMAC. Forging it buys an
  // attacker nothing except the suppression of their own analytics row, so
  // there is nothing here worth signing, and copying the auth secret into a
  // year-long cookie would be strictly worse.
  res.cookies.set(NO_TRACK_COOKIE, "1", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  return res;
}

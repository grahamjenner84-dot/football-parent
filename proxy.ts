import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "fp_admin_session";
const AUTH_MESSAGE = "fp-admin-authed";

// Kept out of page_views by app/api/page-view/route.ts. Name duplicated from
// lib/admin-session.ts rather than imported, for the same reason the HMAC
// below is: this file runs on the edge runtime and that module pulls in node's
// crypto.
const NO_TRACK_COOKIE = "fp_no_track";
const NO_TRACK_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

async function expectedSessionValue(): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET || "";
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(AUTH_MESSAGE));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isLoginPage = pathname === "/admin/login";
  const isProtected =
    (pathname.startsWith("/admin") && !isLoginPage) ||
    pathname.startsWith("/api/seo-report") ||
    pathname.startsWith("/api/instagram") ||
    pathname.startsWith("/api/search-report") ||
    pathname.startsWith("/api/cookie-consent-report") ||
    pathname.startsWith("/api/compare-report") ||
    pathname.startsWith("/api/compare-page-queries") ||
    pathname.startsWith("/api/page-view-report") ||
    pathname.startsWith("/api/page-view-compare") ||
    pathname.startsWith("/api/page-view-by-path") ||
    pathname.startsWith("/api/coach-app-view-report");

  if (!isProtected) return NextResponse.next();

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const expected = await expectedSessionValue();

  if (cookie && cookie === expected) {
    // Refresh the tracking exclusion on every authenticated admin request,
    // not just at login. There is no sign-out in this app, so a device that
    // signed in once would otherwise never be handed the cookie at all, and
    // waiting for the 30-day session to lapse just to get it is backwards.
    // Opening the dashboard is the thing Graham actually does, so hang it on
    // that: each visit pushes the exclusion out another year.
    const res = NextResponse.next();
    res.cookies.set(NO_TRACK_COOKIE, "1", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: NO_TRACK_MAX_AGE,
    });
    return res;
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", req.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/seo-report",
    "/api/instagram/:path*",
    "/api/search-report",
    "/api/cookie-consent-report",
    "/api/compare-report",
    "/api/compare-page-queries",
    "/api/page-view-report",
    "/api/page-view-compare",
    "/api/page-view-by-path",
    "/api/coach-app-view-report",
  ],
};

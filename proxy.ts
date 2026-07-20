import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "fp_admin_session";
const AUTH_MESSAGE = "fp-admin-authed";

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
    pathname.startsWith("/api/instagram");

  if (!isProtected) return NextResponse.next();

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const expected = await expectedSessionValue();

  if (cookie && cookie === expected) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", req.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/seo-report", "/api/instagram/:path*"],
};

import { NextResponse } from "next/server";
import { logPageView } from "@/lib/supabase/page-views";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PATH_LENGTH = 300;
const MAX_HOST_LENGTH = 255;

// Public endpoint, called from every route by app/components/PageViewPing.tsx
// - not gated by proxy.ts admin auth, and deliberately not gated on the
// cookie consent choice either. See the migration comment on page_views for
// why that's fine to log independently (anonymous path + timestamp only).
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const path = typeof body.path === "string" ? body.path.trim() : "";
    const referrerHost =
      typeof body.referrerHost === "string" && body.referrerHost.trim()
        ? body.referrerHost.trim().slice(0, MAX_HOST_LENGTH)
        : null;

    if (!path) {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    await logPageView(path.slice(0, MAX_PATH_LENGTH), referrerHost);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { logPageView } from "@/lib/supabase/page-views";
import { isKnownBot } from "@/lib/user-agent-bots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PATH_LENGTH = 300;
const MAX_HOST_LENGTH = 255;
const MAX_UA_LENGTH = 500;
const MAX_UTM_LENGTH = 255;
const MAX_CLICK_ID_LENGTH = 255;

function cleanString(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null;
}

// Public endpoint, called from every route by app/components/PageViewPing.tsx
// - not gated by proxy.ts admin auth, and deliberately not gated on the
// cookie consent choice either. See the migration comment on page_views for
// why that's fine to log independently (anonymous path + timestamp only).
// logPageView applies its own per-path flood guard - see
// lib/supabase/page-views.ts - since this endpoint has no auth/rate limit
// of its own.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const path = typeof body.path === "string" ? body.path.trim() : "";

    if (!path) {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    const userAgent = cleanString(req.headers.get("user-agent"), MAX_UA_LENGTH);

    // Self-declared bots (Googlebot, Bytespider, curl, headless browsers...)
    // don't get logged at all - see lib/user-agent-bots.ts. Silent no-op,
    // same reasoning as the flood guard: nothing here signals back to the
    // caller that it was filtered.
    if (!isKnownBot(userAgent)) {
      await logPageView(path.slice(0, MAX_PATH_LENGTH), {
        referrerHost: cleanString(body.referrerHost, MAX_HOST_LENGTH),
        userAgent,
        utmSource: cleanString(body.utmSource, MAX_UTM_LENGTH),
        utmMedium: cleanString(body.utmMedium, MAX_UTM_LENGTH),
        utmCampaign: cleanString(body.utmCampaign, MAX_UTM_LENGTH),
        gclid: cleanString(body.gclid, MAX_CLICK_ID_LENGTH),
        fbclid: cleanString(body.fbclid, MAX_CLICK_ID_LENGTH),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

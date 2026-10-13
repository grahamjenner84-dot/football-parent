import { NextResponse } from "next/server";
import { logProgressBannerSeen } from "@/lib/supabase/progress-funnel";
import { parseProgressBanner } from "@/lib/progress-banner-test";
import { isKnownBot } from "@/lib/user-agent-bots";
import { isOwnerRequest } from "@/lib/owner-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PATH_LENGTH = 300;
const MAX_UA_LENGTH = 500;

// Public endpoint, called once per Progress banner per page view, the first
// time half of it is on screen (app/components/useProgressBannerSeen.ts).
// Same posture as /api/page-view and /api/coach-app-share: no admin auth,
// not consent-gated (the row is anonymous, see the progress_banner_seen
// migration), Graham's own devices and self-declared bots dropped, per-path
// flood guard inside logProgressBannerSeen.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const path =
      typeof body.path === "string" && body.path.startsWith("/") ? body.path.slice(0, MAX_PATH_LENGTH) : null;
    // Only a real Progress banner value: anything else is somebody posting
    // made-up rows, not the banner.
    const banner = typeof body.banner === "string" && parseProgressBanner(body.banner) ? body.banner : null;

    if (!path || !banner) {
      return NextResponse.json({ error: "path and banner are required" }, { status: 400 });
    }

    const userAgent = req.headers.get("user-agent")?.slice(0, MAX_UA_LENGTH) ?? null;

    if ((await isOwnerRequest(req)) || isKnownBot(userAgent)) {
      return NextResponse.json({ ok: true });
    }

    await logProgressBannerSeen(path, banner, userAgent);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

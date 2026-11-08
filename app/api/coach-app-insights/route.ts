import crypto from "crypto";
import { NextResponse } from "next/server";
import { isBadInsights, logCoachAppInsights, parseInsights } from "@/lib/supabase/coach-app-insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called hourly by the Coach App project's own database (send_usage_insights
// in coach-app migration 0071, via pg_cron + pg_net), never by a browser.
// Counts only: parseInsights rebuilds the payload from the keys it knows and
// refuses anything that isn't a count, a date label or a known stage name.
//
// Same shared secret as /api/coach-app-snapshot (COACH_APP_SNAPSHOT_SECRET
// here, site_snapshot_secret in the Coach App project's Vault). Without the
// env var set, every post is refused.

function secretMatches(header: string | null): boolean {
  const secret = process.env.COACH_APP_SNAPSHOT_SECRET;
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice("Bearer ".length));
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!secretMatches(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const insights = parseInsights(await req.json().catch(() => null));
    await logCoachAppInsights(insights);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isBadInsights(err)) {
      return NextResponse.json({ error: "Bad insights: " + err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getPageViewsForPath } from "@/lib/supabase/page-views";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Protected by proxy.ts (added to its matcher), same as /api/page-view-report.
// Daily view counts for one exact path, for the "Page trend" tab. Returns
// full history (from first recorded view through today) unless `days` is
// passed - the frontend instead windows the full response to 7/30 days
// client-side, so `days` here is a fallback rather than the normal path.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path");
    const daysParam = Number(searchParams.get("days"));
    const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : undefined;

    if (!path) {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    const byDay = await getPageViewsForPath(path, days);
    return NextResponse.json({ path, byDay });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

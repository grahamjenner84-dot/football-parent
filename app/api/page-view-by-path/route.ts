import { NextResponse } from "next/server";
import { getPageViewsForPath } from "@/lib/supabase/page-views";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Protected by proxy.ts (added to its matcher), same as /api/page-view-report.
// Daily view counts for one exact path over the last `days` days, for the
// "Page trend" tab.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path");
    const daysParam = Number(searchParams.get("days"));
    const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 30;

    if (!path) {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    const byDay = await getPageViewsForPath(path, days);
    return NextResponse.json({ path, days, byDay });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

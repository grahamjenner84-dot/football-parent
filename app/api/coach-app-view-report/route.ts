import { NextResponse } from "next/server";
import { getPageViewStats } from "@/lib/supabase/page-views";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Same page_views table as /api/page-view-report, scoped to the Coach App
// marketing landing page and the /coach-app app itself - both are routes
// on this same footballparent.co.uk Next app (see next.config.ts), not a
// separate deployment, so no cross-project data access is involved. See
// CLAUDE.md "Supabase projects" for why that distinction matters.
// Protected by proxy.ts, same as /api/page-view-report.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const daysParam = Number(searchParams.get("days"));
    const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 30;
    const stats = await getPageViewStats(days, {
      pathPrefixes: ["/football-parent-coach-app", "/coach-app"],
    });
    return NextResponse.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

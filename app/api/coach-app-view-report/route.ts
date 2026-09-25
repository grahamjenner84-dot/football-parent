import { NextResponse } from "next/server";
import { getBannerVariantStats, getPageViewStats } from "@/lib/supabase/page-views";
import { getCoachAppShareStats } from "@/lib/supabase/coach-app-shares";

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
    const [stats, bannerVariants, shareStats] = await Promise.all([
      getPageViewStats(days, {
        pathPrefixes: ["/football-parent-coach-app", "/coach-app"],
      }),
      // Not scoped by pathPrefixes: the click side is landings on the
      // Coach App page, but the impression side is views of the ARTICLES
      // carrying each banner, which are spread across the whole site.
      getBannerVariantStats(days),
      // Fails soft: a missing coach_app_shares table (migration not yet
      // applied) shouldn't blank the rest of the tab.
      getCoachAppShareStats(days).catch((err: unknown) => ({
        error: err instanceof Error ? err.message : "Unknown error",
      })),
    ]);
    return NextResponse.json({ ...stats, bannerVariants, shareStats });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

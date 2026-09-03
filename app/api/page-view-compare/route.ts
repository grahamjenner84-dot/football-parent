import { NextResponse } from "next/server";
import { comparePageViewsByDay } from "@/lib/supabase/page-views";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Protected by proxy.ts (added to its matcher), same as /api/page-view-report.
// Per-page day-vs-day comparison over the same page_views data as the Page
// views tab, for the "Compare page views" tab.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateA = searchParams.get("dateA");
    const dateB = searchParams.get("dateB");

    if (!dateA || !dateB) {
      return NextResponse.json({ error: "dateA and dateB are both required (YYYY-MM-DD)" }, { status: 400 });
    }

    const comparison = await comparePageViewsByDay(dateA, dateB);
    return NextResponse.json(comparison);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

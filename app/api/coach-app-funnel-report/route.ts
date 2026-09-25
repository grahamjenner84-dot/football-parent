import { NextResponse } from "next/server";
import { getCoachAppFunnel } from "@/lib/supabase/coach-app-funnel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Backs the Coach App funnel tab on /admin/seo. Protected by proxy.ts, same
// as the other *-report routes. Reads football-parent-social only.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const daysParam = Number(searchParams.get("days"));
    const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 30;
    return NextResponse.json(await getCoachAppFunnel(days));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

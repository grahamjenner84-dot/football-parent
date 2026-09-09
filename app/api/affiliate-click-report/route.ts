import { NextResponse } from "next/server";
import { getAffiliateClickStats } from "@/lib/supabase/affiliate-clicks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Protected by proxy.ts (added to its matcher) - unlike the public
// POST /api/affiliate-click logging endpoint, this reads aggregate revenue
// signal and sits behind the same admin session as the rest of /admin/seo.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const daysParam = Number(searchParams.get("days"));
    const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 30;
    const stats = await getAffiliateClickStats(days);
    return NextResponse.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

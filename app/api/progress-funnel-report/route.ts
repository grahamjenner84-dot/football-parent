import { NextResponse } from "next/server";
import { getProgressFunnel } from "@/lib/supabase/progress-funnel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The Progress pipeline for /admin/seo. Everything comes from this site's
// own project; see lib/supabase/progress-funnel.ts. Protected by proxy.ts.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const daysParam = Number(searchParams.get("days"));
    const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 30;
    return NextResponse.json(await getProgressFunnel(days));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

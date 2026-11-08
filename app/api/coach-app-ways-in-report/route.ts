import { NextResponse } from "next/server";
import { getCoachAppWaysIn } from "@/lib/coach-app-ways-in";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Backs the "Ways in" section of the Coach App tab on /admin/seo: Search
// Console for the Coach App's pages, Google Ads for its campaigns and Play
// installs. Protected by proxy.ts, same as the other *-report routes.
export async function GET() {
  try {
    return NextResponse.json(await getCoachAppWaysIn());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

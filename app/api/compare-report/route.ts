import { NextResponse } from "next/server";
import { comparePeriods } from "@/lib/gsc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Protected by proxy.ts (/admin path family + this route is added to its
// matcher). Thin wrapper around lib/gsc.ts comparePeriods, the same
// function the compare_search_console_periods MCP tool uses - lets
// /admin/seo answer "why was day A different from day B" without needing
// the claude.ai MCP connector.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startA = searchParams.get("startA");
    const endA = searchParams.get("endA");
    const startB = searchParams.get("startB");
    const endB = searchParams.get("endB");

    if (!startA || !endA || !startB || !endB) {
      return NextResponse.json(
        { error: "startA, endA, startB, endB are all required (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const comparison = await comparePeriods(startA, endA, startB, endB);
    return NextResponse.json(comparison);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

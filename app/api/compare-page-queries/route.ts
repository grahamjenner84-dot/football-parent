import { NextResponse } from "next/server";
import { comparePageQueries } from "@/lib/gsc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Drill-down for the "Compare days" tab's Pages view: given a page and the
// same two periods already being compared, returns every query that page
// had impressions for either day, with position A vs B and an up/down/
// new/lost direction. Protected by proxy.ts (/admin path family + this
// route is added to its matcher).
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page");
    const startA = searchParams.get("startA");
    const endA = searchParams.get("endA");
    const startB = searchParams.get("startB");
    const endB = searchParams.get("endB");

    if (!page || !startA || !endA || !startB || !endB) {
      return NextResponse.json(
        { error: "page, startA, endA, startB, endB are all required" },
        { status: 400 }
      );
    }

    const queries = await comparePageQueries(page, startA, endA, startB, endB);
    return NextResponse.json({ page, queries });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { logSearchQuery } from "@/lib/supabase/search-log";
import { isPreviewDeployment } from "@/lib/owner-request";

const MAX_QUERY_LENGTH = 200;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const resultCount = Number.isFinite(body.resultCount) ? Number(body.resultCount) : 0;

    if (!query) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    // A preview writes to the live table too. See lib/owner-request.ts.
    if (!isPreviewDeployment()) {
      await logSearchQuery(query.slice(0, MAX_QUERY_LENGTH), resultCount);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { recheckBacklog } from "@/lib/supabase/outreach";

// Admin-only (guarded in proxy.ts). Re-runs the current URL rules over the
// backlog and moves anything they now reject to Ruled out, with the reason.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    return NextResponse.json({ moved: await recheckBacklog() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

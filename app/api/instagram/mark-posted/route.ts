import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/render-pipeline";
import { getAccountCredentials } from "@/lib/instagram/publish-pipeline";
import { markManualReelPosted } from "@/lib/instagram/review-pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { postId?: string; permalink?: string; skipMatch?: boolean };
    if (!body.postId) {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }
    if (!body.skipMatch && !body.permalink?.trim()) {
      return NextResponse.json({ error: "permalink is required unless skipMatch is set" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const creds = await getAccountCredentials(supabase);
    const result = await markManualReelPosted(supabase, creds, body.postId, body.permalink?.trim() ?? "", { skipMatch: body.skipMatch });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

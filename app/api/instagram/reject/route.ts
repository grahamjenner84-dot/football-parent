import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/render-pipeline";
import { rejectPost } from "@/lib/instagram/review-pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { postId?: string; reason?: string };
    if (!body.postId) {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    await rejectPost(supabase, body.postId, body.reason?.trim() || null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

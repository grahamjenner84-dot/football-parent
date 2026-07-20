import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/render-pipeline";
import { getAccountCredentials } from "@/lib/instagram/publish-pipeline";
import { schedulePosts, ApprovalItem } from "@/lib/instagram/review-pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { items?: ApprovalItem[] };
    if (!Array.isArray(body.items) || !body.items.length) {
      return NextResponse.json({ error: "items must be a non-empty array" }, { status: 400 });
    }
    for (const item of body.items) {
      if (!item.postId || (item.mode !== "auto" && item.mode !== "manual")) {
        return NextResponse.json({ error: "Each item needs postId and mode 'auto'|'manual'" }, { status: 400 });
      }
      if (item.mode === "manual" && !item.manualTime) {
        return NextResponse.json({ error: `Post ${item.postId}: manualTime is required in manual mode` }, { status: 400 });
      }
    }

    const supabase = createAdminClient();
    const { accountRowId } = await getAccountCredentials(supabase);
    const results = await schedulePosts(supabase, accountRowId, body.items);
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

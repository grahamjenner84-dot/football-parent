import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/render-pipeline";
import { getPostsReadyForReview } from "@/lib/instagram/review-pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const posts = await getPostsReadyForReview(supabase);
    return NextResponse.json({ posts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

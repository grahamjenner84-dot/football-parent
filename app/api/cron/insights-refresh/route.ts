import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/render-pipeline";
import { getDueRefreshPulls } from "@/lib/instagram/insights-pipeline";
import { runInsightsBatch } from "@/lib/instagram/insights-flow";
import { getAccountCredentials, ensureValidToken, TokenError } from "@/lib/instagram/publish-flow";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The daily refresh: re-pulls every post under 30 days old into its
// "current" row (see getDueRefreshPulls() in lib/instagram/insights-pipeline.ts).
// Its own cron (vercel.json, 04:00 UTC) an hour after /api/cron/insights, so
// the two never share one 60s budget. A pull is about 2s (up to five Graph
// requests), so four at a time covers 40 posts in roughly 20s.
async function handle(req: NextRequest) {
  if (!isAuthorizedCronRequest(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  let creds;
  try {
    const rawCreds = await getAccountCredentials(supabase);
    creds = await ensureValidToken(supabase, rawCreds);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[cron/insights-refresh] token error, skipping this run entirely: ${message}`);
    return NextResponse.json({ error: message, tokenError: err instanceof TokenError }, { status: 502 });
  }

  const due = await getDueRefreshPulls(supabase, 40);
  console.log(`[cron/insights-refresh] ${due.length} post(s) to refresh`);

  if (!due.length) {
    return NextResponse.json({ pulled: 0, deferred: 0, failed: 0, results: [] });
  }

  const summary = await runInsightsBatch(supabase, due, creds, 4);
  console.log(`[cron/insights-refresh] done: pulled=${summary.pulled} deferred=${summary.deferred} failed=${summary.failed}`);

  return NextResponse.json(summary);
}

export { handle as GET, handle as POST };

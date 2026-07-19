import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/render-pipeline";
import { getDueInsightsPulls } from "@/lib/instagram/insights-pipeline";
import { runInsightsBatch } from "@/lib/instagram/insights-flow";
import { getAccountCredentials, ensureValidToken, TokenError } from "@/lib/instagram/publish-flow";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Pull windows are hour-granularity (see getPullWindows() in
// lib/instagram/insights-pipeline.ts), so an hourly cron tick (vercel.json)
// is plenty - unlike /api/cron/publish this isn't racing a scheduled_time,
// just checking whether enough time has passed since publish.
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
    // Account/token-level failure - deliberately does not touch any
    // post_metrics row, same reasoning as /api/cron/publish: every due
    // pull just gets retried next tick once the token is fixed.
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[cron/insights] token error, skipping this run entirely: ${message}`);
    return NextResponse.json({ error: message, tokenError: err instanceof TokenError }, { status: 502 });
  }

  const due = await getDueInsightsPulls(supabase, 20);
  console.log(`[cron/insights] ${due.length} pull(s) due`);

  if (!due.length) {
    return NextResponse.json({ pulled: 0, deferred: 0, failed: 0, results: [] });
  }

  const summary = await runInsightsBatch(supabase, due, creds);
  console.log(`[cron/insights] done: pulled=${summary.pulled} deferred=${summary.deferred} failed=${summary.failed}`);

  return NextResponse.json(summary);
}

export { handle as GET, handle as POST };

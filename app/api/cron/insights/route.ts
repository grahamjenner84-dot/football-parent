import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/render-pipeline";
import { getDueInsightsPulls } from "@/lib/instagram/insights-pipeline";
import { discoverMedia } from "@/lib/instagram/discover-media";
import { recordAccountDaily, AccountDailyResult } from "@/lib/instagram/account-daily";
import { runInsightsBatch } from "@/lib/instagram/insights-flow";
import { getAccountCredentials, ensureValidToken, TokenError } from "@/lib/instagram/publish-flow";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Pull windows are hour-granularity (see getPullWindows() in
// lib/instagram/insights-pipeline.ts), so a daily cron tick (vercel.json,
// 03:00 UTC) is enough - unlike /api/cron/publish this isn't racing a scheduled_time,
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

  // Pick up posts made by hand in the app, so they get measured too. A
  // failure here mustn't stop the pulls for posts already known.
  let discovered: { onAccount: number; added: number } | { error: string };
  try {
    discovered = await discoverMedia(supabase, creds);
    console.log(`[cron/insights] discovery: ${discovered.onAccount} on account, ${discovered.added} new`);
  } catch (err) {
    discovered = { error: err instanceof Error ? err.message : String(err) };
    console.error(`[cron/insights] discovery failed, pulling known posts only: ${discovered.error}`);
  }

  // Whole-account numbers for yesterday (follower count, reach and views
  // split by followers vs non-followers, bio-link taps, follows), plus up to
  // five missing days from the last 30 filled in. Same rule:
  // a failure here doesn't stop the per-post pulls.
  let account: AccountDailyResult | { error: string };
  try {
    account = await recordAccountDaily(supabase, creds);
    console.log(`[cron/insights] account daily: ${JSON.stringify(account)}`);
  } catch (err) {
    account = { error: err instanceof Error ? err.message : String(err) };
    console.error(`[cron/insights] account daily failed: ${account.error}`);
  }

  // Each pull is now up to five requests (fallbacks plus two breakdowns),
  // so 15 per run keeps well inside maxDuration.
  const due = await getDueInsightsPulls(supabase, 15);
  console.log(`[cron/insights] ${due.length} pull(s) due`);

  if (!due.length) {
    return NextResponse.json({ discovered, account, pulled: 0, deferred: 0, failed: 0, results: [] });
  }

  const summary = await runInsightsBatch(supabase, due, creds);
  console.log(`[cron/insights] done: pulled=${summary.pulled} deferred=${summary.deferred} failed=${summary.failed}`);

  return NextResponse.json({ discovered, account, ...summary });
}

export { handle as GET, handle as POST };

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/render-pipeline";
import { getPostsDueToPublish } from "@/lib/instagram/publish-pipeline";
import { getAccountCredentials, ensureValidToken, runPublishBatch, isDryRun, TokenError } from "@/lib/instagram/publish-flow";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Kept within the Vercel Hobby-plan 60s hard cap for function duration (Pro
// allows more, but this works on either) - see POLL_BUDGET_MS in
// lib/instagram/publish-flow.ts for why a single invocation never needs
// more than that: a still-processing reel just gets picked up again next
// cron tick rather than blocking this request.
export const maxDuration = 60;

// Instagram has no native scheduling - this endpoint IS the scheduler.
// Triggered by vercel.json's cron entry (every 15 min); auth is a plain
// shared-secret bearer check (see lib/cron-auth.ts) rather than something
// Vercel-cron-specific, so the exact same endpoint also works behind an
// external scheduler (e.g. GitHub Actions) if the project ever ends up on a
// Vercel plan whose Cron Jobs feature doesn't support sub-daily schedules.
async function handle(req: NextRequest) {
  if (!isAuthorizedCronRequest(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = isDryRun();
  const supabase = createAdminClient();

  let creds;
  try {
    const rawCreds = await getAccountCredentials(supabase);
    creds = await ensureValidToken(supabase, rawCreds);
  } catch (err) {
    // Account/token-level failure - deliberately does NOT touch any post's
    // status. Every due post stays 'scheduled' so the very next cron tick
    // retries automatically once the token is fixed, instead of requiring
    // every affected post to be manually reset.
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[cron/publish] token error, skipping this run entirely: ${message}`);
    return NextResponse.json({ error: message, tokenError: err instanceof TokenError }, { status: 502 });
  }

  const posts = await getPostsDueToPublish(supabase, 5);
  console.log(`[cron/publish] dryRun=${dryRun} - ${posts.length} post(s) due`);

  if (!posts.length) {
    return NextResponse.json({ dryRun, published: 0, dryRunReady: 0, stillProcessing: 0, deferred: 0, failed: 0, results: [] });
  }

  const summary = await runPublishBatch(supabase, posts, creds, dryRun);
  console.log(
    `[cron/publish] done: published=${summary.published} dryRunReady=${summary.dryRunReady} stillProcessing=${summary.stillProcessing} deferred=${summary.deferred} failed=${summary.failed}`
  );

  return NextResponse.json({ dryRun, ...summary });
}

export { handle as GET, handle as POST };

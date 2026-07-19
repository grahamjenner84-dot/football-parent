import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSeoReport } from "@/lib/gsc";
import { runIdeationBatch } from "@/lib/instagram/ideation-flow";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// NOT YET SCHEDULED - deliberately absent from vercel.json's crons list.
// Run `npm run ideation` locally first and review the batch it produces;
// only add a weekly entry here (GSC data moves slowly, so weekly is plenty)
// once the selection and extraction quality has been checked by hand.
async function handle(req: NextRequest) {
  if (!isAuthorizedCronRequest(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  const report = await getSeoReport();
  const results = await runIdeationBatch(supabase, report);

  const summary = {
    queued: results.filter((r) => r.status === "queued").length,
    skipped_no_article: results.filter((r) => r.status === "skipped_no_article").length,
    skipped_duplicate: results.filter((r) => r.status === "skipped_duplicate").length,
    skipped_not_grounded: results.filter((r) => r.status === "skipped_not_grounded").length,
    errors: results.filter((r) => r.status === "error").length,
    results: results.map((r) => ({ pathname: r.opportunity.pathname, status: r.status, queueItemId: r.queueItemId, error: r.error })),
  };
  console.log(`[cron/ideation] queued=${summary.queued} no_article=${summary.skipped_no_article} duplicate=${summary.skipped_duplicate} not_grounded=${summary.skipped_not_grounded} errors=${summary.errors}`);

  return NextResponse.json(summary);
}

export { handle as GET, handle as POST };

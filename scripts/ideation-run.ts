#!/usr/bin/env tsx
/**
 * Local equivalent of the /api/cron/ideation route (not yet wired into
 * vercel.json - see app/api/cron/ideation/route.ts comment). Run this
 * manually to review a batch of GSC-derived content ideas before trusting
 * the job to run unattended.
 *
 *   npm run ideation
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "./lib/load-env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
loadEnvLocal(REPO_ROOT);

import { createClient } from "@supabase/supabase-js";
import { getSeoReport } from "../lib/gsc";
import { runIdeationBatch } from "../lib/instagram/ideation-flow";

function requireEnv(name: string): void {
  if (!process.env[name]) {
    console.error(`Missing ${name} - check .env.local`);
    process.exitCode = 1;
    throw new Error(`Missing ${name}`);
  }
}

async function main() {
  for (const name of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY", "GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", "GSC_SITE_URL"]) {
    requireEnv(name);
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  console.log("Fetching live GSC data...");
  const report = await getSeoReport();
  console.log(
    `Report period ${report.periodStart} to ${report.periodEnd}: ${report.lowCtr.length} low-CTR pages, ${report.strikingDistance.length} striking-distance queries, ${report.rankTracker.length} rank-tracker rows.\n`
  );

  console.log("Selecting and extracting opportunities...\n");
  const results = await runIdeationBatch(supabase, report);

  let queued = 0;
  for (const r of results) {
    console.log(`--- ${r.opportunity.pathname} (score ${r.opportunity.score.toFixed(0)}, ${r.opportunity.dominantType}) ---`);
    console.log(`  Rationale: ${r.opportunity.rationale}`);
    console.log(`  Queries: ${r.opportunity.queries.map((q) => q.query).join(", ")}`);

    switch (r.status) {
      case "queued":
        queued++;
        console.log(`  QUEUED -> content_queue id ${r.queueItemId}`);
        console.log(`  Topic:\n${r.topic!.split("\n").map((l) => "    " + l).join("\n")}`);
        break;
      case "skipped_no_article":
        console.log(`  SKIPPED: no matching content/<category>/<slug>.mdx file for this path.`);
        break;
      case "skipped_duplicate":
        console.log(`  SKIPPED: already queued a gsc-sourced item for this page recently.`);
        break;
      case "skipped_not_grounded":
        console.log(`  SKIPPED: extraction wasn't grounded in the article, or produced <2 points.`);
        if (r.extraction) console.log(`    hook: ${r.extraction.hook} | points: ${r.extraction.points.length} | grounded: ${r.extraction.grounded}`);
        break;
      case "error":
        console.log(`  ERROR: ${r.error}`);
        break;
    }
    console.log("");
  }

  console.log(`Done. ${queued} of ${results.length} shortlisted opportunities queued.`);
  if (results.length === 0) {
    console.log("No opportunities scored above zero - check the underlying GSC report has data, or loosen IDEATION_* thresholds.");
  }
}

main().catch((err) => {
  console.error("ideation-run crashed:", err instanceof Error ? err.stack ?? err.message : err);
  process.exitCode = 1;
});

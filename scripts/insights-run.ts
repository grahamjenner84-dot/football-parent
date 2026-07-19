#!/usr/bin/env tsx
/**
 * Local equivalent of the /api/cron/insights route, for testing the
 * insights-pull flow without deploying. Same underlying lib/instagram/*
 * code the deployed cron endpoint calls.
 *
 *   npm run insights
 *
 * This is also the LIVE CONFIRMATION step for Phase C: once Meta's
 * platform outage clears, running this against a real published post (one
 * of the 23 existing ones, once its 'initial' 60h window is due - or with
 * INSIGHTS_PULL_WINDOWS temporarily set to something already-elapsed for a
 * one-off manual check) is what proves the real graph.instagram.com
 * insights read + post_metrics write works end-to-end, not just against
 * the mocked responses in tests/insights-*.test.ts.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "./lib/load-env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
loadEnvLocal(REPO_ROOT);

import { createAdminClient } from "../lib/supabase/render-pipeline";
import { getDueInsightsPulls } from "../lib/instagram/insights-pipeline";
import { runInsightsBatch } from "../lib/instagram/insights-flow";
import { getAccountCredentials, ensureValidToken } from "../lib/instagram/publish-flow";

async function main() {
  const supabase = createAdminClient();
  const rawCreds = await getAccountCredentials(supabase);
  const creds = await ensureValidToken(supabase, rawCreds);

  const due = await getDueInsightsPulls(supabase, 20);
  if (!due.length) {
    console.log("Nothing due - no published post has crossed a pull window (see getPullWindows() in lib/instagram/insights-pipeline.ts) without an existing post_metrics row.");
    return;
  }
  console.log(`Found ${due.length} due pull(s):`);
  for (const d of due) console.log(`  post ${d.post.id} (${d.post.format}) -> window "${d.window.label}"`);

  const summary = await runInsightsBatch(supabase, due, creds);
  console.log(`\nDone. Pulled: ${summary.pulled}, Deferred (transient/outage): ${summary.deferred}, Failed: ${summary.failed}.`);
  if (summary.failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("insights-run crashed:", err instanceof Error ? err.stack ?? err.message : err);
  process.exitCode = 1;
});

#!/usr/bin/env tsx
/**
 * Local equivalent of the /api/cron/publish route, for testing the publish
 * flow without deploying. Same underlying lib/instagram/* code the deployed
 * cron endpoint calls.
 *
 *   npm run publish             # DRY_RUN defaults to on - safe
 *   DRY_RUN=false npm run publish   # goes live - only run this deliberately
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "./lib/load-env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
loadEnvLocal(REPO_ROOT);

import { createAdminClient } from "../lib/supabase/render-pipeline";
import { getPostsDueToPublish } from "../lib/instagram/publish-pipeline";
import { getAccountCredentials, ensureValidToken, runPublishBatch, isDryRun } from "../lib/instagram/publish-flow";

async function main() {
  const dryRun = isDryRun();
  console.log(dryRun ? "DRY RUN - no media_publish calls will be made.\n" : "!!! LIVE MODE - this will publish to Instagram !!!\n");

  const supabase = createAdminClient();
  const rawCreds = await getAccountCredentials(supabase);
  const creds = await ensureValidToken(supabase, rawCreds);

  const posts = await getPostsDueToPublish(supabase, 5);
  if (!posts.length) {
    console.log("Nothing due to publish - no posts with status='scheduled' and scheduled_time in the past.");
    return;
  }
  console.log(`Found ${posts.length} post(s) due to publish.\n`);

  const summary = await runPublishBatch(supabase, posts, creds, dryRun);

  console.log(
    `\nDone. Published: ${summary.published}, Dry-run-ready: ${summary.dryRunReady}, Still processing: ${summary.stillProcessing}, Deferred (transient/outage): ${summary.deferred}, Failed: ${summary.failed}.`
  );
  if (summary.failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("publish-run crashed:", err instanceof Error ? err.stack ?? err.message : err);
  process.exitCode = 1;
});

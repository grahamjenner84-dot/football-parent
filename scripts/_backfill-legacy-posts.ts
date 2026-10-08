#!/usr/bin/env tsx
/**
 * One-off (but safely re-runnable) backfill: the account has posts
 * published directly on Instagram before this pipeline existed, so
 * `posts` has no row for them - which means the insights collector
 * (lib/instagram/insights-pipeline.ts) has nothing to key off, since
 * post_metrics.post_id is a NOT NULL FK to posts(id).
 *
 * This inserts one minimal `posts` row per real media item: ig_media_id,
 * format (reel vs carousel/feed, inferred from Instagram's own
 * media_type/media_product_type), status='published' (so the publisher's
 * getPostsDueToPublish - which only ever looks at status='scheduled' -
 * never touches these), and published_at from Instagram's real timestamp
 * (so getDueInsightsPulls' window math is correct from the start, not
 * "due immediately" for everything). content_queue_id, render_payload
 * (defaults to '{}'), and post_slides are deliberately left
 * empty/untouched - these are historical posts made outside the system,
 * not pipeline-rendered ones, and nothing in the insights path needs a
 * content_type, a queue link, or slides to pull metrics for a post it
 * already has an ig_media_id for.
 *
 * Idempotent via upsert against the posts_ig_media_id_key unique
 * constraint (see 20260722100000_posts_ig_media_id_unique.sql) with
 * ignoreDuplicates - re-running this after new historical posts appear
 * only inserts the new ones.
 *
 *   npx tsx scripts/_backfill-legacy-posts.ts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "./lib/load-env";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
loadEnvLocal(REPO_ROOT);

import { createAdminClient } from "../lib/supabase/render-pipeline";
import { getAccountCredentials, ensureValidToken } from "../lib/instagram/publish-flow";
import { discoverMedia } from "../lib/instagram/discover-media";

// The same discovery now runs at the start of every /api/cron/insights run
// (lib/instagram/discover-media.ts); this script is for running it by hand.
async function main() {
  const supabase = createAdminClient();
  const rawCreds = await getAccountCredentials(supabase);
  const creds = await ensureValidToken(supabase, rawCreds);
  const { onAccount, added } = await discoverMedia(supabase, creds);
  console.log(`${onAccount} media item(s) on the account, ${added} new post row(s) added.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

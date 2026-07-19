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

const GRAPH_API_VERSION = process.env.IG_GRAPH_API_VERSION || "v23.0";

interface IgMedia {
  id: string;
  media_type: string;
  media_product_type?: string;
  caption?: string;
  timestamp: string;
  permalink: string;
}

function buildMediaListUrl(igUserId: string, accessToken: string): string {
  const u = new URL(`https://graph.instagram.com/${GRAPH_API_VERSION}/${igUserId}/media`);
  u.searchParams.set("fields", "id,media_type,media_product_type,caption,timestamp,permalink");
  u.searchParams.set("limit", "50");
  u.searchParams.set("access_token", accessToken);
  return u.toString();
}

async function fetchAllMedia(igUserId: string, accessToken: string): Promise<IgMedia[]> {
  const all: IgMedia[] = [];
  let nextUrl: string | null = buildMediaListUrl(igUserId, accessToken);

  while (nextUrl) {
    const res: Response = await fetch(nextUrl);
    const json = await res.json();
    if (!res.ok || json.error) throw new Error(`media list failed: ${JSON.stringify(json)}`);
    all.push(...json.data);
    nextUrl = json.paging?.next ?? null;
  }
  return all;
}

// Mirrors the same reel-vs-everything-else split the publisher already
// uses (single images and carousels both get format='carousel' - there is
// no separate 'single_image' format in the schema).
function formatFor(m: IgMedia): "reel" | "carousel" {
  return m.media_product_type === "REELS" || m.media_type === "VIDEO" ? "reel" : "carousel";
}

async function main() {
  const supabase = createAdminClient();
  const rawCreds = await getAccountCredentials(supabase);
  const creds = await ensureValidToken(supabase, rawCreds);

  const media = await fetchAllMedia(creds.igUserId, creds.accessToken);
  const reelCount = media.filter((m) => formatFor(m) === "reel").length;
  console.log(`Fetched ${media.length} real media item(s): ${reelCount} reel(s), ${media.length - reelCount} carousel/feed post(s).`);

  const rows = media.map((m) => ({
    account_id: creds.accountRowId,
    content_queue_id: null,
    format: formatFor(m),
    caption: m.caption ?? null,
    scheduled_time: m.timestamp,
    status: "published" as const,
    ig_media_id: m.id,
    published_at: m.timestamp,
  }));

  const { data, error } = await supabase.from("posts").upsert(rows, { onConflict: "ig_media_id", ignoreDuplicates: true }).select("id, ig_media_id");
  if (error) throw new Error(`backfill upsert failed: ${error.message}`);

  console.log(`\nUpsert returned ${data?.length ?? 0} row(s) (ignoreDuplicates means already-backfilled posts are silently skipped, not returned).`);
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

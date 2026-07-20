#!/usr/bin/env tsx
/**
 * Lists recent Phase G rejections with their (optional) reasons, so they can
 * be periodically read and folded into Phase F's prompt templates by hand -
 * see review-pipeline.ts's rejectPost(), which stores the reason in
 * posts.error_message when a post is rejected (status='rejected').
 *
 * This is a manual review tool, not an automated feedback loop: it only
 * reads and prints. Nothing here writes anything back or feeds Phase F
 * automatically - see the Phase G task brief: "This does NOT need to feed
 * back into F automatically - it's for me to review and act on manually."
 *
 *   npm run rejections                  # last 30 days, all content types
 *   npm run rejections -- --days=7
 *   npm run rejections -- --type=joke
 *   npm run rejections -- --reasons-only   # skip rejections with no reason given
 *
 * Not scheduled - manual command only, same as scripts/qc-run.ts and
 * scripts/copy-run.ts.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "./lib/load-env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
loadEnvLocal(REPO_ROOT);

import { createClient } from "@supabase/supabase-js";

function argValue(flag: string): string | undefined {
  const prefix = `--${flag}=`;
  return process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);
}
function hasFlag(flag: string): boolean {
  return process.argv.includes(`--${flag}`);
}

function requireEnv(name: string): void {
  if (!process.env[name]) {
    console.error(`Missing ${name} - check .env.local`);
    process.exitCode = 1;
    throw new Error(`Missing ${name}`);
  }
}

interface RejectedPostRow {
  id: string;
  content_type: string | null;
  format: string;
  hook_text: string | null;
  caption: string | null;
  error_message: string | null;
  created_at: string;
  content_queue_id: string | null;
}

async function main() {
  for (const name of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) requireEnv(name);

  const days = argValue("days") ? Number(argValue("days")) : 30;
  const contentType = argValue("type");
  const reasonsOnly = hasFlag("reasons-only");

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from("posts")
    .select("id, content_type, format, hook_text, caption, error_message, created_at, content_queue_id")
    .eq("status", "rejected")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false });
  if (contentType) query = query.eq("content_type", contentType);

  const { data: rows, error } = await query;
  if (error) throw new Error("Failed to query rejected posts: " + error.message);

  let posts = (rows ?? []) as RejectedPostRow[];
  if (reasonsOnly) posts = posts.filter((p) => p.error_message && p.error_message.trim());

  if (posts.length === 0) {
    console.log(`No rejections found in the last ${days} day(s)${contentType ? ` for content_type=${contentType}` : ""}.`);
    return;
  }

  // One extra query for topics (content_queue.topic) rather than a join -
  // keeps this a plain read against two tables Supabase-js can query
  // separately without needing a foreign-table select string kept in sync
  // with schema changes.
  const queueIds = [...new Set(posts.map((p) => p.content_queue_id).filter((id): id is string => !!id))];
  const topicById = new Map<string, string>();
  if (queueIds.length) {
    const { data: queueRows, error: queueError } = await supabase.from("content_queue").select("id, topic").in("id", queueIds);
    if (queueError) throw new Error("Failed to look up content_queue topics: " + queueError.message);
    for (const q of queueRows ?? []) topicById.set(q.id, q.topic);
  }

  console.log(`${posts.length} rejection(s) in the last ${days} day(s)${contentType ? ` (content_type=${contentType})` : ""}:\n`);

  const withReason = posts.filter((p) => p.error_message && p.error_message.trim());
  for (const post of posts) {
    const when = new Date(post.created_at).toISOString().slice(0, 16).replace("T", " ");
    const topic = post.content_queue_id ? topicById.get(post.content_queue_id) : null;
    const topicLine = topic ? topic.split("\n")[0] : "(no linked content_queue topic)";
    console.log(`${"=".repeat(72)}`);
    console.log(`${when}  ${post.content_type ?? "?"}/${post.format}  post ${post.id}`);
    console.log(`  topic/hook: ${topicLine || post.hook_text || "(none)"}`);
    console.log(`  reason: ${post.error_message?.trim() || "(none given)"}`);
  }

  console.log(`\n${"=".repeat(72)}`);
  console.log(`${withReason.length}/${posts.length} rejection(s) had a reason recorded.`);
  if (withReason.length < posts.length) {
    console.log(`Tip: rerun with --reasons-only to hide the ones with no reason.`);
  }
}

main().catch((err) => {
  console.error("review-rejections crashed:", err instanceof Error ? err.stack ?? err.message : err);
  process.exitCode = 1;
});

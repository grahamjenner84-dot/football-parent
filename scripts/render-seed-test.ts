#!/usr/bin/env tsx
/**
 * Inserts one test approved joke post (a simple 1-image carousel) so
 * `npm run render` has something real to render end-to-end. Safe to run
 * more than once - each run makes a new content_queue/posts row.
 *
 *   npm run render:seed-test
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "./lib/load-env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
loadEnvLocal(REPO_ROOT);

import { createAdminClient } from "../lib/supabase/render-pipeline";

async function main() {
  const supabase = createAdminClient();

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id, name")
    .ilike("name", "Football Parent")
    .maybeSingle();
  if (accountError) throw new Error("Failed to look up account: " + accountError.message);
  if (!account) throw new Error('No account found with name "Football Parent" - run the schema migration first');

  const { data: queueItem, error: queueError } = await supabase
    .from("content_queue")
    .insert({
      account_id: account.id,
      content_type: "joke",
      topic: "render-batch end-to-end test",
      source: "manual",
      status: "approved",
    })
    .select("id")
    .single();
  if (queueError) throw new Error("Failed to insert content_queue row: " + queueError.message);

  const scheduledTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      account_id: account.id,
      content_queue_id: queueItem.id,
      content_type: "joke",
      format: "carousel",
      caption: "Test render - safe to delete.",
      hook_text: "We have fixtures.",
      scheduled_time: scheduledTime,
      status: "approved",
      render_payload: {
        joke: {
          setup: "Football parents don't have weekends.",
          punch: "We have *fixtures*.",
          layout: "A",
        },
        platform: "ig",
      },
    })
    .select("id")
    .single();
  if (postError) throw new Error("Failed to insert posts row: " + postError.message);

  console.log("Seeded test content_queue item:", queueItem.id);
  console.log("Seeded test post (status=approved, awaiting render):", post.id);
  console.log("\nNow run: npm run render");
}

main().catch((err) => {
  console.error("render-seed-test failed:", err instanceof Error ? err.stack ?? err.message : err);
  process.exitCode = 1;
});

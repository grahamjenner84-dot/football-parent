#!/usr/bin/env tsx
/**
 * Inserts one test approved education (reel) post, so `npm run render` has
 * a real reel to exercise end-to-end (frame rendering + ffmpeg assembly +
 * optional audio mux). Mirrors render-seed-test.ts for the joke path.
 *
 *   npm run render:seed-test-reel
 *   npm run render:seed-test-reel -- --audio-url=https://.../tone.mp3
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "./lib/load-env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
loadEnvLocal(REPO_ROOT);

import { createAdminClient } from "../lib/supabase/render-pipeline";

function argValue(flag: string): string | undefined {
  const prefix = `--${flag}=`;
  return process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const audioUrl = argValue("audio-url") ?? null;
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
      content_type: "education",
      topic: "render-batch reel end-to-end test",
      source: "manual",
      status: "approved",
    })
    .select("id")
    .single();
  if (queueError) throw new Error("Failed to insert content_queue row: " + queueError.message);

  const scheduledTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const reel = {
    day: 1,
    slides: [
      { kind: "hook", head: "34 degrees.\nYour child still wants to play *football*.", secs: 3 },
      { kind: "content", num: 1, head: "Hydration starts the night before.", body: "Not in the car on the way there.", secs: 3 },
      { kind: "quote", head: "Calm is a *tactic*", body: "Your nerves travel straight to them", attrib: "a Premier League scout", secs: 4 },
      { kind: "cta", head: "", secs: 4 },
    ],
  };
  const brand = {
    saveLine: "Football parents — save this 👇",
    hookSubtitle: "Watch to the end for every tip",
    handle: "@footballparentuk",
    tiktokHandle: "@footballparent",
    ctaUrl: "footballparent.co.uk",
    ctaLines: "Practical tips for grassroots parents.\n- Save it for later\n- Send it to a football parent",
    marginTop: 250,
    marginX: 96,
    marginRight: 96,
    marginBottom: 220,
  };

  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      account_id: account.id,
      content_queue_id: queueItem.id,
      content_type: "education",
      format: "reel",
      caption: "Test reel render - safe to delete.",
      hook_text: reel.slides[0].head,
      scheduled_time: scheduledTime,
      status: "approved",
      render_payload: {
        reel,
        brand,
        templateId: "default",
        ...(audioUrl ? { audioUrl } : {}),
      },
    })
    .select("id")
    .single();
  if (postError) throw new Error("Failed to insert posts row: " + postError.message);

  console.log("Seeded test content_queue item:", queueItem.id);
  console.log("Seeded test reel post (status=approved, awaiting render):", post.id);
  console.log("Audio track:", audioUrl ?? "(none)");
  console.log("\nNow run: npm run render");
}

main().catch((err) => {
  console.error("render-seed-test-reel failed:", err instanceof Error ? err.stack ?? err.message : err);
  process.exitCode = 1;
});

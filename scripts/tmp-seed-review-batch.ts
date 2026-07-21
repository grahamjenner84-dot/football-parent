#!/usr/bin/env tsx
// THROWAWAY - generates the full review batch (joke reel, 3 education reels,
// 1 interview carousel) via the real Phase F functions, runs the real QC
// pipeline (Phase D, including the qualifier check), and seeds real
// content_queue + posts rows (status='approved', scheduled_time=null) so
// `npm run render` (the real Phase A script, unmodified) can render+upload
// them through the actual production pipeline. Dumps a JSON report of every
// item's full copy + QC verdict to stdout/file for review.
//
// Safety: scheduled_time is deliberately left null on every row. Per
// lib/instagram/review-pipeline.ts's getPostsReadyForReview() (status=
// 'scheduled' AND scheduled_time IS NULL) vs publish-pipeline.ts's
// getPostsDueToPublish() (status='scheduled' AND scheduled_time IS NOT
// NULL), a null scheduled_time is what makes a rendered post show up in the
// /admin/instagram-review queue AND makes it structurally impossible for
// the publish cron to ever select it - that only changes when a human hits
// "Approve & schedule" in the review UI, which this script never calls.
// Delete after use.

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "./lib/load-env";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
loadEnvLocal(REPO_ROOT);

import { createAdminClient } from "../lib/supabase/render-pipeline";
import { resolveArticle } from "../lib/instagram/ideation-flow";
import { generateJokeCarousel, generateEducationReel, generateInterviewCarousel, CopyGenerationResult } from "../lib/instagram/copy-flow";
import { runQcOnGeneratedCopy, CopyQcResult } from "../lib/instagram/copy-qc-adapter";
import type { Article } from "../lib/content";

interface ItemReport {
  label: string;
  contentType: "joke" | "education" | "interview";
  format: "reel" | "carousel";
  briefOrTheme: string;
  slides: unknown;
  caption: string;
  generationCost: number;
  qcCost: number;
  qcPassed: boolean;
  hardFails: string[];
  softFlags: string[];
  hookStrength: string | null;
  qualifierClaims: unknown;
  postId?: string;
  queueId?: string;
}

async function seedItem(
  supabase: ReturnType<typeof createAdminClient>,
  accountId: string,
  label: string,
  briefOrTheme: string,
  contentType: "joke" | "education" | "interview",
  format: "reel" | "carousel",
  result: CopyGenerationResult,
  qc: CopyQcResult
): Promise<ItemReport> {
  const hookSlide = result.slides.find((s) => s.kind === "hook");
  const hookText = hookSlide ? [hookSlide.head, hookSlide.body].filter(Boolean).join(" ") : null;

  const { data: queueItem, error: queueError } = await supabase
    .from("content_queue")
    .insert({
      account_id: accountId,
      content_type: contentType,
      topic: briefOrTheme,
      source: "manual",
      status: "approved",
    })
    .select("id")
    .single();
  if (queueError) throw new Error(`Failed to insert content_queue row for ${label}: ${queueError.message}`);

  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      account_id: accountId,
      content_queue_id: queueItem.id,
      content_type: contentType,
      format,
      caption: result.caption,
      hook_text: hookText,
      scheduled_time: null, // deliberate - see module comment
      status: "approved",
      render_payload: result.renderPayload,
    })
    .select("id")
    .single();
  if (postError) throw new Error(`Failed to insert posts row for ${label}: ${postError.message}`);

  console.error(`Seeded ${label}: content_queue=${queueItem.id} posts=${post.id}`);

  const qualifierClaims = qc.kind === "generic" ? qc.qualifierCheck?.claims ?? null : null;

  return {
    label,
    contentType,
    format,
    briefOrTheme,
    slides: result.slides,
    caption: result.caption,
    generationCost: result.usage.costUsd,
    qcCost: qc.apiCostUsd,
    qcPassed: qc.passed,
    hardFails: qc.hardFails,
    softFlags: qc.softFlags,
    hookStrength: qc.tier2?.hookStrength ?? null,
    qualifierClaims,
    postId: post.id,
    queueId: queueItem.id,
  };
}

async function main() {
  const supabase = createAdminClient();
  const { data: account, error: accountError } = await supabase.from("accounts").select("id, name").ilike("name", "Football Parent").maybeSingle();
  if (accountError) throw new Error("Failed to look up account: " + accountError.message);
  if (!account) throw new Error('No account found with name "Football Parent"');

  const reports: ItemReport[] = [];

  // 1. Joke reel - fresh theme, mixed entry styles (per prompt's own guidance).
  const jokeTheme = "the car park after training";
  console.error(`\n=== Joke reel: "${jokeTheme}" ===`);
  const jokeResult = await generateJokeCarousel(jokeTheme);
  const jokeQc = await runQcOnGeneratedCopy(jokeResult, null);
  reports.push(await seedItem(supabase, account.id, "joke-reel", jokeTheme, "joke", "reel", jokeResult, jokeQc));

  // 2. Education x3, steered per the user's specific angle feedback.
  const eduSpecs: Array<{ label: string; topic: string; articlePath: string }> = [
    {
      label: "education-footballs",
      articlePath: "/football-gear/best-footballs-by-age",
      topic:
        "Write about football ball sizes by age, but the hook must be about the RISK of using the wrong ball size - that it can actively harm a young player's technical development (bad habits, poor striking technique, wrong muscle memory), not just 'there's an official size chart'. Lead with the harm, then explain the size guidance as the fix.",
    },
    {
      label: "education-jpl",
      articlePath: "/parent-guides/what-is-the-junior-premier-league",
      topic:
        "Write about the Junior Premier League (JPL). The hook must be built around genuine intrigue/tension: is the JPL actually connected to the Premier League, and is it a real pathway into academy football, or does the name just imply that? Do not include a safeguarding checklist or list of things to check before signing up - that is reference/procedural content for the site article, not this social carousel. Keep every slide in hook/insight/payoff shape.",
    },
    {
      label: "education-academy-categories",
      articlePath: "/academy-pathway/academy-categories-explained",
      topic: "Write a standard, straightforward explainer of what Category 1 to 4 academy grading means for parents - no special angle steer, just accurate, well-grounded social copy.",
    },
  ];

  for (const spec of eduSpecs) {
    console.error(`\n=== Education: ${spec.label} ===`);
    const article = resolveArticle(spec.articlePath);
    if (!article) throw new Error(`--article ${spec.articlePath} did not resolve for ${spec.label}`);
    const result = await generateEducationReel(spec.topic, article);
    const qc = await runQcOnGeneratedCopy(result, article);
    reports.push(await seedItem(supabase, account.id, spec.label, spec.topic, "education", "reel", result, qc));
  }

  // 3. Interview carousel - Paul Barry, FutureFit article.
  console.error(`\n=== Interview: Paul Barry ===`);
  const interviewArticlePath = "/parent-guides/futurefit-football-dna-interview-part-1";
  const interviewArticle = resolveArticle(interviewArticlePath);
  if (!interviewArticle) throw new Error(`--article ${interviewArticlePath} did not resolve for interview`);
  const contributor = {
    name: "Paul Barry",
    role: "Head of Coaching, Content & Club Support, Football DNA",
    bio: "Paul Barry is Head of Coaching, Content & Club Support. He holds the UEFA A Licence, the FA Advanced Youth Award (U5-11s) and has more than 25 years' experience across grassroots and academy football. During his career he has worked with Southend United, Arsenal and Crystal Palace, where he served as Head of Coaching. He also worked as a Coach and Mentor for The Football Association through the FA Skills Programme.",
    photoUrl: dataUriForLocalImage(path.join(REPO_ROOT, "public", "images", "people", "paul-football-dna.png")),
  };
  const interviewResult = await generateInterviewCarousel(contributor, interviewArticle);
  const interviewQc = await runQcOnGeneratedCopy(interviewResult, interviewArticle);
  reports.push(
    await seedItem(supabase, account.id, "interview-paul-barry", interviewArticlePath, "interview", "carousel", interviewResult, interviewQc)
  );

  const outJson = path.join(REPO_ROOT, "tmp-renders", "review-batch-report.json");
  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.writeFileSync(outJson, JSON.stringify(reports, null, 2));
  console.error(`\nWrote report: ${outJson}`);
  console.error(`\nPost IDs seeded (all status='approved', scheduled_time=null - safe, not publish-eligible):`);
  for (const r of reports) console.error(`  ${r.label}: posts.id=${r.postId}`);
  console.error(`\nNow run: npm run render`);
}

function dataUriForLocalImage(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

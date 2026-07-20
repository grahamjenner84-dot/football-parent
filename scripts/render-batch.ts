#!/usr/bin/env tsx
/**
 * Phase A local batch renderer. Run by hand when you sit down to work:
 *
 *   npm run render
 *
 * Not a background process - it does one pass over posts.status='approved'
 * (payload ready, not yet rendered), renders each with the matching core
 * module, uploads the result to Supabase storage, writes the URL(s) back to
 * post_slides, and flips the post to status='scheduled' (rendered, ready to
 * publish) or 'failed'. See supabase/migrations/20260719140000_render_pipeline_payload.sql
 * for the render_payload shape per content_type, and lib/supabase/render-pipeline.ts
 * for the status semantics.
 *
 * Idempotent: only queries status='approved' posts, and within a post skips
 * any slide_order that already has an image_url/video_url (so a retry after
 * a partial failure doesn't re-render or re-upload finished slides).
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "./lib/load-env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
loadEnvLocal(REPO_ROOT);

import {
  createAdminClient,
  ensureRenderedBucket,
  getPostsAwaitingRender,
  markPostStatus,
  upsertPostSlide,
  uploadRenderedAsset,
  PostRow,
} from "../lib/supabase/render-pipeline";
import { renderSingleSlidePNG } from "../lib/renderers/single-slide-server";
import { renderReelSlidePNG, Core as ReelCore } from "../lib/renderers/reel-server";
import { renderExpertQuoteSlidePNG } from "../lib/renderers/expert-quote-server";
import { assembleSlideshowMp4, checkFfmpegAvailable, FFMPEG_INSTALL_HINT } from "../lib/renderers/assemble-video";

type RenderOutcome = "rendered" | "skipped";

function existingSlide(post: PostRow, slideOrder: number) {
  return post.post_slides.find((s) => s.slide_order === slideOrder) ?? null;
}

interface ReelVideoPayload {
  reel?: { day?: number; slides: Array<Record<string, unknown> & { kind: string; secs?: number }> };
  brand?: Record<string, unknown>;
  templateId?: string;
  bgUrlBySlide?: Record<number, string>;
  audioUrl?: string;
}

// Shared reel-core video assembly: render each slide as a frame, hold it
// for its own `secs`, concat into one MP4. Used by content_type='education'
// (always a reel) AND content_type='joke' when render_payload has a
// multi-slide `reel.slides` array - a joke SET (curiosity-gap title slide +
// numbered quote/reframe slides + BONUS slide + share-CTA closer, see
// copy-flow.ts's generateJokeCarousel) rather than a single joke - see
// renderJokePost's branch below. Both content types go through this exact
// same renderer/assembly path, only the slide content differs.
//
// audioUrl is only ever honoured if render_payload explicitly sets it.
// Phase F's joke-set generator never sets it, so joke reels render SILENT
// by design: these post through Phase G's manual mark-posted path, where a
// human adds trending audio in-app before posting - the Graph API has no
// way to attach a trending-audio track, and this renderer must never try.
async function renderReelVideoPost(
  supabase: ReturnType<typeof createAdminClient>,
  post: PostRow,
  payload: ReelVideoPayload,
  label: string
): Promise<RenderOutcome> {
  const existing = existingSlide(post, 1);
  if (existing?.video_url) return "skipped";
  if (!checkFfmpegAvailable()) throw new Error(FFMPEG_INSTALL_HINT);
  if (!payload.reel?.slides?.length) throw new Error(`render_payload.reel.slides is required for a ${label} post`);

  const brand = payload.brand ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const templates = ReelCore.builtinTemplates(null) as any[];
  const tpl = templates.find((t) => t.id === (payload.templateId ?? "default")) ?? templates[0];

  const frames = [];
  for (let i = 0; i < payload.reel.slides.length; i++) {
    const slide = payload.reel.slides[i];
    const layout = ReelCore.resolveLayout(slide.kind, tpl);
    const style = ReelCore.resolveStyle(tpl);
    const bgUrl = payload.bgUrlBySlide?.[i] ?? null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const png = await renderReelSlidePNG(slide as any, payload.reel as any, brand as never, layout as never, style, bgUrl);
    frames.push({ pngBuffer: png, durationSec: slide.secs ?? 3 });
  }

  const mp4 = await assembleSlideshowMp4(frames, { audioUrl: payload.audioUrl ?? null });
  const url = await uploadRenderedAsset(supabase, `${post.id}/reel.mp4`, mp4, "video/mp4");
  const durationSec = frames.reduce((sum, f) => sum + f.durationSec, 0);
  await upsertPostSlide(supabase, { post_id: post.id, slide_order: 1, video_url: url, text_content: post.caption ?? null, duration_sec: durationSec });
  return "rendered";
}

// content_type='joke' -> single-slide-core for a single joke (setup/punch,
// one image), OR the shared reel-core video path above for a multi-slide
// joke SET - distinguished by which field render_payload actually has
// (`joke` vs `reel`), the same distinction copy-flow.ts's two joke
// generators (generateJokeSingle / generateJokeCarousel) already produce.
async function renderJokePost(supabase: ReturnType<typeof createAdminClient>, post: PostRow): Promise<RenderOutcome> {
  const payload = post.render_payload as {
    joke?: { setup?: string; punch?: string; layout?: "A" | "C" };
    platform?: "ig" | "tiktok";
  } & ReelVideoPayload;

  if (payload.reel?.slides?.length) {
    return renderReelVideoPost(supabase, post, payload, "joke set");
  }

  const existing = existingSlide(post, 1);
  if (existing?.image_url) return "skipped";

  const joke = payload.joke;
  if (!joke || !joke.punch) throw new Error("render_payload.joke.punch is required for a joke post");

  const png = renderSingleSlidePNG({ setup: joke.setup, punch: joke.punch, layout: joke.layout }, payload.platform ?? "ig");
  const url = await uploadRenderedAsset(supabase, `${post.id}/slide-1.png`, png, "image/png");
  await upsertPostSlide(supabase, {
    post_id: post.id,
    slide_order: 1,
    image_url: url,
    text_content: [joke.setup, joke.punch].filter(Boolean).join(" / "),
  });
  return "rendered";
}

// content_type='education' -> reel-core, always a video.
async function renderEducationPost(supabase: ReturnType<typeof createAdminClient>, post: PostRow): Promise<RenderOutcome> {
  return renderReelVideoPost(supabase, post, post.render_payload as ReelVideoPayload, "education");
}

// content_type='interview' -> expert-quote-core. format='carousel' -> one
// image per slide; format='reel' -> frames assembled into one MP4, same as
// education (no per-slide `secs` in this data model, so secsPerSlide
// applies uniformly, default 3.5s).
async function renderInterviewPost(supabase: ReturnType<typeof createAdminClient>, post: PostRow): Promise<RenderOutcome> {
  const payload = post.render_payload as {
    slides?: Array<{ type: "cover" | "bio" | "qa" | "quote" | "cta"; i?: number }>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
    logoSrc?: string;
    bioSrc?: string;
    secsPerSlide?: number;
    audioUrl?: string;
  };
  if (!payload.slides?.length || !payload.data) throw new Error("render_payload.slides and .data are required for an interview post");

  if (post.format === "carousel") {
    let renderedAny = false;
    for (let i = 0; i < payload.slides.length; i++) {
      const order = i + 1;
      if (existingSlide(post, order)?.image_url) continue;
      const png = await renderExpertQuoteSlidePNG(payload.slides[i], payload.data, payload.logoSrc ?? null, payload.bioSrc ?? null);
      const url = await uploadRenderedAsset(supabase, `${post.id}/slide-${order}.png`, png, "image/png");
      await upsertPostSlide(supabase, { post_id: post.id, slide_order: order, image_url: url });
      renderedAny = true;
    }
    return renderedAny ? "rendered" : "skipped";
  }

  // format === 'reel'
  if (existingSlide(post, 1)?.video_url) return "skipped";
  if (!checkFfmpegAvailable()) throw new Error(FFMPEG_INSTALL_HINT);

  const secsPerSlide = payload.secsPerSlide ?? 3.5;
  const frames = [];
  for (const slide of payload.slides) {
    const png = await renderExpertQuoteSlidePNG(slide, payload.data, payload.logoSrc ?? null, payload.bioSrc ?? null);
    frames.push({ pngBuffer: png, durationSec: secsPerSlide });
  }
  const mp4 = await assembleSlideshowMp4(frames, { audioUrl: payload.audioUrl ?? null });
  const url = await uploadRenderedAsset(supabase, `${post.id}/reel.mp4`, mp4, "video/mp4");
  const durationSec = frames.reduce((sum, f) => sum + f.durationSec, 0);
  await upsertPostSlide(supabase, { post_id: post.id, slide_order: 1, video_url: url, text_content: post.caption ?? null, duration_sec: durationSec });
  return "rendered";
}

async function renderPost(supabase: ReturnType<typeof createAdminClient>, post: PostRow): Promise<RenderOutcome> {
  if (!post.content_type) throw new Error("post has no content_type set - cannot pick a render module");
  if (!post.render_payload || Object.keys(post.render_payload).length === 0) {
    throw new Error("post.render_payload is empty - nothing to render yet");
  }
  switch (post.content_type) {
    case "joke":
      return renderJokePost(supabase, post);
    case "education":
      return renderEducationPost(supabase, post);
    case "interview":
      return renderInterviewPost(supabase, post);
    default:
      throw new Error(`Unknown content_type: ${post.content_type}`);
  }
}

async function main() {
  const supabase = createAdminClient();
  await ensureRenderedBucket(supabase);

  const posts = await getPostsAwaitingRender(supabase);
  if (!posts.length) {
    console.log("Nothing to render - no posts with status='approved'.");
    return;
  }

  console.log(`Found ${posts.length} post(s) awaiting render.\n`);

  let rendered = 0;
  let skipped = 0;
  let failed = 0;

  for (const post of posts) {
    const label = `${post.content_type ?? "?"}/${post.format} ${post.id}`;
    try {
      const outcome = await renderPost(supabase, post);
      await markPostStatus(supabase, post.id, "scheduled");
      if (outcome === "rendered") {
        rendered++;
        console.log(`[rendered] ${label}`);
      } else {
        skipped++;
        console.log(`[skipped]  ${label} (already fully rendered)`);
      }
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[FAILED]   ${label}: ${message}`);
      try {
        await markPostStatus(supabase, post.id, "failed");
      } catch (markErr) {
        console.error(`  also failed to mark post ${post.id} as failed: ${markErr instanceof Error ? markErr.message : markErr}`);
      }
    }
  }

  console.log(`\nDone. Rendered: ${rendered}, Failed: ${failed}, Skipped: ${skipped}.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("render-batch crashed:", err instanceof Error ? err.stack ?? err.message : err);
  process.exitCode = 1;
});

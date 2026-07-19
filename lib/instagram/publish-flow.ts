import { SupabaseClient } from "@supabase/supabase-js";
import { PostRow, PostSlideRow } from "../supabase/render-pipeline";
import {
  createImageChildContainer,
  createSingleImageContainer,
  createCarouselContainer,
  createReelsContainer,
  getContainerStatus,
  publishContainer,
  validateToken,
  refreshLongLivedToken,
  withRetry,
  sleep,
  isTransientError,
  IgApiError,
  ContainerStatusCode,
  CreatedContainer,
} from "./graph-client";
import {
  AccountCredentials,
  getAccountCredentials,
  updateAccountToken,
  markPublished,
  markPublishFailed,
  saveParentContainerId,
  saveChildContainerId,
} from "./publish-pipeline";

const REELS_MAX_DURATION_SEC = 90;
const MAX_CAROUSEL_CHILDREN = 10;

// How long this single invocation is willing to spend polling one container
// before giving up and deferring to the next cron tick. Kept well under
// Vercel's Hobby-plan 60s hard cap on function duration regardless of what
// maxDuration is configured to, so this is safe on either plan - a reel
// that's still processing after this budget just gets picked up again next
// tick (still status='scheduled', container id already saved), which given
// a 15-minute cadence is a perfectly reasonable "backoff" in practice.
// Overridable via env so tests can run the poll loop in milliseconds instead
// of waiting on real 10s/45s delays - production defaults unchanged.
const POLL_BUDGET_MS = Number(process.env.PUBLISH_POLL_BUDGET_MS) || 45_000;
const POLL_INTERVAL_MS = Number(process.env.PUBLISH_POLL_INTERVAL_MS) || 10_000;

export class PublishError extends Error {}

// Not a failure - the container is still IN_PROGRESS and we've hit our
// per-invocation poll budget. The caller must leave the post's status
// untouched (still 'scheduled') so the next cron tick resumes polling the
// same container instead of failing or recreating it.
export class StillProcessingError extends Error {}

async function pollUntilResolved(containerId: string, accessToken: string): Promise<ContainerStatusCode> {
  const deadline = Date.now() + POLL_BUDGET_MS;
  for (;;) {
    // A transient blip on the status check itself (e.g. the same platform
    // hiccup that can hit any other call) shouldn't abort a poll loop that
    // would otherwise have resolved fine - retry a few times before giving
    // up this particular check.
    const status = await withRetry(() => getContainerStatus(containerId, accessToken), { retries: 2 });
    if (status.status_code !== "IN_PROGRESS") return status.status_code;
    if (Date.now() + POLL_INTERVAL_MS > deadline) return "IN_PROGRESS";
    await sleep(POLL_INTERVAL_MS);
  }
}

// Shared "reuse if finished, poll if in-progress, recreate if expired/error"
// logic used for child containers, carousel parents, single images, and
// reels alike - containers expire after 24h, and a crash mid-flow (or a
// reel whose processing outlives one invocation) must resume from whatever
// state Instagram itself reports, not from a locally-cached assumption.
async function ensureContainerFinished(opts: {
  existingContainerId: string | null;
  saveContainerId: (id: string | null) => Promise<void>;
  create: () => Promise<CreatedContainer>;
  accessToken: string;
  label: string;
}): Promise<string> {
  let containerId = opts.existingContainerId;

  if (containerId) {
    const status = await withRetry(() => getContainerStatus(containerId as string, opts.accessToken), { retries: 2 });
    if (status.status_code === "FINISHED") return containerId;
    if (status.status_code === "IN_PROGRESS") {
      const resolved = await pollUntilResolved(containerId, opts.accessToken);
      if (resolved === "FINISHED") return containerId;
      if (resolved === "IN_PROGRESS") throw new StillProcessingError(`${opts.label} still processing (container ${containerId})`);
      // EXPIRED or ERROR - fall through to recreate.
      containerId = null;
    } else {
      // EXPIRED or ERROR reported immediately.
      containerId = null;
    }
  }

  const created = await withRetry(opts.create);
  await opts.saveContainerId(created.id);
  const finalStatus = await pollUntilResolved(created.id, opts.accessToken);
  if (finalStatus === "IN_PROGRESS") throw new StillProcessingError(`${opts.label} still processing (container ${created.id})`);
  if (finalStatus !== "FINISHED") {
    throw new PublishError(`${opts.label} container ${created.id} ended in status ${finalStatus}`);
  }
  return created.id;
}

async function validateVideoUrl(videoUrl: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(videoUrl, { method: "HEAD" });
  } catch (err) {
    throw new PublishError(`Could not reach video_url ${videoUrl}: ${err instanceof Error ? err.message : err}`);
  }
  if (!res.ok) throw new PublishError(`video_url ${videoUrl} returned HTTP ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "";
  // This is a sanity check, not a codec inspection - the publish endpoint
  // runs in a serverless function with no ffmpeg available, so it cannot
  // ffprobe for H.264/AAC. It trusts Phase A's assembleSlideshowMp4 (always
  // libx264 + optional aac, muxed into an mp4 container) for anything this
  // pipeline rendered itself.
  if (!contentType.startsWith("video/")) {
    throw new PublishError(`video_url ${videoUrl} has content-type "${contentType}", expected video/*`);
  }
}

function resolveCaption(post: PostRow): string {
  return post.caption ?? post.hook_text ?? "";
}

export interface PublishOutcome {
  postId: string;
  outcome: "published" | "dry_run_ready" | "still_processing" | "deferred" | "failed";
  mediaId?: string;
  containerId?: string;
  error?: string;
}

async function publishSingleImage(
  supabase: SupabaseClient,
  post: PostRow,
  slide: PostSlideRow,
  creds: AccountCredentials,
  dryRun: boolean
): Promise<PublishOutcome> {
  if (!slide.image_url) throw new PublishError(`slide ${slide.id} has no image_url`);
  const caption = resolveCaption(post);

  const containerId = await ensureContainerFinished({
    existingContainerId: post.ig_container_id,
    saveContainerId: (id) => saveParentContainerId(supabase, post.id, id),
    create: () => createSingleImageContainer(creds.igUserId, creds.accessToken, slide.image_url as string, caption),
    accessToken: creds.accessToken,
    label: `post ${post.id} (single image)`,
  });

  if (dryRun) {
    console.log(`[DRY RUN] post ${post.id}: single-image container ${containerId} is FINISHED - would call media_publish now (caption: ${JSON.stringify(caption)})`);
    return { postId: post.id, outcome: "dry_run_ready", containerId };
  }

  const media = await withRetry(() => publishContainer(creds.igUserId, creds.accessToken, containerId));
  await markPublished(supabase, post.id, media.id);
  return { postId: post.id, outcome: "published", mediaId: media.id, containerId };
}

async function publishCarousel(
  supabase: SupabaseClient,
  post: PostRow,
  creds: AccountCredentials,
  dryRun: boolean
): Promise<PublishOutcome> {
  const slides = [...post.post_slides].sort((a, b) => a.slide_order - b.slide_order);
  if (slides.length === 0) throw new PublishError(`post ${post.id} has no post_slides to publish`);
  if (slides.length === 1) return publishSingleImage(supabase, post, slides[0], creds, dryRun);
  if (slides.length > MAX_CAROUSEL_CHILDREN) {
    throw new PublishError(`post ${post.id} has ${slides.length} slides, more than the ${MAX_CAROUSEL_CHILDREN}-child carousel limit`);
  }

  const childIds: string[] = [];
  for (const slide of slides) {
    if (!slide.image_url) throw new PublishError(`slide ${slide.id} (order ${slide.slide_order}) has no image_url`);
    const childId = await ensureContainerFinished({
      existingContainerId: slide.ig_child_container_id,
      saveContainerId: (id) => saveChildContainerId(supabase, slide.id, id),
      create: () => createImageChildContainer(creds.igUserId, creds.accessToken, slide.image_url as string),
      accessToken: creds.accessToken,
      label: `post ${post.id} slide ${slide.slide_order}`,
    });
    childIds.push(childId);
  }

  const caption = resolveCaption(post);
  const parentId = await ensureContainerFinished({
    existingContainerId: post.ig_container_id,
    saveContainerId: (id) => saveParentContainerId(supabase, post.id, id),
    create: () => createCarouselContainer(creds.igUserId, creds.accessToken, childIds, caption),
    accessToken: creds.accessToken,
    label: `post ${post.id} (carousel parent)`,
  });

  if (dryRun) {
    console.log(
      `[DRY RUN] post ${post.id}: carousel parent container ${parentId} is FINISHED (children: ${childIds.join(", ")}) - would call media_publish now (caption: ${JSON.stringify(caption)})`
    );
    return { postId: post.id, outcome: "dry_run_ready", containerId: parentId };
  }

  const media = await withRetry(() => publishContainer(creds.igUserId, creds.accessToken, parentId));
  await markPublished(supabase, post.id, media.id);
  return { postId: post.id, outcome: "published", mediaId: media.id, containerId: parentId };
}

async function publishReel(
  supabase: SupabaseClient,
  post: PostRow,
  creds: AccountCredentials,
  dryRun: boolean
): Promise<PublishOutcome> {
  const slide = post.post_slides.find((s) => s.slide_order === 1);
  if (!slide?.video_url) throw new PublishError(`post ${post.id} has no video_url on post_slides`);
  if (slide.duration_sec == null) {
    throw new PublishError(`post ${post.id} slide has no duration_sec recorded - cannot validate the ${REELS_MAX_DURATION_SEC}s Reels cap without it (re-render via npm run render)`);
  }
  if (slide.duration_sec > REELS_MAX_DURATION_SEC) {
    throw new PublishError(`post ${post.id} reel is ${slide.duration_sec}s, over the ${REELS_MAX_DURATION_SEC}s Reels cap`);
  }
  await validateVideoUrl(slide.video_url);

  const caption = resolveCaption(post);
  const containerId = await ensureContainerFinished({
    existingContainerId: post.ig_container_id,
    saveContainerId: (id) => saveParentContainerId(supabase, post.id, id),
    create: () => createReelsContainer(creds.igUserId, creds.accessToken, slide.video_url as string, caption),
    accessToken: creds.accessToken,
    label: `post ${post.id} (reel)`,
  });

  if (dryRun) {
    console.log(`[DRY RUN] post ${post.id}: reel container ${containerId} is FINISHED - would call media_publish now (caption: ${JSON.stringify(caption)})`);
    return { postId: post.id, outcome: "dry_run_ready", containerId };
  }

  const media = await withRetry(() => publishContainer(creds.igUserId, creds.accessToken, containerId));
  await markPublished(supabase, post.id, media.id);
  return { postId: post.id, outcome: "published", mediaId: media.id, containerId };
}

export async function publishPost(supabase: SupabaseClient, post: PostRow, creds: AccountCredentials, dryRun: boolean): Promise<PublishOutcome> {
  // Defensive guard against double-publish: if ig_media_id is already set,
  // this post was published by a prior run even if a crash happened before
  // the status write landed. Fix the status without calling the API again.
  if (post.ig_media_id) {
    if (post.status !== "published") {
      console.warn(`post ${post.id} already has ig_media_id=${post.ig_media_id} but status=${post.status} - correcting status without republishing`);
      await markPublished(supabase, post.id, post.ig_media_id);
    }
    return { postId: post.id, outcome: "published", mediaId: post.ig_media_id };
  }

  if (post.format === "carousel") return publishCarousel(supabase, post, creds, dryRun);
  if (post.format === "reel") return publishReel(supabase, post, creds, dryRun);
  throw new PublishError(`post ${post.id} has unknown format "${post.format}"`);
}

// Validates the current token with a live call; if it's dead, or close to
// its known expiry, attempts a refresh once and persists the result. Thrown
// errors here are account-level, not post-level - callers must NOT mark
// individual posts 'failed' for a token problem, since fixing the token and
// letting the next cron tick retry is the correct recovery, not requiring
// every affected post to be manually reset back to 'scheduled'.
export class TokenError extends Error {}

const REFRESH_IF_EXPIRING_WITHIN_MS = 10 * 24 * 60 * 60 * 1000; // 10 days

export async function ensureValidToken(supabase: SupabaseClient, creds: AccountCredentials): Promise<AccountCredentials> {
  const expiringSoon = creds.tokenExpiresAt != null && new Date(creds.tokenExpiresAt).getTime() - Date.now() < REFRESH_IF_EXPIRING_WITHIN_MS;

  if (!expiringSoon) {
    try {
      await validateToken(creds.accessToken);
      return creds;
    } catch (err) {
      if (!(err instanceof IgApiError)) throw err;
      // fall through to attempt a refresh
      console.warn(`Instagram token validation failed (${err.message}) - attempting refresh`);
    }
  }

  try {
    const refreshed = await refreshLongLivedToken(creds.accessToken);
    const tokenExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    await updateAccountToken(supabase, creds.accountRowId, refreshed.access_token, tokenExpiresAt);
    const newCreds: AccountCredentials = { ...creds, accessToken: refreshed.access_token, tokenExpiresAt };
    await validateToken(newCreds.accessToken);
    console.log(`Instagram token refreshed, now valid until ${tokenExpiresAt}`);
    return newCreds;
  } catch (refreshErr) {
    const detail = refreshErr instanceof Error ? refreshErr.message : String(refreshErr);
    throw new TokenError(
      `Instagram access token is invalid/expired and refresh failed: ${detail}. Re-authenticate via Instagram Login and update accounts.instagram_access_token.`
    );
  }
}

export interface PublishBatchSummary {
  published: number;
  dryRunReady: number;
  stillProcessing: number;
  deferred: number;
  failed: number;
  results: PublishOutcome[];
}

export async function runPublishBatch(
  supabase: SupabaseClient,
  posts: PostRow[],
  creds: AccountCredentials,
  dryRun: boolean
): Promise<PublishBatchSummary> {
  const summary: PublishBatchSummary = { published: 0, dryRunReady: 0, stillProcessing: 0, deferred: 0, failed: 0, results: [] };

  for (const post of posts) {
    const label = `${post.content_type ?? "?"}/${post.format} ${post.id}`;
    try {
      const outcome = await publishPost(supabase, post, creds, dryRun);
      summary.results.push(outcome);
      if (outcome.outcome === "published") {
        summary.published++;
        console.log(`[published] ${label} -> ig_media_id=${outcome.mediaId}`);
      } else if (outcome.outcome === "dry_run_ready") {
        summary.dryRunReady++;
        console.log(`[dry-run-ready] ${label} -> container ${outcome.containerId} reached FINISHED`);
      }
    } catch (err) {
      if (err instanceof StillProcessingError) {
        summary.stillProcessing++;
        summary.results.push({ postId: post.id, outcome: "still_processing", error: err.message });
        console.log(`[still-processing] ${label}: ${err.message}`);
        continue; // status stays 'scheduled' - next tick resumes
      }

      const message = err instanceof Error ? err.message : String(err);

      // A transient/platform error (5xx, Meta's own "unknown error, try
      // again" codes) survived withRetry's built-in backoff and still
      // escaped - that means it's not a fluke, it's an ongoing outage or
      // sustained instability. This is exactly the shape we hit for real on
      // 2026-07-19 (HTTP 500, code 1, "An unknown error occurred") while
      // Meta's platform was down. It must NOT burn the post to 'failed' -
      // status stays 'scheduled' so the next cron tick just tries again,
      // the same way still-processing does. Marking it 'failed' here would
      // mean every post in flight during a Meta outage needs manual
      // recovery, which defeats the entire point of an unattended
      // scheduler.
      if (isTransientError(err)) {
        summary.deferred++;
        summary.results.push({ postId: post.id, outcome: "deferred", error: message });
        console.warn(`[deferred] ${label}: transient/platform error, will retry next cron tick: ${message}`);
        continue; // status stays 'scheduled' - next tick resumes
      }

      summary.failed++;
      summary.results.push({ postId: post.id, outcome: "failed", error: message });
      console.error(`[FAILED] ${label}: ${message}`);
      try {
        await markPublishFailed(supabase, post.id, message);
      } catch (markErr) {
        console.error(`  also failed to mark post ${post.id} as failed: ${markErr instanceof Error ? markErr.message : markErr}`);
      }
    }
  }

  return summary;
}

export { getAccountCredentials };

// Defaults to dry-run ON: anything other than the literal string "false"
// (unset, "true", a typo, empty) keeps dry-run on. This is a live-publishing
// safety guard - the default must fail closed, not open.
export function isDryRun(): boolean {
  return process.env.DRY_RUN !== "false";
}

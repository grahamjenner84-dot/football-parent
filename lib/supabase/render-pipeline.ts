import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-only client using the service role key - this module is only ever
// imported from scripts/render-batch.ts and scripts/render-status.ts (run
// locally via `npm run render` / `npm run render:status`), never from
// client code. Targets the football-parent-social project only - see
// CLAUDE.md "Supabase projects - two, kept fully isolated".
export function createAdminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set (check .env.local)");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

const RENDERED_BUCKET = process.env.SUPABASE_RENDERED_CONTENT_BUCKET || "rendered-content";

export async function ensureRenderedBucket(supabase: SupabaseClient): Promise<void> {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw new Error("Failed to list storage buckets: " + error.message);
  if (buckets?.some((b) => b.name === RENDERED_BUCKET)) return;
  const { error: createError } = await supabase.storage.createBucket(RENDERED_BUCKET, { public: true });
  // Two concurrent runs (or a run right after another created it) can race
  // on "already exists" - only a genuine failure should stop the batch.
  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error("Failed to create storage bucket: " + createError.message);
  }
}

export async function uploadRenderedAsset(
  supabase: SupabaseClient,
  storagePath: string,
  bytes: Buffer,
  contentType: string
): Promise<string> {
  const { error } = await supabase.storage
    .from(RENDERED_BUCKET)
    .upload(storagePath, bytes, { contentType, upsert: true });
  if (error) throw new Error(`Supabase upload failed for ${storagePath}: ${error.message}`);
  const { data } = supabase.storage.from(RENDERED_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export type ContentType = "joke" | "education" | "interview";
export type PostFormat = "carousel" | "reel";
export type ContentStatus =
  | "draft"
  | "pending_qc"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "scheduled"
  | "published"
  | "failed";

export interface PostSlideRow {
  id: string;
  post_id: string;
  slide_order: number;
  image_url: string | null;
  video_url: string | null;
  alt_text: string | null;
  text_content: string | null;
  ig_child_container_id: string | null;
  duration_sec: number | null;
}

export interface PostRow {
  id: string;
  account_id: string;
  content_queue_id: string | null;
  content_type: ContentType | null;
  format: PostFormat;
  caption: string | null;
  hook_text: string | null;
  scheduled_time: string | null;
  status: ContentStatus;
  render_payload: Record<string, unknown>;
  created_at: string;
  post_slides: PostSlideRow[];
  ig_media_id: string | null;
  ig_container_id: string | null;
  published_at: string | null;
  error_message: string | null;
}

// Posts awaiting render: status='approved' is reused to mean "payload ready,
// not yet rendered" for posts specifically (see migration
// 20260719140000_render_pipeline_payload.sql). Ordered by scheduled_time so
// the soonest-needed content renders first when there's a backlog.
export async function getPostsAwaitingRender(supabase: SupabaseClient, limit = 50): Promise<PostRow[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*, post_slides(*)")
    .eq("status", "approved")
    .order("scheduled_time", { ascending: true, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error("Failed to query posts awaiting render: " + error.message);
  return (data ?? []) as PostRow[];
}

export async function markPostStatus(supabase: SupabaseClient, postId: string, status: ContentStatus): Promise<void> {
  const { error } = await supabase.from("posts").update({ status }).eq("id", postId);
  if (error) throw new Error(`Failed to set post ${postId} status=${status}: ${error.message}`);
}

export async function upsertPostSlide(
  supabase: SupabaseClient,
  row: {
    post_id: string;
    slide_order: number;
    image_url?: string | null;
    video_url?: string | null;
    alt_text?: string | null;
    text_content?: string | null;
    duration_sec?: number | null;
  }
): Promise<void> {
  const { error } = await supabase.from("post_slides").upsert(row, { onConflict: "post_id,slide_order" });
  if (error) throw new Error(`Failed to upsert post_slides for post ${row.post_id}: ${error.message}`);
}

export interface RunwayStats {
  readyToPublish: number;
  earliestReadyScheduledTime: string | null;
  latestReadyScheduledTime: string | null;
  awaitingRender: number;
  awaitingRenderApproachingSoon: number; // scheduled_time within lookaheadDays, still unrendered
}

// "Ready to publish" = status='scheduled' (rendered, files uploaded - see
// migration comment on posts.status default). "Awaiting render" =
// status='approved' (payload ready, nobody has run `npm run render` on it
// yet).
export async function getRunwayStats(supabase: SupabaseClient, lookaheadDays: number): Promise<RunwayStats> {
  const now = new Date();
  const lookaheadCutoff = new Date(now.getTime() + lookaheadDays * 24 * 60 * 60 * 1000).toISOString();

  const [readyRes, awaitingRes, approachingRes] = await Promise.all([
    supabase.from("posts").select("scheduled_time").eq("status", "scheduled"),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .not("scheduled_time", "is", null)
      .lte("scheduled_time", lookaheadCutoff),
  ]);

  if (readyRes.error) throw new Error("Failed to query ready-to-publish posts: " + readyRes.error.message);
  if (awaitingRes.error) throw new Error("Failed to query awaiting-render posts: " + awaitingRes.error.message);
  if (approachingRes.error) throw new Error("Failed to query approaching unrendered posts: " + approachingRes.error.message);

  const scheduledTimes = (readyRes.data ?? [])
    .map((r) => r.scheduled_time)
    .filter((t): t is string => Boolean(t))
    .sort();

  return {
    readyToPublish: readyRes.data?.length ?? 0,
    earliestReadyScheduledTime: scheduledTimes[0] ?? null,
    latestReadyScheduledTime: scheduledTimes[scheduledTimes.length - 1] ?? null,
    awaitingRender: awaitingRes.count ?? 0,
    awaitingRenderApproachingSoon: approachingRes.count ?? 0,
  };
}

import { createClient } from "@supabase/supabase-js";

// Server-only client using the service role key, same pattern as
// lib/supabase/content-queue.ts - this must never be imported from client
// code. Read-only: every query in this file is a select, nothing here writes.
function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export type SortMetric =
  | "recent"
  | "reach"
  | "views"
  | "likes"
  | "comments"
  | "saves"
  | "shares"
  | "total_interactions"
  | "avg_watch_time_sec";

export interface GetInstagramPerformanceInput {
  limit?: number; // number of posts to return, after sorting/filtering
  days?: number; // only include posts published in the last N days
  format?: "reel" | "carousel";
  sortBy?: SortMetric;
  order?: "desc" | "asc"; // desc = "best" for engagement metrics, asc = "worst"
}

interface MetricsSnapshot {
  pullWindow: string;
  pulledAt: string;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  views: number | null;
  totalInteractions: number | null;
  avgWatchTimeSec: number | null;
  // % of the whole reel's runtime the average viewer watched, derived
  // locally from avgWatchTimeSec / summed post_slides.duration_sec - not a
  // metric Meta returns itself, and NOT a per-second retention curve. See
  // top-level retentionCapabilities note on why no finer-grained figure
  // exists.
  avgWatchTimePctOfDuration: number | null;
  pullError: string | null;
}

export interface PostPerformance {
  postId: string;
  format: "reel" | "carousel";
  contentType: string | null;
  topic: string | null;
  caption: string | null;
  hookText: string | null;
  publishedAt: string | null;
  reelDurationSec: number | null; // sum of post_slides.duration_sec, reels only
  slideCount: number;
  metricsByWindow: MetricsSnapshot[];
  latest: MetricsSnapshot | null; // most recent successful pull, for sorting/at-a-glance
}

export interface GetInstagramPerformanceResult {
  generatedAt: string;
  filters: Required<Omit<GetInstagramPerformanceInput, "format">> & { format: "reel" | "carousel" | "all" };
  postCount: number;
  posts: PostPerformance[];
  // Answers "what CAN this tool actually show" up front, in-band, so a chat
  // reading this JSON never has to guess or assume finer granularity exists
  // than it does.
  retentionCapabilities: {
    reels: string;
    carousels: string;
    followsFromPost: string;
    impressions: string;
  };
}

const RETENTION_CAPABILITIES = {
  reels:
    "Instagram's Graph API (graph.instagram.com, Instagram Login) exposes only ig_reels_avg_watch_time: one whole-video average watch time per reel, not a per-second retention/drop-off curve. This tool derives avgWatchTimePctOfDuration (avg watch time / total reel runtime) as the closest available proxy for 'how much of the reel people watched on average' - it cannot show WHERE in the reel viewers dropped off. A per-second retention graph is only ever shown natively inside the Instagram app's own insights UI for the account owner; it is not returned by any Graph API endpoint this app (or any third-party app) can call.",
  carousels:
    "Meta's Graph API does not expose any per-slide/per-card view or drop-off metric for carousel posts - only whole-post aggregates (reach, likes, comments, saves, shares, total_interactions). There is no API field anywhere for 'how many people saw slide 2 vs slide 4'. This is a hard platform limitation, not a gap in this tool's collection - the app-native Insights screen doesn't show this breakdown either, even to the account owner.",
  followsFromPost:
    "Not collected. Meta does not expose a 'follows attributable to this specific post' metric via the Graph API media insights endpoint, so it isn't in metricsForFormat() (lib/instagram/insights-pipeline.ts) and was never fetched or stored.",
  impressions:
    "The post_metrics.impressions column exists but is never populated - Meta retired the impressions metric platform-wide in 2025. Use reach/views instead.",
};

function toSnapshot(row: Record<string, unknown>, durationSec: number | null): MetricsSnapshot {
  const avgWatchTimeSec = row.avg_watch_time_sec as number | null;
  const avgWatchTimePctOfDuration =
    avgWatchTimeSec != null && durationSec != null && durationSec > 0
      ? Math.round((avgWatchTimeSec / durationSec) * 1000) / 10
      : null;
  return {
    pullWindow: row.pull_window as string,
    pulledAt: row.pulled_at as string,
    reach: (row.reach as number | null) ?? null,
    likes: (row.likes as number | null) ?? null,
    comments: (row.comments as number | null) ?? null,
    saves: (row.saves as number | null) ?? null,
    shares: (row.shares as number | null) ?? null,
    views: (row.views as number | null) ?? null,
    totalInteractions: (row.total_interactions as number | null) ?? null,
    avgWatchTimeSec: avgWatchTimeSec ?? null,
    avgWatchTimePctOfDuration,
    pullError: (row.pull_error as string | null) ?? null,
  };
}

// "Latest" = most recent pulled_at among windows that didn't fail - a
// pull_error row carries no metric values, so picking it as "latest" would
// silently show nulls where real data exists in an earlier window instead.
function pickLatest(snapshots: MetricsSnapshot[]): MetricsSnapshot | null {
  const successful = snapshots.filter((s) => !s.pullError);
  if (!successful.length) return null;
  return [...successful].sort((a, b) => new Date(b.pulledAt).getTime() - new Date(a.pulledAt).getTime())[0];
}

function sortValue(post: PostPerformance, sortBy: SortMetric): number {
  if (sortBy === "recent") return post.publishedAt ? new Date(post.publishedAt).getTime() : 0;
  const v = post.latest?.[
    ({
      reach: "reach",
      views: "views",
      likes: "likes",
      comments: "comments",
      saves: "saves",
      shares: "shares",
      total_interactions: "totalInteractions",
      avg_watch_time_sec: "avgWatchTimeSec",
    } as const)[sortBy]
  ];
  return typeof v === "number" ? v : -Infinity;
}

export async function getInstagramPerformance(input: GetInstagramPerformanceInput = {}): Promise<GetInstagramPerformanceResult> {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 50);
  const days = input.days ?? 90;
  const sortBy = input.sortBy ?? "recent";
  const order = input.order ?? "desc";
  const format = input.format;

  const supabase = adminClient();

  let query = supabase
    .from("posts")
    .select("id, format, content_type, caption, hook_text, published_at, content_queue_id, post_slides(duration_sec), post_metrics(*), content_queue(topic)")
    .eq("status", "published")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });

  if (days > 0) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte("published_at", cutoff);
  }
  if (format) query = query.eq("format", format);

  // Fetched uncapped (within the days window) so sorting by a performance
  // metric can pick true best/worst before limit is applied - limiting the
  // query itself would only ever return the most RECENT posts, defeating
  // sortBy for anything other than "recent".
  const { data, error } = await query;
  if (error) throw new Error("Failed to query post performance: " + error.message);

  const posts: PostPerformance[] = (data ?? []).map((row) => {
    const slides = (row.post_slides ?? []) as { duration_sec: number | null }[];
    const durationValues = slides.map((s) => s.duration_sec).filter((d): d is number => d != null);
    const reelDurationSec = row.format === "reel" && durationValues.length ? durationValues.reduce((a, b) => a + b, 0) : null;

    const metricsByWindow = ((row.post_metrics ?? []) as Record<string, unknown>[])
      .map((m) => toSnapshot(m, reelDurationSec))
      .sort((a, b) => new Date(a.pulledAt).getTime() - new Date(b.pulledAt).getTime());

    const contentQueue = row.content_queue as { topic: string } | { topic: string }[] | null;
    const topic = Array.isArray(contentQueue) ? contentQueue[0]?.topic ?? null : contentQueue?.topic ?? null;

    return {
      postId: row.id as string,
      format: row.format as "reel" | "carousel",
      contentType: (row.content_type as string | null) ?? null,
      topic,
      caption: (row.caption as string | null) ?? null,
      hookText: (row.hook_text as string | null) ?? null,
      publishedAt: (row.published_at as string | null) ?? null,
      reelDurationSec,
      slideCount: slides.length,
      metricsByWindow,
      latest: pickLatest(metricsByWindow),
    };
  });

  posts.sort((a, b) => {
    const diff = sortValue(b, sortBy) - sortValue(a, sortBy); // descending by default
    return order === "asc" ? -diff : diff;
  });

  return {
    generatedAt: new Date().toISOString(),
    filters: { limit, days, sortBy, order, format: format ?? "all" },
    postCount: Math.min(posts.length, limit),
    posts: posts.slice(0, limit),
    retentionCapabilities: RETENTION_CAPABILITIES,
  };
}

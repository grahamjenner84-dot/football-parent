import { SupabaseClient } from "@supabase/supabase-js";
import { PostFormat, PostRow } from "../supabase/render-pipeline";
import { MediaInsightsResponse } from "./graph-client";

export interface PullWindow {
  label: string;
  delayHours: number;
  // Skip the window entirely once a post is older than this, so a late
  // first pull isn't stored under a label that claims it was early.
  maxAgeHours?: number;
}

// Initial pull lands in the 48-72h window the brief calls for (engagement
// has mostly settled but isn't yet ancient); followup_7d catches
// longer-tail growth. Configurable via INSIGHTS_PULL_WINDOWS=
// "hours:label,hours:label,..." (e.g. "60:initial,168:followup_7d") so the
// cadence can be tuned without a code change.
//
// NOT YET APPLICABLE - flagged for later: if this pipeline ever publishes
// Instagram Stories, their insights expire and become unreadable 24h after
// posting, unlike feed/reel media whose insights stay queryable
// indefinitely. A 'story' format would need its own pull window with
// delayHours well under 24 (e.g. 12h), never reusing these feed/reel
// windows - the schedule below assumes non-expiring media.
//
// "early" (added Oct 2026) is a first look a few hours in, to compare with
// the later pulls. The cron runs once a night, so in practice it lands
// between 6 and 30 hours after posting; posts older than that never get one.
const DEFAULT_PULL_WINDOWS: PullWindow[] = [
  { label: "early", delayHours: 6, maxAgeHours: 30 },
  { label: "initial", delayHours: 60 },
  { label: "followup_7d", delayHours: 168 },
];

export function getPullWindows(): PullWindow[] {
  const raw = process.env.INSIGHTS_PULL_WINDOWS;
  if (!raw) return DEFAULT_PULL_WINDOWS;
  return raw.split(",").map((entry) => {
    const [hours, label, maxAge] = entry.split(":");
    const delayHours = Number(hours);
    const maxAgeHours = maxAge ? Number(maxAge) : undefined;
    if (!label || Number.isNaN(delayHours) || (maxAgeHours !== undefined && Number.isNaN(maxAgeHours))) {
      throw new Error(`Malformed INSIGHTS_PULL_WINDOWS entry "${entry}" - expected "hours:label" or "hours:label:maxAgeHours"`);
    }
    return { label: label.trim(), delayHours, maxAgeHours };
  });
}

// Meta 400s on a metric a media type doesn't support (unlike an unknown
// field, which is silently ignored), so these lists must stay exact per
// the Phase C brief - do not add 'impressions' (retired platform-wide,
// 2025) to either.
const CAROUSEL_METRICS = ["reach", "likes", "comments", "saved", "shares", "total_interactions"];
const REEL_METRICS = ["reach", "views", "likes", "comments", "saved", "shares", "total_interactions", "ig_reels_avg_watch_time"];

export function metricsForFormat(format: PostFormat): string[] {
  return format === "reel" ? REEL_METRICS : CAROUSEL_METRICS;
}

// Metric lists to try in order, richest first. Meta 400s the whole request
// on one unsupported metric, and follows/profile_visits are documented for
// feed media but may not be for reels, so pullInsightsForPost() falls back
// down this list rather than losing the pull. Carousels get `views` (added
// for feed media after CAROUSEL_METRICS was written); reels get total watch
// time.
export function metricAttemptsForFormat(format: PostFormat): string[][] {
  const base = metricsForFormat(format);
  const extra = format === "reel" ? ["ig_reels_video_view_total_time"] : ["views"];
  return [[...base, ...extra, "follows", "profile_visits"], [...base, ...extra], base];
}

// Optional breakdown requests made after the main pull, each on its own so
// a rejection only loses that one number. Results go to post_metrics.extra
// as well as the columns below.
export const BREAKDOWN_PROBES = [
  { metric: "profile_activity", breakdown: "action_type" }, // -> profile_activity, bio_link_taps
  { metric: "reach", breakdown: "follow_type" }, // -> reach_followers, reach_non_followers
] as const;

export interface DuePull {
  post: PostRow;
  window: PullWindow;
}

// A post is "due" for a given window once published_at + delayHours has
// passed AND no post_metrics row exists yet for (post_id, window.label) -
// the row's mere existence (success or permanent-failure marker, see
// pull_error) is what stops a window being re-pulled; a transient/outage
// error leaves no row, so that window stays due and is retried next call.
export async function getDueInsightsPulls(supabase: SupabaseClient, limit = 20): Promise<DuePull[]> {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("*, post_slides(*)")
    .eq("status", "published")
    .not("ig_media_id", "is", null)
    .not("published_at", "is", null)
    .order("published_at", { ascending: true });
  if (error) throw new Error("Failed to query published posts: " + error.message);
  const publishedPosts = (posts ?? []) as PostRow[];
  if (!publishedPosts.length) return [];

  const postIds = publishedPosts.map((p) => p.id);
  const { data: existingPulls, error: pullsError } = await supabase.from("post_metrics").select("post_id, pull_window").in("post_id", postIds);
  if (pullsError) throw new Error("Failed to query existing post_metrics pulls: " + pullsError.message);

  const pulledWindows = new Set((existingPulls ?? []).map((r) => `${r.post_id}:${r.pull_window}`));
  const windows = getPullWindows();
  const now = Date.now();

  const due: DuePull[] = [];
  for (const post of publishedPosts) {
    const publishedAt = new Date(post.published_at as string).getTime();
    for (const window of windows) {
      if (pulledWindows.has(`${post.id}:${window.label}`)) continue;
      if (window.maxAgeHours != null && now > publishedAt + window.maxAgeHours * 60 * 60 * 1000) continue;
      if (now >= publishedAt + window.delayHours * 60 * 60 * 1000) due.push({ post, window });
    }
  }
  // Early windows first: they expire (maxAgeHours), the others don't, so a
  // backlog of late pulls mustn't push a new post's early look past its age.
  due.sort((a, b) => Number(b.window.maxAgeHours != null) - Number(a.window.maxAgeHours != null));
  return due.slice(0, limit);
}

// The `values` array is the documented shape for lifetime/day metrics
// (usually one entry - take the last in case Meta ever returns more than
// one period); `total_value` has been observed for some aggregate metrics
// instead, so both are checked rather than assuming one shape.
export function parseInsightsResponse(response: MediaInsightsResponse): Record<string, number> {
  const result: Record<string, number> = {};
  for (const metric of response.data ?? []) {
    const value = metric.values?.[metric.values.length - 1]?.value ?? metric.total_value?.value;
    if (typeof value === "number") result[metric.name] = value;
  }
  return result;
}

export interface PostMetricsRow {
  post_id: string;
  pull_window: string;
  pulled_at: string;
  reach?: number | null;
  likes?: number | null;
  comments?: number | null;
  saves?: number | null;
  shares?: number | null;
  views?: number | null;
  total_interactions?: number | null;
  avg_watch_time_sec?: number | null;
  follows?: number | null;
  profile_visits?: number | null;
  profile_activity?: number | null;
  bio_link_taps?: number | null;
  reach_followers?: number | null;
  reach_non_followers?: number | null;
  watch_time_total_sec?: number | null;
  extra?: Record<string, unknown> | null;
  pull_error?: string | null;
}

// Graph API's metric name is "saved"; our column is "saves" - mapped here
// rather than renaming the column to match Meta's naming, which has
// changed before (impressions -> retired) and shouldn't ripple into the
// schema every time it does.
//
// ig_reels_avg_watch_time is returned by the live API in MILLISECONDS -
// confirmed directly from a real response's own field title ("Reels
// average watch time (milliseconds)"), not assumed. Our column is named
// avg_watch_time_sec, so it's divided by 1000 here rather than storing the
// raw Meta unit under a misleading column name.
export function buildMetricsRow(postId: string, pullWindow: string, format: PostFormat, raw: Record<string, number>): PostMetricsRow {
  return {
    post_id: postId,
    pull_window: pullWindow,
    pulled_at: new Date().toISOString(),
    reach: raw.reach ?? null,
    likes: raw.likes ?? null,
    comments: raw.comments ?? null,
    saves: raw.saved ?? null,
    shares: raw.shares ?? null,
    views: raw.views ?? null,
    total_interactions: raw.total_interactions ?? null,
    avg_watch_time_sec: format === "reel" && raw.ig_reels_avg_watch_time != null ? raw.ig_reels_avg_watch_time / 1000 : null,
    follows: raw.follows ?? null,
    profile_visits: raw.profile_visits ?? null,
    // Milliseconds from Meta, like ig_reels_avg_watch_time.
    watch_time_total_sec: format === "reel" && raw.ig_reels_video_view_total_time != null ? raw.ig_reels_video_view_total_time / 1000 : null,
  };
}

export function buildErrorRow(postId: string, pullWindow: string, message: string): PostMetricsRow {
  return { post_id: postId, pull_window: pullWindow, pulled_at: new Date().toISOString(), pull_error: message };
}

// The columns below arrived in migration 20261008090000. If that
// migration isn't applied, PostgREST rejects the unknown columns with
// PGRST204 (Postgres's own 42703 if it ever gets that far), and without
// this retry the failure would land in pullInsightsForPost's catch and be
// written as a permanent pull_error for that window. Same safety net as
// lib/supabase/page-views.ts; the migration still goes first.
const NEW_COLUMNS = ["follows", "profile_visits", "profile_activity", "bio_link_taps", "reach_followers", "reach_non_followers", "watch_time_total_sec", "extra"];

function isMissingColumn(error: { code?: string; message?: string }): boolean {
  return error.code === "PGRST204" || error.code === "42703";
}

export async function recordMetricsPull(supabase: SupabaseClient, row: PostMetricsRow): Promise<void> {
  let { error } = await supabase.from("post_metrics").upsert(row, { onConflict: "post_id,pull_window" });
  if (error && isMissingColumn(error)) {
    console.warn(`post_metrics is missing the Oct 2026 columns (apply 20261008090000_post_metrics_follows.sql): ${error.message}`);
    const base: Record<string, unknown> = { ...row };
    for (const col of NEW_COLUMNS) delete base[col];
    ({ error } = await supabase.from("post_metrics").upsert(base, { onConflict: "post_id,pull_window" }));
  }
  if (error) throw new Error(`Failed to record metrics pull for post ${row.post_id} window ${row.pull_window}: ${error.message}`);
}

import { createClient } from "@supabase/supabase-js";
import { matchesKnownBotPattern } from "@/lib/user-agent-bots";
import { getAllArticleSlugs } from "@/lib/content";
import { COACH_APP_CHANNELS, channelFor, channelForPageView, type CoachAppChannel } from "@/lib/coach-app-channels";
import { COACH_AUDIENCE_SLUGS } from "@/app/components/CoachAppBanner";

// The Progress pipeline: the "Progress pipeline" tab on /admin/seo, the
// Progress card on its dashboard and the get_progress_funnel MCP tool.
// Mirrors the Coach App funnel (lib/supabase/coach-app-funnel.ts), with the
// same split: everything is read from THIS site's project
// (football-parent-social). The Progress project is never read; its
// whole-app counts arrive here as an anonymous snapshot (progress migration
// 0021 -> /api/progress-snapshot), approved by Graham on 2026-10-02.
//
// Server-only client using the service role key. Never import from client
// code, and never point at the Progress project.
function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// When the Progress banners and menu link went live (PR #52 merged
// 2026-10-02 ~13:16 UTC). Every number on the tab starts here: before it
// nothing on the site pointed at /progress except the page itself.
export const PROGRESS_TRACKING_STARTED_AT = "2026-10-02T13:16:00Z";

const LANDING_PATH = "/progress";

// ---------------------------------------------------------------------------
// Writing (from the public endpoints)
// ---------------------------------------------------------------------------

export interface JoinEvent {
  form: string | null;
  entryPath: string | null;
  entrySourceGroup: string | null;
  banner: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  hadGclid: boolean;
  marketingOptIn: boolean;
}

const JOIN_FLOOD_WINDOW_MS = 60_000;
// The form sends a few links a day at most; twenty in a minute is someone
// posting to the endpoint, not parents.
const JOIN_FLOOD_THRESHOLD = 20;

export async function logProgressJoin(event: JoinEvent, userAgent: string | null): Promise<void> {
  const supabase = adminClient();
  const since = new Date(Date.now() - JOIN_FLOOD_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("progress_join_events")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if ((count ?? 0) >= JOIN_FLOOD_THRESHOLD) return;

  const { error } = await supabase.from("progress_join_events").insert({
    form: event.form,
    entry_path: event.entryPath,
    entry_source_group: event.entrySourceGroup,
    banner: event.banner,
    utm_source: event.utmSource,
    utm_medium: event.utmMedium,
    utm_campaign: event.utmCampaign,
    had_gclid: event.hadGclid,
    marketing_opt_in: event.marketingOptIn,
    user_agent: userAgent,
  });
  if (error) throw new Error("Failed to insert progress_join_events row: " + error.message);
}

/** Whole-app counts from the Progress database, Graham's accounts and
 * accounts waiting to be deleted left out. Definitions live with the query:
 * usage_snapshot_counts() in progress migration 0021. */
export interface ProgressUsageCounts {
  totalAccounts: number;
  /** Accounts created since UK midnight. */
  signupsToday: number;
  /** Of those, how many already have a player (their own or shared). */
  signupsTodayWithPlayer: number;
  /** Accounts that opened the app since UK midnight. */
  activeToday: number;
  /** Accounts that opened the app in the last 7 days. */
  active7d: number;
  /** Accounts with at least one player, held or shared with them. */
  accountsWithPlayer: number;
  /** Live (not deleted) players. */
  players: number;
  /** Players shared with at least one other parent. */
  sharedPlayers: number;
  matchesLogged: number;
  /** Accounts with a player that has at least one match logged. */
  accountsWithMatch: number;
  trainingLogged: number;
  /** Each account's own plan; the three add up to totalAccounts. Paid
   * includes a payment being retried; lapsed is a trial that ended or a
   * cancelled subscription. */
  planPaid: number;
  planTrial: number;
  planLapsed: number;
}

export const USAGE_FIELDS: (keyof ProgressUsageCounts)[] = [
  "totalAccounts",
  "signupsToday",
  "signupsTodayWithPlayer",
  "activeToday",
  "active7d",
  "accountsWithPlayer",
  "players",
  "sharedPlayers",
  "matchesLogged",
  "accountsWithMatch",
  "trainingLogged",
  "planPaid",
  "planTrial",
  "planLapsed",
];

const COLUMN: Record<keyof ProgressUsageCounts, string> = {
  totalAccounts: "total_accounts",
  signupsToday: "signups_today",
  signupsTodayWithPlayer: "signups_today_with_player",
  activeToday: "active_today",
  active7d: "active_7d",
  accountsWithPlayer: "accounts_with_player",
  players: "players",
  sharedPlayers: "shared_players",
  matchesLogged: "matches_logged",
  accountsWithMatch: "accounts_with_match",
  trainingLogged: "training_logged",
  planPaid: "plan_paid",
  planTrial: "plan_trial",
  planLapsed: "plan_lapsed",
};

export async function logProgressUsageSnapshot(takenAt: string, counts: ProgressUsageCounts): Promise<void> {
  const row: Record<string, string | number> = { taken_at: takenAt };
  for (const f of USAGE_FIELDS) row[COLUMN[f]] = counts[f];
  const { error } = await adminClient().from("progress_usage_snapshots").insert(row);
  if (error) throw new Error("Failed to insert progress_usage_snapshots row: " + error.message);
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export interface ProgressUsage {
  /** The most recent snapshot, or null before the first one arrives. */
  latest: (ProgressUsageCounts & { takenAt: string }) | null;
  /** The last snapshot of each UK day, newest first: that day's closing
   * figures, so signupsToday there is that day's new accounts. */
  byDay: (ProgressUsageCounts & { date: string; takenAt: string })[];
}

const londonDay = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date(iso));

function snapshotCounts(r: Record<string, unknown>): ProgressUsageCounts & { takenAt: string } {
  const out = { takenAt: r.taken_at as string } as ProgressUsageCounts & { takenAt: string };
  for (const f of USAGE_FIELDS) out[f] = r[COLUMN[f]] as number;
  return out;
}

async function getProgressUsage(supabase: ReturnType<typeof adminClient>, days: number): Promise<ProgressUsage> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const rows: Record<string, unknown>[] = [];
  const pageSize = 1000;
  // Newest first, so the first row seen for each day is its closing figure.
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("progress_usage_snapshots")
      .select(["taken_at", ...USAGE_FIELDS.map((f) => COLUMN[f])].join(", "))
      .gte("taken_at", since)
      .order("taken_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw new Error("Failed to read progress_usage_snapshots: " + error.message);
    const batch = (data ?? []) as unknown as Record<string, unknown>[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  const byDay = new Map<string, ProgressUsageCounts & { date: string; takenAt: string }>();
  for (const r of rows) {
    const date = londonDay(r.taken_at as string);
    if (!byDay.has(date)) byDay.set(date, { date, ...snapshotCounts(r) });
  }
  return { latest: rows.length > 0 ? snapshotCounts(rows[0]) : null, byDay: Array.from(byDay.values()) };
}

export type ProgressPlacement = "home" | "article" | "academy-pathway";
export const PROGRESS_PLACEMENTS: ProgressPlacement[] = ["home", "article", "academy-pathway"];

export interface PlacementRow {
  placement: ProgressPlacement;
  /** Views of pages carrying this banner (a view, not a scroll to it). */
  impressions: number;
  /** Landings on /progress from this banner. */
  clicks: number;
  ctr: number;
}

export interface ProgressChannelRow {
  channel: CoachAppChannel;
  /** Views of /progress. */
  landingViews: number;
  /** Sign-in links sent from the join form. */
  joins: number;
}

export interface ProgressJoin {
  createdAt: string;
  channel: CoachAppChannel;
  form: string | null;
  entryPath: string | null;
  banner: string | null;
  utmCampaign: string | null;
  marketingOptIn: boolean;
}

export interface ProgressFunnel {
  days: number;
  /** Start of every site-side number: the later of `days` ago and
   * PROGRESS_TRACKING_STARTED_AT. */
  since: string;
  clampedToTrackingStart: boolean;
  /** The headline pipeline, top to bottom. newAccounts sums each UK day's
   * closing signupsToday over the window (null before the first snapshot). */
  pipeline: {
    impressions: number;
    bannerClicks: number;
    landingViews: number;
    joins: number;
    newAccounts: number | null;
  };
  placements: PlacementRow[];
  channels: ProgressChannelRow[];
  byDay: { date: string; impressions: number; bannerClicks: number; landingViews: number; joins: number }[];
  /** Newest first, capped. Anonymous: no account is identifiable here. */
  recentJoins: ProgressJoin[];
  joinsError?: string;
  usage: ProgressUsage | { error: string };
}

type ViewRow = {
  path: string;
  referrer_host: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  gclid: string | null;
  banner_variant: string | null;
  user_agent: string | null;
  created_at: string;
};

type JoinRow = {
  form: string | null;
  entry_path: string | null;
  entry_source_group: string | null;
  banner: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  had_gclid: boolean;
  marketing_opt_in: boolean;
  user_agent: string | null;
  created_at: string;
};

const isHuman = (ua: string | null) => !ua || !matchesKnownBotPattern(ua);

/** Which Progress banner a page view showed, if any. Mirrors where
 * ProgressBanner is rendered: the homepage, /academy-pathway and its
 * articles (sponsor version), and the end of every other article whose
 * banner audience isn't "coach" (lib/MDXContent.tsx). */
export function progressBannerOnPath(path: string, articleSlugs: Set<string>): ProgressPlacement | null {
  if (path === "/") return "home";
  if (path === "/academy-pathway") return "academy-pathway";
  if (path.startsWith("/coaching/") || path.startsWith("/football-parent-coach-app")) return null;
  const slug = path.split("/").filter(Boolean).pop();
  if (!slug || !articleSlugs.has(slug) || COACH_AUDIENCE_SLUGS.has(slug)) return null;
  return path.startsWith("/academy-pathway/") ? "academy-pathway" : "article";
}

function placementOf(banner: string | null): ProgressPlacement | null {
  if (!banner?.startsWith("progress-")) return null;
  const p = banner.slice("progress-".length) as ProgressPlacement;
  return PROGRESS_PLACEMENTS.includes(p) ? p : null;
}

export async function getProgressFunnel(days: number = 30): Promise<ProgressFunnel> {
  const supabase = adminClient();
  const requestedSince = Date.now() - days * 24 * 60 * 60 * 1000;
  const trackingStart = Date.parse(PROGRESS_TRACKING_STARTED_AT);
  const clampedToTrackingStart = trackingStart > requestedSince;
  const since = new Date(Math.max(requestedSince, trackingStart)).toISOString();
  const articleSlugs = getAllArticleSlugs();

  // Every human page view in the window: impressions need the whole site,
  // and /progress views come out of the same pass.
  async function readAllViews(): Promise<ViewRow[]> {
    const rows: ViewRow[] = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("page_views")
        .select("path, referrer_host, utm_source, utm_medium, gclid, banner_variant, user_agent, created_at")
        .gte("created_at", since)
        .order("id", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw new Error("Failed to read page_views: " + error.message);
      const batch = (data ?? []) as ViewRow[];
      rows.push(...batch);
      if (batch.length < pageSize) break;
    }
    return rows.filter((r) => isHuman(r.user_agent));
  }

  const [views, joinResult, usage] = await Promise.all([
    readAllViews(),
    supabase
      .from("progress_join_events")
      .select(
        "form, entry_path, entry_source_group, banner, utm_source, utm_medium, utm_campaign, had_gclid, marketing_opt_in, user_agent, created_at"
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000),
    getProgressUsage(supabase, days).catch((err: unknown) => ({
      error: err instanceof Error ? err.message : "Unknown error",
    })),
  ]);

  const joinRows = ((joinResult.data ?? []) as JoinRow[]).filter((r) => isHuman(r.user_agent));
  const joinsError = joinResult.error?.message;
  const joinChannel = (r: JoinRow) =>
    channelFor({
      hasGclid: r.had_gclid,
      utmSource: r.utm_source,
      utmMedium: r.utm_medium,
      banner: r.banner,
      sourceGroup: r.entry_source_group,
    });

  const placements = new Map<ProgressPlacement, PlacementRow>(
    PROGRESS_PLACEMENTS.map((placement) => [placement, { placement, impressions: 0, clicks: 0, ctr: 0 }])
  );
  const channels = new Map<CoachAppChannel, ProgressChannelRow>(
    COACH_APP_CHANNELS.map((channel) => [channel, { channel, landingViews: 0, joins: 0 }])
  );
  const days_ = new Map<string, ProgressFunnel["byDay"][number]>();
  const day = (date: string) => {
    let d = days_.get(date);
    if (!d) {
      d = { date, impressions: 0, bannerClicks: 0, landingViews: 0, joins: 0 };
      days_.set(date, d);
    }
    return d;
  };

  let landingViews = 0;
  let bannerClicks = 0;
  for (const v of views) {
    const shown = progressBannerOnPath(v.path, articleSlugs);
    if (shown) {
      placements.get(shown)!.impressions++;
      day(v.created_at.slice(0, 10)).impressions++;
    }
    if (v.path !== LANDING_PATH) continue;
    landingViews++;
    day(v.created_at.slice(0, 10)).landingViews++;
    channels.get(channelForPageView(v))!.landingViews++;
    const clicked = placementOf(v.banner_variant);
    if (clicked) {
      placements.get(clicked)!.clicks++;
      bannerClicks++;
      day(v.created_at.slice(0, 10)).bannerClicks++;
    }
  }
  for (const r of joinRows) {
    channels.get(joinChannel(r))!.joins++;
    day(r.created_at.slice(0, 10)).joins++;
  }
  for (const p of placements.values()) p.ctr = p.impressions > 0 ? p.clicks / p.impressions : 0;

  // New accounts in the window: each UK day's closing sign-up count, from
  // the tracking start's day on.
  let newAccounts: number | null = null;
  if (!("error" in usage) && usage.latest) {
    const firstDay = londonDay(since);
    newAccounts = usage.byDay.filter((d) => d.date >= firstDay).reduce((sum, d) => sum + d.signupsToday, 0);
  }

  const impressions = Array.from(placements.values()).reduce((s, p) => s + p.impressions, 0);

  return {
    days,
    since,
    clampedToTrackingStart,
    pipeline: { impressions, bannerClicks, landingViews, joins: joinRows.length, newAccounts },
    placements: Array.from(placements.values()),
    channels: Array.from(channels.values()).filter((c) => c.landingViews + c.joins > 0),
    byDay: Array.from(days_.values()).sort((a, b) => b.date.localeCompare(a.date)),
    recentJoins: joinRows.slice(0, 50).map((r) => ({
      createdAt: r.created_at,
      channel: joinChannel(r),
      form: r.form,
      entryPath: r.entry_path,
      banner: r.banner,
      utmCampaign: r.utm_campaign,
      marketingOptIn: r.marketing_opt_in,
    })),
    ...(joinsError ? { joinsError } : {}),
    usage,
  };
}

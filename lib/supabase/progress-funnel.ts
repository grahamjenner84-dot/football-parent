import { createClient } from "@supabase/supabase-js";
import { matchesKnownBotPattern } from "@/lib/user-agent-bots";
import { getAllArticleSlugs } from "@/lib/content";
import { COACH_APP_CHANNELS, channelFor, channelForPageView, type CoachAppChannel } from "@/lib/coach-app-channels";
import { COACH_AUDIENCE_SLUGS } from "@/app/components/CoachAppBanner";
import {
  PROGRESS_BANNER_TEST_MIN_IMPRESSIONS,
  PROGRESS_BANNER_TEST_STARTED_AT,
  PROGRESS_BANNER_TEST_THRESHOLD,
  inProgressBannerTest,
  parseProgressBanner,
  probabilityBBeatsA,
  progressBannerArmValue,
  progressBannerTestStatus,
  type ProgressBannerArm,
  type ProgressBannerTestStatus,
} from "@/lib/progress-banner-test";

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

/** Activation counts, sent by the Progress database since the activation
 * change (progress side) and stored in nullable columns (migration
 * 20261009120000_progress_usage_activation.sql). Null means the snapshot
 * didn't carry it: older snapshots, or this site's columns not there yet. */
export interface ProgressActivationCounts {
  /** Accounts created in the last 7 days. */
  signups7d: number | null;
  /** Of those, with access to a live player. */
  signups7dWithPlayer: number | null;
  /** Of those, with a player that has at least one club/season (chapter). */
  signups7dWithClub: number | null;
  /** Of those, with a match or training logged on a player they can access. */
  signups7dWithLog: number | null;
  /** Of those, who have opened the app installed to the home screen. */
  signups7dInstalled: number | null;
  /** Accounts created 7 to 14 days ago: their first week is complete. */
  cohortWeek2: number | null;
  /** Of those, logged a match or training within 7 days of signing up. */
  cohortWeek2Activated: number | null;
  /** Accounts with a match or training logged (created) in the last 7 days:
   * the weekly habit number. */
  accountsLogged7d: number | null;
  /** Accounts that have ever opened the installed app. */
  accountsInstalled: number | null;
}

export const ACTIVATION_FIELDS: (keyof ProgressActivationCounts)[] = [
  "signups7d",
  "signups7dWithPlayer",
  "signups7dWithClub",
  "signups7dWithLog",
  "signups7dInstalled",
  "cohortWeek2",
  "cohortWeek2Activated",
  "accountsLogged7d",
  "accountsInstalled",
];

const ACTIVATION_COLUMN: Record<keyof ProgressActivationCounts, string> = {
  signups7d: "signups_7d",
  signups7dWithPlayer: "signups_7d_with_player",
  signups7dWithClub: "signups_7d_with_club",
  signups7dWithLog: "signups_7d_with_log",
  signups7dInstalled: "signups_7d_installed",
  cohortWeek2: "cohort_week2",
  cohortWeek2Activated: "cohort_week2_activated",
  accountsLogged7d: "accounts_logged_7d",
  accountsInstalled: "accounts_installed",
};

export type ProgressSnapshotCounts = ProgressUsageCounts & ProgressActivationCounts;

// PostgREST reports an unknown column as PGRST204 (insert) and Postgres as
// 42703; both mean the activation migration hasn't been applied yet. See
// lib/supabase/page-views.ts for why both codes matter.
function isMissingColumnError(error: { code?: string }): boolean {
  return error.code === "PGRST204" || error.code === "42703";
}

export async function logProgressUsageSnapshot(takenAt: string, counts: ProgressSnapshotCounts): Promise<void> {
  const supabase = adminClient();
  const row: Record<string, string | number> = { taken_at: takenAt };
  for (const f of USAGE_FIELDS) row[COLUMN[f]] = counts[f];
  const activation: Record<string, unknown> = {};
  for (const f of ACTIVATION_FIELDS) activation[ACTIVATION_COLUMN[f]] = counts[f];

  const { error } = await supabase.from("progress_usage_snapshots").insert({ ...row, ...activation });
  // Deployed before 20261009120000_progress_usage_activation.sql was
  // applied: keep the snapshot, drop the activation counts, rather than
  // lose every snapshot until the migration runs.
  if (error && isMissingColumnError(error)) {
    const retry = await supabase.from("progress_usage_snapshots").insert(row);
    if (!retry.error) return;
    throw new Error("Failed to insert progress_usage_snapshots row: " + retry.error.message);
  }
  if (error) throw new Error("Failed to insert progress_usage_snapshots row: " + error.message);
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export interface ProgressUsage {
  /** The most recent snapshot, or null before the first one arrives. */
  latest: (ProgressSnapshotCounts & { takenAt: string }) | null;
  /** The last snapshot of each UK day, newest first: that day's closing
   * figures, so signupsToday there is that day's new accounts. */
  byDay: (ProgressSnapshotCounts & { date: string; takenAt: string })[];
}

const londonDay = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date(iso));

function snapshotCounts(r: Record<string, unknown>): ProgressSnapshotCounts & { takenAt: string } {
  const out = { takenAt: r.taken_at as string } as ProgressSnapshotCounts & { takenAt: string };
  for (const f of USAGE_FIELDS) out[f] = r[COLUMN[f]] as number;
  for (const f of ACTIVATION_FIELDS) {
    const v = r[ACTIVATION_COLUMN[f]];
    out[f] = typeof v === "number" ? v : null;
  }
  return out;
}

async function getProgressUsage(supabase: ReturnType<typeof adminClient>, days: number): Promise<ProgressUsage> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const rows: Record<string, unknown>[] = [];
  const pageSize = 1000;
  // Newest first, so the first row seen for each day is its closing figure.
  // Without the activation migration the activation columns don't exist and
  // selecting them fails: fall back to the original columns (activation
  // counts then read as null) so the rest of the tab still loads.
  const baseColumns = ["taken_at", ...USAGE_FIELDS.map((f) => COLUMN[f])];
  let columns = [...baseColumns, ...ACTIVATION_FIELDS.map((f) => ACTIVATION_COLUMN[f])].join(", ");
  for (let from = 0; ; from += pageSize) {
    let { data, error } = await supabase
      .from("progress_usage_snapshots")
      .select(columns)
      .gte("taken_at", since)
      .order("taken_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error && from === 0 && isMissingColumnError(error)) {
      columns = baseColumns.join(", ");
      ({ data, error } = await supabase
        .from("progress_usage_snapshots")
        .select(columns)
        .gte("taken_at", since)
        .order("taken_at", { ascending: false })
        .range(from, from + pageSize - 1));
    }
    if (error) throw new Error("Failed to read progress_usage_snapshots: " + error.message);
    const batch = (data ?? []) as unknown as Record<string, unknown>[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  const byDay = new Map<string, ProgressSnapshotCounts & { date: string; takenAt: string }>();
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

export interface ProgressBannerTestArmRow {
  arm: ProgressBannerArm;
  label: string;
  /** Its ?b= values, one per placement in the test. */
  bannerValues: string[];
  /** Estimated: half the eligible page views since the test started. Each
   * view is an independent 50/50 draw, so this is unbiased, but it is an
   * estimate (no per-view record of the arm is kept). */
  impressions: number;
  /** Landings on /progress from this arm's link. */
  clicks: number;
  ctr: number;
  /** Join form sends whose ?b= was this arm's. */
  joins: number;
}

/** The trial/development-centre banner test (lib/progress-banner-test.ts).
 * Always cumulative from the test start, whatever the funnel's window. */
export interface ProgressBannerTest {
  startedAt: string;
  started: boolean;
  /** Human page views of the articles in the test since it started. */
  eligibleViews: number;
  arms: ProgressBannerTestArmRow[];
  /** P(B's CTR > A's), Beta(1 + clicks, 1 + impressions - clicks)
   * posteriors, closed form. Null before the test starts. */
  probBBeatsA: number | null;
  status: ProgressBannerTestStatus;
  statusText: string;
  minImpressionsPerArm: number;
  threshold: number;
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
  bannerTest: ProgressBannerTest;
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
 * articles (sponsor version), and every other article whose banner
 * audience isn't "coach" (lib/MDXContent.tsx): at the end until
 * PARENT_ARTICLE_BANNER_ENDED_AT, in the mid-article slot after it. Same
 * pages either way, so the impression count needs no cut-over. */
export function progressBannerOnPath(path: string, articleSlugs: Set<string>): ProgressPlacement | null {
  if (path === "/") return "home";
  if (path === "/academy-pathway") return "academy-pathway";
  if (path.startsWith("/coaching/") || path.startsWith("/football-parent-coach-app")) return null;
  const slug = path.split("/").filter(Boolean).pop();
  if (!slug || !articleSlugs.has(slug) || COACH_AUDIENCE_SLUGS.has(slug)) return null;
  return path.startsWith("/academy-pathway/") ? "academy-pathway" : "article";
}

// progress-<placement>, or progress-<placement>-a / -b from the banner test:
// both arms count for their placement like any other click.
function placementOf(banner: string | null): ProgressPlacement | null {
  return parseProgressBanner(banner)?.placement ?? null;
}

const ARM_LABEL: Record<ProgressBannerArm, string> = {
  a: "A: current copy (control)",
  b: "B: trial and development centre copy",
};

function testStatusText(status: ProgressBannerTestStatus, armImpressions: number, prob: number | null): string {
  const pctProb = prob === null ? "" : `${(prob * 100).toFixed(1)}%`;
  const min = PROGRESS_BANNER_TEST_MIN_IMPRESSIONS.toLocaleString("en-GB");
  switch (status) {
    case "not-started":
      return `Not started: the test starts at ${PROGRESS_BANNER_TEST_STARTED_AT}.`;
    case "running":
      return `Keep running: about ${Math.round(armImpressions).toLocaleString("en-GB")} of ${min} impressions per arm so far (B ahead with probability ${pctProb}; too early to call).`;
    case "b-wins":
      return `B wins: ${pctProb} probability that B's CTR beats A's, with ${min}+ impressions per arm. Stop the test and make B the banner.`;
    case "a-wins":
      return `A wins: only ${pctProb} probability that B beats A, with ${min}+ impressions per arm. Stop the test and keep A.`;
    case "draw":
      return `Draw: ${min}+ impressions per arm and B beats A with probability ${pctProb}, short of 95% either way. Neither copy is clearly better.`;
  }
}

export async function getProgressFunnel(days: number = 30): Promise<ProgressFunnel> {
  const supabase = adminClient();
  const requestedSince = Date.now() - days * 24 * 60 * 60 * 1000;
  const trackingStart = Date.parse(PROGRESS_TRACKING_STARTED_AT);
  const clampedToTrackingStart = trackingStart > requestedSince;
  const since = new Date(Math.max(requestedSince, trackingStart)).toISOString();
  const articleSlugs = getAllArticleSlugs();
  // The banner test reads from its own start, which may be before the
  // window: rows are fetched from the earlier of the two and everything
  // else filters back to `since`.
  const testStart = Date.parse(PROGRESS_BANNER_TEST_STARTED_AT);
  const testStarted = testStart <= Date.now();
  const readFrom = testStarted && testStart < Date.parse(since) ? PROGRESS_BANNER_TEST_STARTED_AT : since;

  // Every human page view in the window: impressions need the whole site,
  // and /progress views come out of the same pass.
  async function readAllViews(): Promise<ViewRow[]> {
    const rows: ViewRow[] = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("page_views")
        .select("path, referrer_host, utm_source, utm_medium, gclid, banner_variant, user_agent, created_at")
        .gte("created_at", readFrom)
        .order("id", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw new Error("Failed to read page_views: " + error.message);
      const batch = (data ?? []) as ViewRow[];
      rows.push(...batch);
      if (batch.length < pageSize) break;
    }
    return rows.filter((r) => isHuman(r.user_agent));
  }

  const [allViews, joinResult, usage] = await Promise.all([
    readAllViews(),
    supabase
      .from("progress_join_events")
      .select(
        "form, entry_path, entry_source_group, banner, utm_source, utm_medium, utm_campaign, had_gclid, marketing_opt_in, user_agent, created_at"
      )
      .gte("created_at", readFrom)
      .order("created_at", { ascending: false })
      .limit(5000),
    getProgressUsage(supabase, days).catch((err: unknown) => ({
      error: err instanceof Error ? err.message : "Unknown error",
    })),
  ]);

  const allJoinRows = ((joinResult.data ?? []) as JoinRow[]).filter((r) => isHuman(r.user_agent));
  // created_at and since are both ISO UTC strings from Postgres/JS; compare
  // as instants, not text, since Postgres writes "+00:00" rather than "Z".
  const sinceMs = Date.parse(since);
  const views = allViews.filter((v) => Date.parse(v.created_at) >= sinceMs);
  const joinRows = allJoinRows.filter((r) => Date.parse(r.created_at) >= sinceMs);
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

  // The banner test, cumulative from its start.
  const testArms = new Map<ProgressBannerArm, { clicks: number; joins: number }>([
    ["a", { clicks: 0, joins: 0 }],
    ["b", { clicks: 0, joins: 0 }],
  ]);
  let eligibleViews = 0;
  if (testStarted) {
    for (const v of allViews) {
      if (Date.parse(v.created_at) < testStart) continue;
      if (inProgressBannerTest(v.path) && progressBannerOnPath(v.path, articleSlugs)) eligibleViews++;
      if (v.path !== LANDING_PATH) continue;
      const arm = parseProgressBanner(v.banner_variant)?.arm;
      if (arm) testArms.get(arm)!.clicks++;
    }
    for (const r of allJoinRows) {
      if (Date.parse(r.created_at) < testStart) continue;
      const arm = parseProgressBanner(r.banner)?.arm;
      if (arm) testArms.get(arm)!.joins++;
    }
  }
  // Randomised 50/50 per view, so half the eligible views is each arm's
  // unbiased impression estimate (see lib/progress-banner-test.ts).
  const armImpressions = eligibleViews / 2;
  const armRows: ProgressBannerTestArmRow[] = (["a", "b"] as const).map((arm) => {
    const t = testArms.get(arm)!;
    return {
      arm,
      label: ARM_LABEL[arm],
      bannerValues: [progressBannerArmValue("article", arm), progressBannerArmValue("academy-pathway", arm)],
      impressions: armImpressions,
      clicks: t.clicks,
      ctr: armImpressions > 0 ? t.clicks / armImpressions : 0,
      joins: t.joins,
    };
  });
  const probBBeatsA = testStarted
    ? probabilityBBeatsA(
        { clicks: armRows[0].clicks, impressions: armImpressions },
        { clicks: armRows[1].clicks, impressions: armImpressions }
      )
    : null;
  const testStatus = progressBannerTestStatus(testStarted, armImpressions, armImpressions, probBBeatsA ?? 0.5);
  const bannerTest: ProgressBannerTest = {
    startedAt: PROGRESS_BANNER_TEST_STARTED_AT,
    started: testStarted,
    eligibleViews,
    arms: armRows,
    probBBeatsA,
    status: testStatus,
    statusText: testStatusText(testStatus, armImpressions, probBBeatsA),
    minImpressionsPerArm: PROGRESS_BANNER_TEST_MIN_IMPRESSIONS,
    threshold: PROGRESS_BANNER_TEST_THRESHOLD,
  };

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
    bannerTest,
  };
}

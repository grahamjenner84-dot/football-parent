import { createClient } from "@supabase/supabase-js";
import { matchesKnownBotPattern } from "@/lib/user-agent-bots";
import { classifyReferrerHost } from "@/lib/referrer-sources";
import {
  COACH_APP_CHANNELS,
  channelFor,
  channelForPageView,
  type CoachAppChannel,
} from "@/lib/coach-app-channels";
import { getCoachAppShareStats, type CoachAppShareStats } from "@/lib/supabase/coach-app-shares";
import { PARENT_ARTICLE_BANNER_ENDED_AT, SHARE_AUDIENCE_SLUGS } from "@/app/components/CoachAppBanner";

// Server-only client using the service role key (football-parent-social),
// same pattern as the other lib/supabase modules. Never import from client
// code, and never point at the Coach App project.
function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// ---------------------------------------------------------------------------
// Writing sign-ups (from /api/coach-app-signup, called by the app)
// ---------------------------------------------------------------------------

export interface SignupEvent {
  attributed: boolean;
  landingPath: string | null;
  entryPath: string | null;
  entrySourceGroup: string | null;
  banner: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  hadGclid: boolean;
}

const SIGNUP_FLOOD_WINDOW_MS = 60_000;
// Real sign-ups arrive a few a day at most. Twenty in a minute is somebody
// posting to the endpoint, not coaches.
const SIGNUP_FLOOD_THRESHOLD = 20;

export async function logCoachAppSignup(event: SignupEvent, userAgent: string | null): Promise<void> {
  const supabase = adminClient();

  const since = new Date(Date.now() - SIGNUP_FLOOD_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("coach_app_signups")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if ((count ?? 0) >= SIGNUP_FLOOD_THRESHOLD) return;

  const { error } = await supabase.from("coach_app_signups").insert({
    attributed: event.attributed,
    landing_path: event.landingPath,
    entry_path: event.entryPath,
    entry_source_group: event.entrySourceGroup,
    banner: event.banner,
    utm_source: event.utmSource,
    utm_medium: event.utmMedium,
    utm_campaign: event.utmCampaign,
    had_gclid: event.hadGclid,
    user_agent: userAgent,
  });
  if (error) {
    throw new Error("Failed to insert coach_app_signups row: " + error.message);
  }
}

// ---------------------------------------------------------------------------
// Usage snapshots (from /api/coach-app-snapshot, posted by the Coach App
// project's own database every 10 minutes)
// ---------------------------------------------------------------------------

/** Whole-app counts from the Coach App database, Graham's accounts left out.
 * Definitions live with the query: usage_snapshot_counts() in coach-app
 * migration 0039. */
export interface CoachAppUsageCounts {
  totalAccounts: number;
  /** Accounts created since UK midnight. */
  signupsToday: number;
  /** Of those, how many are already on a team. Null in snapshots sent
   * before the Coach App started reporting it. */
  signupsTodayWithTeam: number | null;
  /** Accounts that opened the app since UK midnight. */
  activeToday: number;
  /** Accounts that opened the app in the last 7 days. */
  active7d: number;
  /** Accounts on at least one team (a team exists once onboarding is done). */
  accountsWithTeam: number;
  /** League/cup/friendly and tournament games marked finished. */
  finishedMatches: number;
  /** Accounts on a team with at least one finished match. */
  accountsWithFinishedMatch: number;
  /** Finished matches whose last event (the "Full time" marker) is since UK
   * midnight (coach-app migration 0063). Unlike the day's change in
   * finishedMatches, not reduced by an account being excluded or a match
   * deleted. Null in snapshots sent before the Coach App started reporting it. */
  finishedMatchesToday: number | null;
  /** Each account's own plan; the three add up to totalAccounts. Paid
   * includes a subscription whose payment is being retried. Lapsed is a
   * trial that ended, a cancelled subscription, or an old free account. */
  planPaid: number;
  planTrial: number;
  planLapsed: number;
  /** Scheduled emails sent since UK midnight: match reminders by email,
   * set-up nudges and trial emails (coach-app migration 0060). Not sign-in
   * emails, which Supabase Auth sends unrecorded. Null in snapshots sent
   * before the Coach App started reporting it, or before this site's column
   * (20261010090000_usage_snapshot_emails_today.sql) existed. */
  emailsToday: number | null;
}

// PostgREST reports an unknown column as PGRST204 (insert) and Postgres as
// 42703; both mean a migration hasn't been applied yet. See
// lib/supabase/page-views.ts for why both codes matter.
function isMissingColumnError(error: { code?: string }): boolean {
  return error.code === "PGRST204" || error.code === "42703";
}

export async function logCoachAppUsageSnapshot(takenAt: string, counts: CoachAppUsageCounts): Promise<void> {
  const row = {
    taken_at: takenAt,
    total_accounts: counts.totalAccounts,
    signups_today: counts.signupsToday,
    signups_today_with_team: counts.signupsTodayWithTeam,
    active_today: counts.activeToday,
    active_7d: counts.active7d,
    accounts_with_team: counts.accountsWithTeam,
    finished_matches: counts.finishedMatches,
    accounts_with_finished_match: counts.accountsWithFinishedMatch,
    plan_paid: counts.planPaid,
    plan_trial: counts.planTrial,
    plan_lapsed: counts.planLapsed,
  };
  const supabase = adminClient();
  const { error } = await supabase
    .from("coach_app_usage_snapshots")
    .insert({ ...row, emails_today: counts.emailsToday, finished_matches_today: counts.finishedMatchesToday });
  // Deployed before 20261010090000_usage_snapshot_emails_today.sql or
  // 20261018220000_coach_app_usage_finished_today.sql was applied: keep the
  // snapshot, drop the optional counts, rather than lose every snapshot until
  // the migration runs.
  if (error && isMissingColumnError(error)) {
    const retry = await supabase.from("coach_app_usage_snapshots").insert(row);
    if (!retry.error) return;
    throw new Error("Failed to insert coach_app_usage_snapshots row: " + retry.error.message);
  }
  if (error) {
    throw new Error("Failed to insert coach_app_usage_snapshots row: " + error.message);
  }
}

export interface CoachAppUsage {
  /** The most recent snapshot, or null before the first one arrives. */
  latest: (CoachAppUsageCounts & { takenAt: string }) | null;
  /** The last snapshot of each UK day, newest first: that day's closing
   * figures, so activeToday there is the day's active accounts. */
  byDay: (CoachAppUsageCounts & { date: string; takenAt: string })[];
}

type SnapshotRow = {
  taken_at: string;
  total_accounts: number;
  signups_today: number;
  signups_today_with_team: number | null;
  active_today: number;
  active_7d: number;
  accounts_with_team: number;
  finished_matches: number;
  accounts_with_finished_match: number;
  plan_paid: number;
  plan_trial: number;
  plan_lapsed: number;
  emails_today?: number | null;
  finished_matches_today?: number | null;
};

function snapshotCounts(r: SnapshotRow): CoachAppUsageCounts & { takenAt: string } {
  return {
    takenAt: r.taken_at,
    totalAccounts: r.total_accounts,
    signupsToday: r.signups_today,
    signupsTodayWithTeam: r.signups_today_with_team,
    activeToday: r.active_today,
    active7d: r.active_7d,
    accountsWithTeam: r.accounts_with_team,
    finishedMatches: r.finished_matches,
    accountsWithFinishedMatch: r.accounts_with_finished_match,
    planPaid: r.plan_paid,
    planTrial: r.plan_trial,
    planLapsed: r.plan_lapsed,
    emailsToday: typeof r.emails_today === "number" ? r.emails_today : null,
    finishedMatchesToday: typeof r.finished_matches_today === "number" ? r.finished_matches_today : null,
  };
}

const londonDay = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date(iso));

async function getCoachAppUsage(supabase: ReturnType<typeof adminClient>, days: number): Promise<CoachAppUsage> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const rows: SnapshotRow[] = [];
  const pageSize = 1000;
  // Newest first, so the first row seen for each day is its closing figure.
  // Without the emails_today or finished_matches_today migration those
  // columns don't exist and selecting them fails: fall back to the rest
  // (they then read as null) so the tab still loads.
  const baseColumns =
    "taken_at, total_accounts, signups_today, signups_today_with_team, active_today, active_7d, accounts_with_team, finished_matches, accounts_with_finished_match, plan_paid, plan_trial, plan_lapsed";
  let columns = baseColumns + ", emails_today, finished_matches_today";
  for (let from = 0; ; from += pageSize) {
    const read = () =>
      supabase
        .from("coach_app_usage_snapshots")
        .select(columns)
        .gte("taken_at", since)
        .order("taken_at", { ascending: false })
        .range(from, from + pageSize - 1);
    let { data, error } = await read();
    if (error && from === 0 && isMissingColumnError(error)) {
      columns = baseColumns;
      ({ data, error } = await read());
    }
    if (error) throw new Error("Failed to read coach_app_usage_snapshots: " + error.message);
    const batch = (data ?? []) as unknown as SnapshotRow[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  const byDay = new Map<string, CoachAppUsageCounts & { date: string; takenAt: string }>();
  for (const r of rows) {
    const date = londonDay(r.taken_at);
    if (!byDay.has(date)) byDay.set(date, { date, ...snapshotCounts(r) });
  }

  return {
    latest: rows.length > 0 ? snapshotCounts(rows[0]) : null,
    byDay: Array.from(byDay.values()),
  };
}

// ---------------------------------------------------------------------------
// The funnel report
// ---------------------------------------------------------------------------

// When the funnel tab went live (merged to main 2026-09-25 ~21:30 UTC). Every
// number on the tab starts here, visits included, not only sign-ups: the
// channel table puts visits and sign-ups side by side, and counting weeks of
// visits against a few hours of sign-ups made every channel look like it
// converted nobody. Earlier sign-ups exist only in the Coach App project
// (profiles.acquisition_*). Update only if the funnel is restarted.
export const FUNNEL_TRACKING_STARTED_AT = "2026-09-25T21:30:00Z";

const LANDING_PREFIX = "/football-parent-coach-app";
const SIGN_IN_PATH = "/coach-app/sign-in";
const COACHING_PREFIX = "/coaching/";
// The calculator is an SEO page, but Google Ads also send clicks to it
// (from 2026-10-11). Those ad clicks count as landing views, like the ad
// variants under LANDING_PREFIX; its organic views stay on the SEO side only.
const CALCULATOR_PATH = "/coaching/equal-playing-time-calculator";

export interface FunnelChannelRow {
  channel: CoachAppChannel;
  /** Views of the Coach App landing pages (main page and ad variants), plus
   * Google Ads clicks landing on the equal playing time calculator. */
  landingViews: number;
  /** Views of the app's own sign-in screen. */
  signInViews: number;
  /** Sign-ups in the same window. */
  signups: number;
}

/** One sign-up form: views of the page it sits on, and the sign-ups that
 * report it as where they signed up (coach_app_signups.landing_path). */
export interface FunnelFormRow {
  /** Null for sign-ups that reported no page at all. */
  path: string | null;
  /** Human views of the page; null where the path is not a page this
   * report reads views for (e.g. /coach-app/android-install). */
  views: number | null;
  signups: number;
  /** Of those, how many carried no channel (Unknown): the coach declined
   * analytics cookies, so only the form is known, from the sign-in
   * redirect (coach-app src/data/signupSurface.ts). */
  unknownChannel: number;
}

export interface FunnelSignup {
  createdAt: string;
  channel: CoachAppChannel;
  landingPath: string | null;
  entryPath: string | null;
  banner: string | null;
  utmCampaign: string | null;
}

export interface CoachingArticleRow {
  path: string;
  views: number;
  /** Views whose visit began from a search engine (organic: ad clicks,
   * which also arrive from Google, are grouped as Ads). */
  searchViews: number;
}

export interface CoachAppFunnel {
  days: number;
  /** Start of every number on the tab: the later of `days` ago and
   * FUNNEL_TRACKING_STARTED_AT. */
  since: string;
  /** True when the window was cut short by FUNNEL_TRACKING_STARTED_AT. */
  clampedToTrackingStart: boolean;
  channels: FunnelChannelRow[];
  totals: { landingViews: number; signInViews: number; signups: number };
  /** Newest first, capped. Anonymous: no account is identifiable here. */
  recentSignups: FunnelSignup[];
  signupsByDay: { date: string; signups: number }[];
  /** Views against sign-ups per form: the Coach App page, its ad variants,
   * the calculator page and the app's own sign-in screen, plus any other
   * page a sign-up names. Older sign-ups with no channel mostly have no
   * page either: the form only started riding along on the sign-in
   * redirect in October 2026. */
  bySignupForm: FunnelFormRow[];
  /** Traffic to the /coaching/ articles, the SEO side of the funnel. */
  coachingArticles: {
    totalViews: number;
    searchViews: number;
    bySourceGroup: { group: string; views: number }[];
    byArticle: CoachingArticleRow[];
  };
  /** Null with an error message if the share table can't be read. */
  sharing: CoachAppShareStats | { error: string };
  /** Views of the articles carrying the share banner, over the same window
   * as everything else on the tab: the denominator for share taps. */
  shareBannerImpressions: number;
  /** Present if coach_app_signups couldn't be read (e.g. migration missing). */
  signupsError?: string;
  /** Whole-app counts from the Coach App database. Not clamped to
   * FUNNEL_TRACKING_STARTED_AT: the totals are all-time by definition. */
  usage: CoachAppUsage | { error: string };
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

type SignupRow = {
  attributed: boolean;
  landing_path: string | null;
  entry_path: string | null;
  entry_source_group: string | null;
  banner: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  had_gclid: boolean;
  user_agent: string | null;
  created_at: string;
};

async function readViews(
  supabase: ReturnType<typeof adminClient>,
  since: string,
  filter: { like?: string; eq?: string }
): Promise<ViewRow[]> {
  const rows: ViewRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    let q = supabase
      .from("page_views")
      .select("path, referrer_host, utm_source, utm_medium, gclid, banner_variant, user_agent, created_at")
      .gte("created_at", since);
    if (filter.like) q = q.like("path", filter.like);
    if (filter.eq) q = q.eq("path", filter.eq);
    const { data, error } = await q.order("id", { ascending: true }).range(from, from + pageSize - 1);
    if (error) throw new Error("Failed to read page_views: " + error.message);
    const batch = (data ?? []) as ViewRow[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

const isHuman = (ua: string | null) => !ua || !matchesKnownBotPattern(ua);

// Views of the grassroots articles that carry the share banner
// (SHARE_AUDIENCE_SLUGS, never /coaching/), from `since`. Counted here rather
// than taken from the banner test report, whose window goes back to
// 2026-09-04 and would set weeks of views against hours of taps.
// Stops at PARENT_ARTICLE_BANNER_ENDED_AT, when those articles swapped the
// share banner for Progress.
async function countShareBannerImpressions(
  supabase: ReturnType<typeof adminClient>,
  since: string
): Promise<number> {
  let count = 0;
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("page_views")
      .select("path, user_agent")
      .gte("created_at", since)
      .lt("created_at", PARENT_ARTICLE_BANNER_ENDED_AT)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error("Failed to read page_views: " + error.message);
    const batch = (data ?? []) as { path: string; user_agent: string | null }[];
    for (const row of batch) {
      if (row.path.startsWith(COACHING_PREFIX) || !isHuman(row.user_agent)) continue;
      const slug = row.path.split("/").filter(Boolean).pop();
      if (slug && SHARE_AUDIENCE_SLUGS.has(slug)) count++;
    }
    if (batch.length < pageSize) break;
  }
  return count;
}

function signupChannel(row: SignupRow): CoachAppChannel {
  return channelFor({
    attributed: row.attributed,
    hasGclid: row.had_gclid,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    banner: row.banner,
    sourceGroup: row.entry_source_group,
  });
}

export async function getCoachAppFunnel(days: number = 30): Promise<CoachAppFunnel> {
  const supabase = adminClient();
  const requestedSince = Date.now() - days * 24 * 60 * 60 * 1000;
  const trackingStart = Date.parse(FUNNEL_TRACKING_STARTED_AT);
  const clampedToTrackingStart = trackingStart > requestedSince;
  const since = new Date(Math.max(requestedSince, trackingStart)).toISOString();

  const [landingRows, signInRows, coachingRows, signupResult, sharing, shareBannerImpressions, usage] = await Promise.all([
    readViews(supabase, since, { like: `${LANDING_PREFIX}%` }),
    readViews(supabase, since, { eq: SIGN_IN_PATH }),
    readViews(supabase, since, { like: `${COACHING_PREFIX}%` }),
    supabase
      .from("coach_app_signups")
      .select(
        "attributed, landing_path, entry_path, entry_source_group, banner, utm_source, utm_medium, utm_campaign, had_gclid, user_agent, created_at"
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000),
    getCoachAppShareStats(days, since).catch((err: unknown) => ({
      error: err instanceof Error ? err.message : "Unknown error",
    })),
    countShareBannerImpressions(supabase, since),
    getCoachAppUsage(supabase, days).catch((err: unknown) => ({
      error: err instanceof Error ? err.message : "Unknown error",
    })),
  ]);

  const signupRows = ((signupResult.data ?? []) as SignupRow[]).filter((r) => isHuman(r.user_agent));
  const signupsError = signupResult.error?.message;

  const byChannel = new Map<CoachAppChannel, FunnelChannelRow>(
    COACH_APP_CHANNELS.map((channel) => [channel, { channel, landingViews: 0, signInViews: 0, signups: 0 }])
  );
  for (const row of landingRows) {
    if (isHuman(row.user_agent)) byChannel.get(channelForPageView(row))!.landingViews++;
  }
  for (const row of coachingRows) {
    if (row.path === CALCULATOR_PATH && isHuman(row.user_agent) && channelForPageView(row) === "Google Ads") {
      byChannel.get("Google Ads")!.landingViews++;
    }
  }
  for (const row of signInRows) {
    if (isHuman(row.user_agent)) byChannel.get(channelForPageView(row))!.signInViews++;
  }
  for (const row of signupRows) byChannel.get(signupChannel(row))!.signups++;

  const channels = Array.from(byChannel.values()).filter(
    (r) => r.landingViews + r.signInViews + r.signups > 0
  );
  const totals = channels.reduce(
    (t, r) => ({
      landingViews: t.landingViews + r.landingViews,
      signInViews: t.signInViews + r.signInViews,
      signups: t.signups + r.signups,
    }),
    { landingViews: 0, signInViews: 0, signups: 0 }
  );

  const formMap = new Map<string | null, FunnelFormRow>();
  const formRow = (path: string | null) => {
    let row = formMap.get(path);
    if (!row) {
      row = { path, views: null, signups: 0, unknownChannel: 0 };
      formMap.set(path, row);
    }
    return row;
  };
  for (const r of [...landingRows, ...signInRows, ...coachingRows.filter((c) => c.path === CALCULATOR_PATH)]) {
    if (!isHuman(r.user_agent)) continue;
    const row = formRow(r.path);
    row.views = (row.views ?? 0) + 1;
  }
  for (const r of signupRows) {
    const row = formRow(r.landing_path);
    row.signups++;
    if (signupChannel(r) === "Unknown") row.unknownChannel++;
  }
  const bySignupForm = Array.from(formMap.values()).sort(
    (a, b) => b.signups - a.signups || (b.views ?? 0) - (a.views ?? 0)
  );

  const dayMap = new Map<string, number>();
  for (const r of signupRows) {
    const d = r.created_at.slice(0, 10);
    dayMap.set(d, (dayMap.get(d) ?? 0) + 1);
  }

  const humanCoaching = coachingRows.filter((r) => isHuman(r.user_agent));
  const groupMap = new Map<string, number>();
  const articleMap = new Map<string, CoachingArticleRow>();
  for (const r of humanCoaching) {
    // Same rule as getPageViewStats: a gclid marks an ad click, which the
    // referrer alone would file under Search.
    const group = r.gclid ? "Ads" : classifyReferrerHost(r.referrer_host).group;
    groupMap.set(group, (groupMap.get(group) ?? 0) + 1);
    let a = articleMap.get(r.path);
    if (!a) {
      a = { path: r.path, views: 0, searchViews: 0 };
      articleMap.set(r.path, a);
    }
    a.views++;
    if (group === "Search") a.searchViews++;
  }

  return {
    days,
    since,
    clampedToTrackingStart,
    channels,
    totals,
    recentSignups: signupRows.slice(0, 50).map((r) => ({
      createdAt: r.created_at,
      channel: signupChannel(r),
      landingPath: r.landing_path,
      entryPath: r.entry_path,
      banner: r.banner,
      utmCampaign: r.utm_campaign,
    })),
    signupsByDay: Array.from(dayMap.entries())
      .map(([date, signups]) => ({ date, signups }))
      .sort((a, b) => b.date.localeCompare(a.date)),
    bySignupForm,
    coachingArticles: {
      totalViews: humanCoaching.length,
      searchViews: groupMap.get("Search") ?? 0,
      bySourceGroup: Array.from(groupMap.entries())
        .map(([group, views]) => ({ group, views }))
        .sort((a, b) => b.views - a.views),
      byArticle: Array.from(articleMap.values()).sort((a, b) => b.views - a.views),
    },
    sharing,
    shareBannerImpressions,
    ...(signupsError ? { signupsError } : {}),
    usage,
  };
}

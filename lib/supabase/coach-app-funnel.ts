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
import { SHARE_AUDIENCE_SLUGS } from "@/app/components/CoachAppBanner";

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
// Writing active days (from /api/coach-app-active, called by the app)
// ---------------------------------------------------------------------------

/** Today's date in the UK, YYYY-MM-DD. The app sends its own idea of the
 * day, and this is what that gets checked against. */
export function londonDay(date: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(date);
}

const ACTIVE_FLOOD_WINDOW_MS = 60_000;
// Well above what a few hundred coaches opening the app could produce in a
// minute; this is only here to stop someone filling the table by script.
const ACTIVE_FLOOD_THRESHOLD = 120;

export async function logCoachAppActiveDay(
  event: { day: string; dayToken: string; platform: string | null },
  userAgent: string | null
): Promise<void> {
  const supabase = adminClient();

  const since = new Date(Date.now() - ACTIVE_FLOOD_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("coach_app_active_days")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if ((count ?? 0) >= ACTIVE_FLOOD_THRESHOLD) return;

  // ignoreDuplicates: a second open the same day on the same device sends the
  // same (day, day_token) and is dropped by the unique index, not an error.
  const { error } = await supabase.from("coach_app_active_days").upsert(
    {
      day: event.day,
      day_token: event.dayToken,
      platform: event.platform,
      user_agent: userAgent,
    },
    { onConflict: "day,day_token", ignoreDuplicates: true }
  );
  if (error) {
    throw new Error("Failed to insert coach_app_active_days row: " + error.message);
  }
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

export interface FunnelChannelRow {
  channel: CoachAppChannel;
  /** Views of the Coach App landing pages (main page and ad variants). */
  landingViews: number;
  /** Views of the app's own sign-in screen. */
  signInViews: number;
  /** Sign-ups in the same window. */
  signups: number;
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
  /** Views whose visit began from a search engine. */
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
  /** Devices with a signed-in coach opening the app, per UK day. Not clamped
   * to FUNNEL_TRACKING_STARTED_AT: it has its own start, when the app began
   * sending it. */
  activeDays: CoachAppActiveDays | { error: string };
}

export interface CoachAppActiveDays {
  /** Today's UK date and its count so far. */
  today: { date: string; devices: number };
  /** Newest first, only days with at least one device. */
  byDay: { date: string; devices: number; web: number; android: number }[];
}

async function getActiveDays(
  supabase: ReturnType<typeof adminClient>,
  days: number
): Promise<CoachAppActiveDays> {
  const today = londonDay();
  const fromDay = londonDay(new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000));
  const rows: { day: string; platform: string | null; user_agent: string | null }[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("coach_app_active_days")
      .select("day, platform, user_agent")
      .gte("day", fromDay)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error("Failed to read coach_app_active_days: " + error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  const byDay = new Map<string, { date: string; devices: number; web: number; android: number }>();
  for (const row of rows) {
    if (!isHuman(row.user_agent)) continue;
    let d = byDay.get(row.day);
    if (!d) {
      d = { date: row.day, devices: 0, web: 0, android: 0 };
      byDay.set(row.day, d);
    }
    d.devices++;
    if (row.platform === "android") d.android++;
    else d.web++;
  }

  return {
    today: { date: today, devices: byDay.get(today)?.devices ?? 0 },
    byDay: Array.from(byDay.values()).sort((a, b) => b.date.localeCompare(a.date)),
  };
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

  const [landingRows, signInRows, coachingRows, signupResult, sharing, shareBannerImpressions, activeDays] = await Promise.all([
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
    getActiveDays(supabase, days).catch((err: unknown) => ({
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

  const dayMap = new Map<string, number>();
  for (const r of signupRows) {
    const d = r.created_at.slice(0, 10);
    dayMap.set(d, (dayMap.get(d) ?? 0) + 1);
  }

  const humanCoaching = coachingRows.filter((r) => isHuman(r.user_agent));
  const groupMap = new Map<string, number>();
  const articleMap = new Map<string, CoachingArticleRow>();
  for (const r of humanCoaching) {
    const group = classifyReferrerHost(r.referrer_host).group;
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
    activeDays,
  };
}

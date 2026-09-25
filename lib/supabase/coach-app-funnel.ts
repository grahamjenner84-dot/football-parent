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
// The funnel report
// ---------------------------------------------------------------------------

// Sign-up events started with this deploy. Earlier sign-ups exist only in
// the Coach App project (profiles.acquisition_*).
export const SIGNUP_TRACKING_STARTED_AT = "2026-09-25T00:00:00Z";

const LANDING_PREFIX = "/football-parent-coach-app";
const SIGN_IN_PATH = "/coach-app/sign-in";
const COACHING_PREFIX = "/coaching/";

export interface FunnelChannelRow {
  channel: CoachAppChannel;
  /** Views of the Coach App landing pages (main page and ad variants). */
  landingViews: number;
  /** Views of the app's own sign-in screen. */
  signInViews: number;
  /** Sign-ups since SIGNUP_TRACKING_STARTED_AT (clamped to the window). */
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
  since: string;
  signupsSince: string;
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
  /** Present if coach_app_signups couldn't be read (e.g. migration missing). */
  signupsError?: string;
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
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const signupsSince = new Date(
    Math.max(Date.parse(since), Date.parse(SIGNUP_TRACKING_STARTED_AT))
  ).toISOString();

  const [landingRows, signInRows, coachingRows, signupResult, sharing] = await Promise.all([
    readViews(supabase, since, { like: `${LANDING_PREFIX}%` }),
    readViews(supabase, since, { eq: SIGN_IN_PATH }),
    readViews(supabase, since, { like: `${COACHING_PREFIX}%` }),
    supabase
      .from("coach_app_signups")
      .select(
        "attributed, landing_path, entry_path, entry_source_group, banner, utm_source, utm_medium, utm_campaign, had_gclid, user_agent, created_at"
      )
      .gte("created_at", signupsSince)
      .order("created_at", { ascending: false })
      .limit(5000),
    getCoachAppShareStats(days).catch((err: unknown) => ({
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
    signupsSince,
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
    ...(signupsError ? { signupsError } : {}),
  };
}

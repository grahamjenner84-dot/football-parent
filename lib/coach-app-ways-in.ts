import { getSectionSearchSummary, type SectionSearchRow } from "@/lib/gsc";
import { getCampaignPerformance } from "@/lib/google-ads";
import { getPlayInstallStats } from "@/lib/play-installs";
import { addDays, ukToday } from "@/lib/uk-day";
import { getCoachAppFunnel, type CoachAppFunnel } from "@/lib/supabase/coach-app-funnel";

// The outside half of the Coach App's ways in, for the Coach App tab on
// /admin/seo: Search Console for the Coach App page and the coaching
// articles, Google Ads for the Coach App campaigns, and Play installs for
// the Android app. Each source fails on its own (missing credentials, an API
// error) without taking the others down. The site's own half (visits and
// sign-ups by channel) is in lib/supabase/coach-app-funnel.ts, and how good
// each channel's sign-ups turn out in the Coach App's insights.

/** The pages that make up the Coach App's search footprint. */
export const COACH_APP_SEARCH_PATHS = ["/football-parent-coach-app", "/coaching"];

// Search Console posts a day 2-3 days late; ending 3 days back keeps the
// window complete, the same as getSeoReport. The period (7, 28 or 90 days)
// is the tab's filter; the comparison is the same number of days before.
const GSC_LAG_DAYS = 3;
/** The periods the tab offers; anything else falls back to 28. */
export const WAYS_IN_PERIODS = [7, 28, 90] as const;
export type WaysInDays = (typeof WAYS_IN_PERIODS)[number];
export function waysInDays(value: unknown): WaysInDays {
  const n = Number(value);
  return (WAYS_IN_PERIODS as readonly number[]).includes(n) ? (n as WaysInDays) : 28;
}

export interface SearchPageRow {
  path: string;
  clicks: number;
  impressions: number;
  position: number | null;
  prevClicks: number;
  prevImpressions: number;
  prevPosition: number | null;
}

export interface SearchQueryRow {
  query: string;
  clicks: number;
  impressions: number;
  position: number | null;
  prevImpressions: number;
  prevPosition: number | null;
}

export interface CoachAppWaysIn {
  days: WaysInDays;
  /** Search Console, Ads and Play window (ending 3 days ago, as Google posts
   * late), and the same number of days before it for search. */
  window: { start: string; end: string; prevStart: string; prevEnd: string };
  /** This site's own visits and sign-ups over the last `days` days to today. */
  site:
    | Pick<
        CoachAppFunnel,
        | "days"
        | "since"
        | "clampedToTrackingStart"
        | "channels"
        | "bySignupForm"
        | "signupsByEntryPath"
        | "landingPages"
        | "coachingArticles"
      >
    | { error: string };
  search:
    | {
        totals: { clicks: number; impressions: number; position: number | null };
        prevTotals: { clicks: number; impressions: number; position: number | null };
        pages: SearchPageRow[];
        queries: SearchQueryRow[];
      }
    | { error: string };
  /** Coach App campaigns only: any campaign named for Progress is left out. */
  ads:
    | {
        impressions: number;
        clicks: number;
        costGBP: number;
        conversions: number;
        campaigns: { campaign: string; status: string | null; impressions: number; clicks: number; costGBP: number; conversions: number }[];
      }
    | { error: string };
  play: { userInstalls: number; deviceInstalls: number; latestDate: string | null } | { error: string };
}

function totals(rows: SectionSearchRow[]) {
  let clicks = 0;
  let impressions = 0;
  let weighted = 0;
  for (const r of rows) {
    clicks += r.clicks;
    impressions += r.impressions;
    weighted += (r.position ?? 0) * r.impressions;
  }
  return { clicks, impressions, position: impressions ? Math.round((weighted / impressions) * 10) / 10 : null };
}

const errorOf = (err: unknown) => ({ error: err instanceof Error ? err.message : "Unknown error" });

async function searchPart(window: CoachAppWaysIn["window"]): Promise<CoachAppWaysIn["search"]> {
  const [cur, prev] = await Promise.all([
    getSectionSearchSummary(COACH_APP_SEARCH_PATHS, window.start, window.end),
    getSectionSearchSummary(COACH_APP_SEARCH_PATHS, window.prevStart, window.prevEnd),
  ]);
  const prevPages = new Map(prev.pages.map((r) => [r.key, r]));
  const pagePaths = new Set([...cur.pages.map((r) => r.key), ...prev.pages.map((r) => r.key)]);
  const curPages = new Map(cur.pages.map((r) => [r.key, r]));
  const pages: SearchPageRow[] = Array.from(pagePaths).map((path) => {
    const c = curPages.get(path);
    const p = prevPages.get(path);
    return {
      path,
      clicks: c?.clicks ?? 0,
      impressions: c?.impressions ?? 0,
      position: c?.position ?? null,
      prevClicks: p?.clicks ?? 0,
      prevImpressions: p?.impressions ?? 0,
      prevPosition: p?.position ?? null,
    };
  });
  pages.sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);

  const prevQueries = new Map(prev.queries.map((r) => [r.key, r]));
  const queries: SearchQueryRow[] = cur.queries
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 25)
    .map((r) => ({
      query: r.key,
      clicks: r.clicks,
      impressions: r.impressions,
      position: r.position,
      prevImpressions: prevQueries.get(r.key)?.impressions ?? 0,
      prevPosition: prevQueries.get(r.key)?.position ?? null,
    }));

  return { totals: totals(cur.pages), prevTotals: totals(prev.pages), pages, queries };
}

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

async function adsPart(window: CoachAppWaysIn["window"]): Promise<CoachAppWaysIn["ads"]> {
  const report = (await getCampaignPerformance({ startDate: window.start, endDate: window.end })) as {
    rows?: { campaign: string | null; status: string | null; impressions: unknown; clicks: unknown; costGBP: unknown; conversions: unknown }[];
  };
  const campaigns = (report.rows ?? [])
    .filter((r) => r.campaign && !/progress/i.test(r.campaign))
    .map((r) => ({
      campaign: r.campaign as string,
      status: r.status,
      impressions: num(r.impressions),
      clicks: num(r.clicks),
      costGBP: num(r.costGBP),
      conversions: num(r.conversions),
    }));
  return {
    impressions: campaigns.reduce((t, c) => t + c.impressions, 0),
    clicks: campaigns.reduce((t, c) => t + c.clicks, 0),
    costGBP: campaigns.reduce((t, c) => t + c.costGBP, 0),
    conversions: campaigns.reduce((t, c) => t + c.conversions, 0),
    campaigns,
  };
}

async function playPart(window: CoachAppWaysIn["window"]): Promise<CoachAppWaysIn["play"]> {
  const stats = await getPlayInstallStats({ startDate: window.start, endDate: ukToday() });
  const rows = stats.byDay as Record<string, unknown>[];
  return {
    userInstalls: rows.reduce((t, r) => t + num(r["Daily User Installs"]), 0),
    deviceInstalls: rows.reduce((t, r) => t + num(r["Daily Device Installs"]), 0),
    latestDate: stats.latestDate,
  };
}

async function sitePart(days: WaysInDays): Promise<CoachAppWaysIn["site"]> {
  const f = await getCoachAppFunnel(days);
  return {
    days: f.days,
    since: f.since,
    clampedToTrackingStart: f.clampedToTrackingStart,
    channels: f.channels,
    bySignupForm: f.bySignupForm,
    signupsByEntryPath: f.signupsByEntryPath,
    landingPages: f.landingPages,
    coachingArticles: f.coachingArticles,
  };
}

export async function getCoachAppWaysIn(daysParam: unknown = 28): Promise<CoachAppWaysIn> {
  const days = waysInDays(daysParam);
  const end = addDays(ukToday(), -GSC_LAG_DAYS);
  const start = addDays(end, -(days - 1));
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(days - 1));
  const window = { start, end, prevStart, prevEnd };

  const [search, ads, play, site] = await Promise.all([
    searchPart(window).catch(errorOf),
    adsPart(window).catch(errorOf),
    playPart(window).catch(errorOf),
    sitePart(days).catch(errorOf),
  ]);
  return { days, window, site, search, ads, play };
}

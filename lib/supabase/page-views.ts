import { createClient } from "@supabase/supabase-js";
import { classifyReferrerHost, type SourceGroup } from "@/lib/referrer-sources";
import { matchesKnownBotPattern } from "@/lib/user-agent-bots";
import { getAllArticleSlugs } from "@/lib/content";
import { BANNER_TEST_STARTED_AT, bannerStyleForKey } from "@/app/components/CoachAppBanner";

// Server-only client using the service role key, same pattern as
// lib/supabase/cookie-consent.ts - this must never be imported from client
// code.
function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export interface LogPageViewOptions {
  referrerHost?: string | null;
  userAgent?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  bannerVariant?: string | null;
}

const FLOOD_WINDOW_MS = 60_000;
// Set from the 2026-08-26 incident (226 views on one path in 8 minutes,
// ~28-51/minute) - real single-page traffic essentially never sustains
// anywhere near this pace, so 30/minute gives headroom above genuine
// spikes while cutting a scripted flood off quickly.
const FLOOD_THRESHOLD = 30;

// True if `path` has already logged >= FLOOD_THRESHOLD views in the last
// minute. Silent drop rather than a 429: the client fetch in
// PageViewPing.tsx already ignores the response, and not signalling
// "you're being throttled" back to whatever is hammering the endpoint is
// simplest.
async function pathRecentlyFlooded(
  supabase: ReturnType<typeof adminClient>,
  path: string
): Promise<boolean> {
  const since = new Date(Date.now() - FLOOD_WINDOW_MS).toISOString();
  const { count, error } = await supabase
    .from("page_views")
    .select("id", { count: "exact", head: true })
    .eq("path", path)
    .gte("created_at", since);

  if (error) {
    throw new Error("Failed to check page_views flood window: " + error.message);
  }

  return (count ?? 0) >= FLOOD_THRESHOLD;
}

export async function logPageView(path: string, options: LogPageViewOptions = {}): Promise<void> {
  const supabase = adminClient();

  if (await pathRecentlyFlooded(supabase, path)) return;

  const { error } = await supabase.from("page_views").insert({
    path,
    referrer_host: options.referrerHost ?? null,
    user_agent: options.userAgent ?? null,
    utm_source: options.utmSource ?? null,
    utm_medium: options.utmMedium ?? null,
    utm_campaign: options.utmCampaign ?? null,
    gclid: options.gclid ?? null,
    fbclid: options.fbclid ?? null,
    banner_variant: options.bannerVariant ?? null,
  });

  if (error) {
    throw new Error("Failed to insert page_views row: " + error.message);
  }
}

export interface SourceCount {
  label: string;
  count: number;
}

export interface SourceGroupCount {
  group: SourceGroup;
  count: number;
  topSources: SourceCount[];
}

export interface PageViewDay {
  date: string;
  // Bot rows (see botViews below) are excluded from count/topPaths/
  // sourceGroups/estimatedVisits/internalViews - these are "true" human
  // numbers, not raw row counts.
  count: number;
  // Capped at TOP_PATHS_PER_DAY - totalPathCount below is the uncapped
  // number of distinct paths viewed that day, so the UI can say how much
  // of the list it is actually showing instead of truncating silently.
  topPaths: { path: string; count: number }[];
  totalPathCount: number;
  // Excludes rows classified "Internal" (on-site navigation, not a new
  // visit) - see the classifyReferrerHost comment on why that's a valid
  // proxy for "visits from this source" without needing a session id.
  sourceGroups: SourceGroupCount[];
  // Rows NOT classified "Internal" - i.e. every visit's first pageview,
  // since only the first page of a visit carries a referrer other than
  // this site itself. A proxy for "distinct visits" without a session id
  // or cookie - see the note on getPageViewStats for its limits.
  estimatedVisits: number;
  // Rows classified "Internal" - a visitor clicking to a second, third...
  // page in the same visit. count - internalViews should equal
  // estimatedVisits.
  internalViews: number;
  // Rows excluded as bot traffic - see isBotRow. Reported rather than
  // silently vanishing, so a day's "true" count is still auditable against
  // its raw total (count + botViews).
  botViews: number;
}

export interface PageViewStats {
  totalViews: number;
  byDay: PageViewDay[];
  // Capped at TOP_PATHS_OVERALL; totalPathCount is the uncapped number of
  // distinct paths viewed in the whole window - same reasoning as
  // PageViewDay.topPaths above.
  topPaths: { path: string; count: number }[];
  totalPathCount: number;
  sourceGroups: SourceGroupCount[];
  estimatedVisits: number;
  internalViews: number;
  botViews: number;
}

// Specific known bot incidents that predate user_agent capture (added
// 2026-08-27), identified from the raw timing/referrer pattern instead -
// see the 2026-08-26 what-is-eppp incident: 226 rows in an 8-minute window,
// all referrer_host null, at a near-uniform ~1 every 2 seconds. Nothing
// generalisable to extract from rows this old since they carry no
// user_agent - hardcoded as a one-off historical correction.
const KNOWN_BOT_INCIDENTS: { path: string; from: string; to: string }[] = [
  { path: "/academy-pathway/what-is-eppp", from: "2026-08-26T21:56:00Z", to: "2026-08-26T22:06:00Z" },
];

// A single user_agent hitting the same single path this many times in one
// day is scripted, not a real reader - see the 2026-08-29
// academy-categories-explained incident, where the largest chunk (225 of
// 405 rows) shared one identical, years-out-of-date iPhone UA. Doesn't
// catch a bot that varies its UA per request; only catches this specific
// "one browser, one page, dozens of times" shape - see FLOOD_THRESHOLD
// above for the live per-path defense against a fast flood regardless of
// UA.
//
// Set high (not the original 8) after a false positive on 2026-08-30: 15
// homepage requests shared one user_agent that was simply the current,
// completely unremarkable default iPhone Safari string (iOS 18, Safari
// 26.x) - almost certainly 15 different real visitors on a common device
// configuration, not one bot. A UA being widely shared is normal; only
// genuinely extreme repetition on one path is worth flagging without a
// second corroborating signal.
const DUPLICATE_UA_SAME_PATH_THRESHOLD = 50;

// How many paths the report returns, per day and for the whole window. The
// site has ~120 routes, so these are effectively "all of them" rather than a
// leaderboard cut - the admin UI pages through the list 20 at a time. Kept as
// a cap at all only so a junk-path flood (404s, query-string variants) can't
// blow the response up. Where a cap does bite, totalPathCount says so.
const TOP_PATHS_PER_DAY = 100;
const TOP_PATHS_OVERALL = 200;

function isKnownBotIncident(path: string, createdAt: string): boolean {
  const ts = new Date(createdAt).getTime();
  return KNOWN_BOT_INCIDENTS.some(
    (incident) =>
      incident.path === path && ts >= new Date(incident.from).getTime() && ts <= new Date(incident.to).getTime()
  );
}

// estimatedVisits approximates "distinct visits" from raw pageview rows,
// without a session id or cookie: only the first page of a visit carries a
// referrer other than this site itself (every later page in that same
// visit is reached by clicking a link on the site, so its referrer is the
// site). Counting non-Internal rows therefore counts visits, not
// pageviews. Not exact - it can overcount (a browser/extension that strips
// the referrer mid-visit makes page 2 look like a fresh Direct entry;
// someone opening two tabs from the same search result), but it's a real
// proxy without adding session tracking.
function buildSourceGroups(groupMap: Map<SourceGroup, Map<string, number>>): SourceGroupCount[] {
  return Array.from(groupMap.entries())
    .map(([group, labelCounts]) => {
      const topSources = Array.from(labelCounts.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);
      const count = topSources.reduce((sum, s) => sum + s.count, 0);
      return { group, count, topSources };
    })
    .sort((a, b) => b.count - a.count);
}

export interface GetPageViewStatsOptions {
  // Restricts to rows whose path equals, or starts with "<prefix>/", one of
  // these - e.g. ["/football-parent-coach-app", "/coach-app"] for the Coach
  // App tab. Omit for site-wide stats.
  pathPrefixes?: string[];
}

function matchesPathPrefixes(path: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export interface PageViewCompareRow {
  path: string;
  countA: number;
  countB: number;
  delta: number;
}

export interface PageViewDayComparison {
  dateA: string;
  dateB: string;
  totalA: number;
  totalB: number;
  totalDelta: number;
  // Every path seen on either day - unlike PageViewDay.topPaths (capped to
  // TOP_PATHS_PER_DAY for the day-picker view above), so gains/losses
  // sorting doesn't silently miss a page that fell outside that cutoff.
  pages: PageViewCompareRow[];
}

// Compares page views broken down by path between two single UTC calendar
// days (same "day" bucketing as getPageViewStats: created_at.slice(0, 10)).
// Applies the same bot exclusions as getPageViewStats, scoped to just the
// rows in [min(dateA, dateB), max(dateA, dateB)] so the duplicate-UA check
// isn't diluted by unrelated days.
export async function comparePageViewsByDay(dateA: string, dateB: string): Promise<PageViewDayComparison> {
  const supabase = adminClient();
  const earliest = dateA < dateB ? dateA : dateB;
  const latest = dateA < dateB ? dateB : dateA;
  const sinceISO = `${earliest}T00:00:00.000Z`;
  const untilISO = new Date(new Date(`${latest}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000).toISOString();

  const rows: { path: string; created_at: string; user_agent: string | null }[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("page_views")
      .select("path, created_at, user_agent")
      .gte("created_at", sinceISO)
      .lt("created_at", untilISO)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error("Failed to read page_views: " + error.message);
    }

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  const dayPathUaCounts = new Map<string, number>();
  for (const row of rows) {
    if (!row.user_agent) continue;
    const day = row.created_at.slice(0, 10);
    const key = `${day}|${row.path}|${row.user_agent}`;
    dayPathUaCounts.set(key, (dayPathUaCounts.get(key) ?? 0) + 1);
  }

  function isBotRow(row: (typeof rows)[number], day: string): boolean {
    if (isKnownBotIncident(row.path, row.created_at)) return true;
    if (row.user_agent) {
      if (matchesKnownBotPattern(row.user_agent)) return true;
      const key = `${day}|${row.path}|${row.user_agent}`;
      if ((dayPathUaCounts.get(key) ?? 0) >= DUPLICATE_UA_SAME_PATH_THRESHOLD) return true;
    }
    return false;
  }

  const countsA = new Map<string, number>();
  const countsB = new Map<string, number>();
  let totalA = 0;
  let totalB = 0;

  for (const row of rows) {
    const day = row.created_at.slice(0, 10);
    if (day !== dateA && day !== dateB) continue;
    if (isBotRow(row, day)) continue;

    if (day === dateA) {
      countsA.set(row.path, (countsA.get(row.path) ?? 0) + 1);
      totalA += 1;
    }
    if (day === dateB) {
      countsB.set(row.path, (countsB.get(row.path) ?? 0) + 1);
      totalB += 1;
    }
  }

  const allPaths = new Set<string>([...countsA.keys(), ...countsB.keys()]);
  const pages: PageViewCompareRow[] = Array.from(allPaths).map((path) => {
    const countA = countsA.get(path) ?? 0;
    const countB = countsB.get(path) ?? 0;
    return { path, countA, countB, delta: countA - countB };
  });

  return {
    dateA,
    dateB,
    totalA,
    totalB,
    totalDelta: totalA - totalB,
    pages,
  };
}

export interface PageViewDailyCount {
  date: string;
  count: number;
}

// Daily view counts for one exact path, zero-filled on days with no views
// (unlike PageViewDay.topPaths, which only lists a path for a day it
// actually received a view) - for the "one page over time" tab. With `days`
// omitted, covers the page's full history: from its first recorded page
// view through today. NOT the same as the page's actual publish date - the
// page_views table only exists from 2026-08-19 (when view tracking was
// added), so any page published before then will show a truncated history
// starting there instead of its real publish date. Pass `days` to instead
// start from N days ago. Same bot exclusions as getPageViewStats.
export async function getPageViewsForPath(path: string, days?: number): Promise<PageViewDailyCount[]> {
  const supabase = adminClient();
  const since = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : null;

  const rows: { created_at: string; user_agent: string | null }[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    let query = supabase
      .from("page_views")
      .select("created_at, user_agent")
      .eq("path", path)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (since) {
      query = query.gte("created_at", since);
    }
    const { data, error } = await query;

    if (error) {
      throw new Error("Failed to read page_views: " + error.message);
    }

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  const dayUaCounts = new Map<string, number>();
  for (const row of rows) {
    if (!row.user_agent) continue;
    const day = row.created_at.slice(0, 10);
    const key = `${day}|${row.user_agent}`;
    dayUaCounts.set(key, (dayUaCounts.get(key) ?? 0) + 1);
  }

  function isBotRow(row: (typeof rows)[number], day: string): boolean {
    if (isKnownBotIncident(path, row.created_at)) return true;
    if (row.user_agent) {
      if (matchesKnownBotPattern(row.user_agent)) return true;
      const key = `${day}|${row.user_agent}`;
      if ((dayUaCounts.get(key) ?? 0) >= DUPLICATE_UA_SAME_PATH_THRESHOLD) return true;
    }
    return false;
  }

  const counts = new Map<string, number>();
  for (const row of rows) {
    const day = row.created_at.slice(0, 10);
    if (isBotRow(row, day)) continue;
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  const today = new Date().toISOString().slice(0, 10);
  // Earliest surviving (non-bot) day, not the earliest raw row - so a bot
  // incident that predates real traffic on this path doesn't push the
  // "published" proxy date artificially early.
  const earliestDay = Array.from(counts.keys()).sort()[0] ?? null;
  const startDate = since ? since.slice(0, 10) : (earliestDay ?? today);

  const result: PageViewDailyCount[] = [];
  const cursor = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${today}T00:00:00.000Z`);
  while (cursor <= end) {
    const date = cursor.toISOString().slice(0, 10);
    result.push({ date, count: counts.get(date) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

export async function getPageViewStats(
  days: number = 30,
  options: GetPageViewStatsOptions = {}
): Promise<PageViewStats> {
  const supabase = adminClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // PostgREST caps a single request at its configured max-rows (1000 by
  // default), silently truncating rather than erroring - a plain unbounded
  // select() here would quietly under-report totalViews/byDay once a busy
  // day pushes past that cap. Page through with .range() instead, ordered
  // by id (monotonic, unique) so pages don't skip/duplicate rows.
  let rows: { path: string; created_at: string; referrer_host: string | null; user_agent: string | null }[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("page_views")
      .select("path, created_at, referrer_host, user_agent")
      .gte("created_at", since)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error("Failed to read page_views: " + error.message);
    }

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  if (options.pathPrefixes) {
    const prefixes = options.pathPrefixes;
    rows = rows.filter((row) => matchesPathPrefixes(row.path, prefixes));
  }

  // First pass: count (day, path, user_agent) combos so the duplicate-UA
  // check below can tell "one browser hit this page 30 times today" from a
  // normal spread of distinct visitors. Only counts rows with a captured
  // user_agent - historical rows from before 2026-08-27 all have a null
  // user_agent, and grouping those together would flag huge swathes of
  // genuine old traffic as one giant "duplicate UA" combo.
  const dayPathUaCounts = new Map<string, number>();
  for (const row of rows) {
    if (!row.user_agent) continue;
    const day = row.created_at.slice(0, 10);
    const key = `${day}|${row.path}|${row.user_agent}`;
    dayPathUaCounts.set(key, (dayPathUaCounts.get(key) ?? 0) + 1);
  }

  function isBotRow(row: (typeof rows)[number], day: string): boolean {
    if (isKnownBotIncident(row.path, row.created_at)) return true;
    if (row.user_agent) {
      if (matchesKnownBotPattern(row.user_agent)) return true;
      const key = `${day}|${row.path}|${row.user_agent}`;
      if ((dayPathUaCounts.get(key) ?? 0) >= DUPLICATE_UA_SAME_PATH_THRESHOLD) return true;
    }
    return false;
  }

  const byDayPathMap = new Map<string, Map<string, number>>();
  const byPathMap = new Map<string, number>();
  const groupMap = new Map<SourceGroup, Map<string, number>>();
  const byDayGroupMap = new Map<string, Map<SourceGroup, Map<string, number>>>();
  const byDayEstimatedVisits = new Map<string, number>();
  const byDayInternalViews = new Map<string, number>();
  const byDayBotViews = new Map<string, number>();
  let estimatedVisitsTotal = 0;
  let internalViewsTotal = 0;
  let botViewsTotal = 0;

  for (const row of rows) {
    const day = row.created_at.slice(0, 10);

    if (isBotRow(row, day)) {
      botViewsTotal += 1;
      byDayBotViews.set(day, (byDayBotViews.get(day) ?? 0) + 1);
      continue;
    }

    const dayBucket = byDayPathMap.get(day) ?? new Map<string, number>();
    dayBucket.set(row.path, (dayBucket.get(row.path) ?? 0) + 1);
    byDayPathMap.set(day, dayBucket);

    byPathMap.set(row.path, (byPathMap.get(row.path) ?? 0) + 1);

    const { group, label } = classifyReferrerHost(row.referrer_host);
    if (group === "Internal") {
      internalViewsTotal += 1;
      byDayInternalViews.set(day, (byDayInternalViews.get(day) ?? 0) + 1);
      continue;
    }

    estimatedVisitsTotal += 1;
    byDayEstimatedVisits.set(day, (byDayEstimatedVisits.get(day) ?? 0) + 1);

    const labelBucket = groupMap.get(group) ?? new Map<string, number>();
    labelBucket.set(label, (labelBucket.get(label) ?? 0) + 1);
    groupMap.set(group, labelBucket);

    const dayGroupMap = byDayGroupMap.get(day) ?? new Map<SourceGroup, Map<string, number>>();
    const dayLabelBucket = dayGroupMap.get(group) ?? new Map<string, number>();
    dayLabelBucket.set(label, (dayLabelBucket.get(label) ?? 0) + 1);
    dayGroupMap.set(group, dayLabelBucket);
    byDayGroupMap.set(day, dayGroupMap);
  }

  // Union of days with any surviving row or any excluded bot row, so a day
  // that was pure bot traffic (e.g. 2026-08-26) still appears with count: 0
  // rather than disappearing from byDay entirely.
  const allDays = new Set<string>([...byDayPathMap.keys(), ...byDayBotViews.keys()]);

  const byDay: PageViewDay[] = Array.from(allDays)
    .map((date) => {
      const pathCounts = byDayPathMap.get(date) ?? new Map<string, number>();
      const topPaths = Array.from(pathCounts.entries())
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count);
      const count = topPaths.reduce((sum, p) => sum + p.count, 0);
      const sourceGroups = buildSourceGroups(byDayGroupMap.get(date) ?? new Map());
      const estimatedVisits = byDayEstimatedVisits.get(date) ?? 0;
      const internalViews = byDayInternalViews.get(date) ?? 0;
      const botViews = byDayBotViews.get(date) ?? 0;
      return {
        date,
        count,
        topPaths: topPaths.slice(0, TOP_PATHS_PER_DAY),
        totalPathCount: topPaths.length,
        sourceGroups,
        estimatedVisits,
        internalViews,
        botViews,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    totalViews: rows.length - botViewsTotal,
    byDay,
    topPaths: Array.from(byPathMap.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_PATHS_OVERALL),
    totalPathCount: byPathMap.size,
    sourceGroups: buildSourceGroups(groupMap),
    estimatedVisits: estimatedVisitsTotal,
    internalViews: internalViewsTotal,
    botViews: botViewsTotal,
  };
}

export interface BannerVariantRow {
  variant: string;
  style: string;
  audience: string;
  placement: string;
  // Landings on /football-parent-coach-app carrying this variant's ?b= param.
  clicks: number;
  // Views of the pages that serve this variant. Without this the comparison
  // is meaningless: the A/B splits by article, so each creative is shown on a
  // different set of pages with different traffic, and raw click counts would
  // mostly measure which bucket happened to get the busier articles.
  impressions: number;
  ctr: number;
}

// One UTC calendar day of the same split test, bucketed by
// created_at.slice(0, 10) exactly like PageViewDay - so picking a date on
// the Coach App tab lines the banner numbers up with that day's page views.
export interface BannerVariantDay {
  date: string;
  totalClicks: number;
  totalImpressions: number;
  rows: BannerVariantRow[];
}

export interface BannerVariantStats {
  days: number;
  // The window actually used, which is the later of `days` ago and the test
  // start - see BANNER_TEST_STARTED_AT.
  since: string;
  clampedToTestStart: boolean;
  totalClicks: number;
  // True once both creatives have enough impressions for the difference to
  // mean anything. Set deliberately low as a "don't read the tea leaves yet"
  // guard, not as a significance test.
  enoughData: boolean;
  rows: BannerVariantRow[];
  // Newest first, same ordering as PageViewStats.byDay. A single day is far
  // too small to call the test on (see MIN_IMPRESSIONS_PER_ARM) - this is
  // for reading a specific day's traffic, not for deciding a winner.
  byDay: BannerVariantDay[];
}

const MIN_IMPRESSIONS_PER_ARM = 300;

// Mirrors the routing in app/components/CoachAppBanner.tsx: /coaching/* gets
// the coach copy, every other article the parent copy.
function audienceForPath(path: string): "parent" | "coach" {
  return path.startsWith("/coaching/") ? "coach" : "parent";
}

// Which banner creative (if any) a given logged pageview path would have
// shown. Returns null for pages with no banner: category indexes, the
// landing page itself, /search, policy pages and so on.
function bannerOnPath(
  path: string,
  articleSlugs: Set<string>
): { style: string; audience: string; placement: string } | null {
  if (path === "/") {
    return {
      style: bannerStyleForKey(undefined),
      audience: "parent",
      placement: "home",
    };
  }

  const lastSegment = path.split("/").filter(Boolean).pop();
  if (!lastSegment || !articleSlugs.has(lastSegment)) return null;

  return {
    style: bannerStyleForKey(lastSegment),
    audience: audienceForPath(path),
    placement: "article",
  };
}

// Turns a pair of variant -> count maps into the sorted per-variant rows.
// Shared by the whole-window totals and each day of the byDay breakdown so
// the two can never drift apart in how a variant key is split or CTR is
// worked out.
function buildBannerRows(
  clicks: Map<string, number>,
  impressions: Map<string, number>
): BannerVariantRow[] {
  const variants = new Set([...clicks.keys(), ...impressions.keys()]);
  return Array.from(variants)
    .map((variant) => {
      const [style = "", audience = "", placement = ""] = variant.split("-");
      const clickCount = clicks.get(variant) ?? 0;
      const impressionCount = impressions.get(variant) ?? 0;
      return {
        variant,
        style,
        audience,
        placement,
        clicks: clickCount,
        impressions: impressionCount,
        ctr: impressionCount > 0 ? clickCount / impressionCount : 0,
      };
    })
    .sort((a, b) => b.ctr - a.ctr || b.clicks - a.clicks);
}

// Clicks per banner creative, over the last `days`, against the impressions
// each creative actually got. Backs the breakdown on the Coach App tab of
// /admin/seo.
export async function getBannerVariantStats(days: number = 30): Promise<BannerVariantStats> {
  const supabase = adminClient();

  // Never look further back than the test start. Impressions are derived from
  // pageviews of the pages serving each banner, and those pages existed long
  // before the banners did, so an unclamped window counts historical traffic
  // as impressions against clicks that can only have happened since launch.
  const requestedSince = Date.now() - days * 24 * 60 * 60 * 1000;
  const testStart = new Date(BANNER_TEST_STARTED_AT).getTime();
  const clampedToTestStart = testStart > requestedSince;
  const since = new Date(Math.max(requestedSince, testStart)).toISOString();

  const articleSlugs = getAllArticleSlugs();

  // Paged the same way as getPageViewStats, and for the same reason:
  // PostgREST silently truncates an unbounded select at its max-rows cap.
  const rows: {
    path: string;
    created_at: string;
    user_agent: string | null;
    banner_variant: string | null;
  }[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("page_views")
      .select("path, created_at, user_agent, banner_variant")
      .gte("created_at", since)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error("Failed to read page_views for banner variants: " + error.message);
    }

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  const clicks = new Map<string, number>();
  const impressions = new Map<string, number>();
  // date -> variant -> count, for the per-day breakdown.
  const clicksByDay = new Map<string, Map<string, number>>();
  const impressionsByDay = new Map<string, Map<string, number>>();

  function bump(byDay: Map<string, Map<string, number>>, date: string, variant: string) {
    const bucket = byDay.get(date) ?? new Map<string, number>();
    bucket.set(variant, (bucket.get(variant) ?? 0) + 1);
    byDay.set(date, bucket);
  }

  for (const row of rows) {
    if (row.user_agent && matchesKnownBotPattern(row.user_agent)) continue;

    const day = row.created_at.slice(0, 10);

    if (row.banner_variant) {
      clicks.set(row.banner_variant, (clicks.get(row.banner_variant) ?? 0) + 1);
      bump(clicksByDay, day, row.banner_variant);
    }

    const banner = bannerOnPath(row.path, articleSlugs);
    if (banner) {
      const key = `${banner.style}-${banner.audience}-${banner.placement}`;
      impressions.set(key, (impressions.get(key) ?? 0) + 1);
      bump(impressionsByDay, day, key);
    }
  }

  const result = buildBannerRows(clicks, impressions);

  const dates = new Set([...clicksByDay.keys(), ...impressionsByDay.keys()]);
  const byDay: BannerVariantDay[] = Array.from(dates)
    .map((date) => {
      const dayClicks = clicksByDay.get(date) ?? new Map<string, number>();
      const dayImpressions = impressionsByDay.get(date) ?? new Map<string, number>();
      const dayRows = buildBannerRows(dayClicks, dayImpressions);
      return {
        date,
        totalClicks: dayRows.reduce((sum, r) => sum + r.clicks, 0),
        totalImpressions: dayRows.reduce((sum, r) => sum + r.impressions, 0),
        rows: dayRows,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const impressionsByStyle = new Map<string, number>();
  for (const row of result) {
    impressionsByStyle.set(row.style, (impressionsByStyle.get(row.style) ?? 0) + row.impressions);
  }

  return {
    days,
    since,
    clampedToTestStart,
    totalClicks: Array.from(clicks.values()).reduce((sum, n) => sum + n, 0),
    enoughData:
      (impressionsByStyle.get("dark") ?? 0) >= MIN_IMPRESSIONS_PER_ARM &&
      (impressionsByStyle.get("light") ?? 0) >= MIN_IMPRESSIONS_PER_ARM,
    rows: result,
    byDay,
  };
}

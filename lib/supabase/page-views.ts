import { createClient } from "@supabase/supabase-js";
import { classifyReferrerHost, type SourceGroup } from "@/lib/referrer-sources";
import { matchesKnownBotPattern } from "@/lib/user-agent-bots";

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
  topPaths: { path: string; count: number }[];
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
  topPaths: { path: string; count: number }[];
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
        topPaths: topPaths.slice(0, 20),
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
      .slice(0, 50),
    sourceGroups: buildSourceGroups(groupMap),
    estimatedVisits: estimatedVisitsTotal,
    internalViews: internalViewsTotal,
    botViews: botViewsTotal,
  };
}

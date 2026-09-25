import { createClient } from "@supabase/supabase-js";
import { classifyReferrerHost, type SourceGroup } from "@/lib/referrer-sources";
import { matchesKnownBotPattern } from "@/lib/user-agent-bots";
import { getAllArticleSlugs } from "@/lib/content";
import {
  BANNER_TEST_STARTED_AT,
  CATEGORY_BANNER_PATHS,
  bannerStyleForKey,
  audienceAt,
  type CoachAppAudience,
} from "@/app/components/CoachAppBanner";

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
  // ISO 3166-1 alpha-2 from Vercel's geolocation header, see
  // app/api/page-view/route.ts.
  country?: string | null;
}

const FLOOD_WINDOW_MS = 60_000;
// Originally 30, set from the 2026-08-26 incident (226 views on one path in
// 8 minutes, ~28-51/minute). Lowered to 12 on 9 September, when a burst sat
// deliberately under that ceiling: 25 views of one URL in 34 seconds, from
// a single client rotating seven user agents (16 of them claiming iOS
// 13.2.3, released December 2019). At ~44/minute it would have tripped the
// old threshold had it run for a full minute, and it stopped at 25.
//
// 12/minute on ONE path is still far above anything genuine here. The whole
// site runs 250-350 views a day across every page, and the busiest single
// page managed 55 across three days, so 12 in a minute on one URL is two
// orders of magnitude above its normal rate.
//
// This matters more since the 9 September redirect: that URL now 308s to
// the real article, so an unblocked repeat burst would inflate a live
// page's numbers rather than a dead one's.
const FLOOD_THRESHOLD = 12;

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

function isMissingColumnError(error: { code?: string; message?: string }): boolean {
  if (error.code === "PGRST204" || error.code === "42703") return true;
  return /column/i.test(error.message ?? "") && /country/i.test(error.message ?? "");
}

export async function logPageView(path: string, options: LogPageViewOptions = {}): Promise<void> {
  const supabase = adminClient();

  if (await pathRecentlyFlooded(supabase, path)) return;

  const row = {
    path,
    referrer_host: options.referrerHost ?? null,
    user_agent: options.userAgent ?? null,
    utm_source: options.utmSource ?? null,
    utm_medium: options.utmMedium ?? null,
    utm_campaign: options.utmCampaign ?? null,
    gclid: options.gclid ?? null,
    fbclid: options.fbclid ?? null,
    banner_variant: options.bannerVariant ?? null,
  };

  const { error } = await supabase.from("page_views").insert({ ...row, country: options.country ?? null });

  // The code has deployed before the 20260924120000_page_views_country
  // migration was applied. PostgREST reports an unknown insert column as
  // PGRST204 ("Could not find the 'country' column ... in the schema
  // cache"), and 42703 is the Postgres "undefined column" code that comes
  // through when the cache is fresh but the column still is not there.
  // Losing the country is fine; losing every page view until the migration
  // runs is not (that happened for the 40 minutes after the first deploy
  // on 2026-09-24, which only handled 42703), so fall back to the
  // pre-country insert rather than fail.
  if (error && isMissingColumnError(error)) {
    const retry = await supabase.from("page_views").insert(row);
    if (!retry.error) return;
    throw new Error("Failed to insert page_views row: " + retry.error.message);
  }

  if (error) {
    throw new Error("Failed to insert page_views row: " + error.message);
  }
}

export interface CountryViewRow {
  // ISO 3166-1 alpha-2, or "Unknown" for rows logged before the country
  // column existed (and the odd request Vercel could not geolocate).
  country: string;
  views: number;
  // Non-Internal rows, same proxy for distinct visits as PageViewStats.
  estimatedVisits: number;
  share: number; // of totalViews, 0-1
}

export interface HourOfDayRow {
  // 0-23, in UK local time (Europe/London), not UTC - the question this
  // answers is "what was happening before I woke up", which is a UK clock
  // question.
  hour: number;
  views: number;
  uk: number;
  overseas: number;
  unknown: number;
}

export interface PageViewCountryStats {
  days: number;
  // Start of the window actually used: the later of `days` ago and the first
  // page view that has a country recorded.
  since: string;
  // True when the window was cut short to start at country recording.
  clampedToCountryStart: boolean;
  totalViews: number;
  botViews: number;
  // Views with a country recorded. While this is well below totalViews the
  // country split is only describing recent traffic - the column was added
  // on 2026-09-24 and older rows are all "Unknown".
  knownCountryViews: number;
  countries: CountryViewRow[];
  byHour: HourOfDayRow[];
  // Views landing between midnight and 06:30 UK time, the window that
  // looked out of place for a UK audience.
  earlyMorning: {
    views: number;
    share: number; // of totalViews, 0-1
    countries: CountryViewRow[]; // share here is of earlyMorning.views
    topPaths: { path: string; count: number }[];
  };
  // What the non-UK traffic is reading, since "overseas" splits into real
  // expat/international readers (spread across the same guides UK parents
  // read) and something scripted (piled onto one or two URLs).
  overseasTopPaths: { path: string; count: number }[];
}

const EARLY_MORNING_END_MINUTES = 6 * 60 + 30;
const TOP_PATHS_COUNTRY = 15;

const ukClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// Minutes since midnight in UK local time for an ISO timestamp.
function ukMinutesOfDay(createdAt: string): number {
  const parts = ukClock.formatToParts(new Date(createdAt));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

function countryRows(
  views: Map<string, number>,
  visits: Map<string, number>,
  denominator: number
): CountryViewRow[] {
  return Array.from(views.entries())
    .map(([country, count]) => ({
      country,
      views: count,
      estimatedVisits: visits.get(country) ?? 0,
      share: denominator > 0 ? count / denominator : 0,
    }))
    .sort((a, b) => b.views - a.views);
}

function topPathRows(counts: Map<string, number>, limit: number): { path: string; count: number }[] {
  return Array.from(counts.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// Where the site's readers are, and when in the UK day they arrive. Same
// bot exclusions and recording-start rules as getPageViewStats so the totals
// here reconcile with the Page views tab.
export async function getPageViewCountryStats(days: number = 30): Promise<PageViewCountryStats> {
  const supabase = adminClient();
  const requestedSince = Date.now() - days * 24 * 60 * 60 * 1000;

  // Start at the first row that has a country, not `days` ago. Everything
  // before the country column existed reads as Unknown, and on the first
  // days that was ~2,000 views swamping the split. Taken from the data
  // rather than a hardcoded time, because the column went live in stages on
  // 2026-09-24 (deploy, a failed-insert gap, then the migration) and the
  // first real value is the only exact answer.
  const { data: firstWithCountry, error: firstError } = await supabase
    .from("page_views")
    .select("created_at")
    .not("country", "is", null)
    .order("created_at", { ascending: true })
    .limit(1);
  if (firstError && isMissingColumnError(firstError)) {
    throw new Error(
      "page_views has no country column yet - apply supabase/migrations/20260924120000_page_views_country.sql to the football-parent-social project."
    );
  }
  const countryStart = firstWithCountry?.[0]?.created_at ? Date.parse(firstWithCountry[0].created_at) : 0;
  const clampedToCountryStart = countryStart > requestedSince;
  const since = new Date(Math.max(requestedSince, countryStart)).toISOString();

  let rows: {
    path: string;
    created_at: string;
    referrer_host: string | null;
    user_agent: string | null;
    country: string | null;
  }[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("page_views")
      .select("path, created_at, referrer_host, user_agent, country")
      .gte("created_at", since)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      if (isMissingColumnError(error)) {
        throw new Error(
          "page_views has no country column yet - apply supabase/migrations/20260924120000_page_views_country.sql to the football-parent-social project."
        );
      }
      throw new Error("Failed to read page_views: " + error.message);
    }

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  rows = rows.filter((row) => !isBeforeRecordingStart(row.path, row.created_at));

  const dayPathUaCounts = new Map<string, number>();
  for (const row of rows) {
    if (!row.user_agent) continue;
    const day = row.created_at.slice(0, 10);
    const key = `${day}|${row.path}|${row.user_agent}`;
    dayPathUaCounts.set(key, (dayPathUaCounts.get(key) ?? 0) + 1);
  }

  function isBotRow(row: (typeof rows)[number]): boolean {
    if (isKnownBotIncident(row.path, row.created_at)) return true;
    if (row.user_agent) {
      if (matchesKnownBotPattern(row.user_agent)) return true;
      const key = `${row.created_at.slice(0, 10)}|${row.path}|${row.user_agent}`;
      if ((dayPathUaCounts.get(key) ?? 0) >= DUPLICATE_UA_SAME_PATH_THRESHOLD) return true;
    }
    return false;
  }

  const viewsByCountry = new Map<string, number>();
  const visitsByCountry = new Map<string, number>();
  const earlyViewsByCountry = new Map<string, number>();
  const earlyVisitsByCountry = new Map<string, number>();
  const earlyPaths = new Map<string, number>();
  const overseasPaths = new Map<string, number>();
  const byHour: HourOfDayRow[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    views: 0,
    uk: 0,
    overseas: 0,
    unknown: 0,
  }));
  let totalViews = 0;
  let botViews = 0;
  let knownCountryViews = 0;
  let earlyViews = 0;

  for (const row of rows) {
    if (isBotRow(row)) {
      botViews += 1;
      continue;
    }
    totalViews += 1;

    const country = row.country ?? "Unknown";
    if (row.country) knownCountryViews += 1;
    const isVisit = classifyReferrerHost(row.referrer_host).group !== "Internal";

    viewsByCountry.set(country, (viewsByCountry.get(country) ?? 0) + 1);
    if (isVisit) visitsByCountry.set(country, (visitsByCountry.get(country) ?? 0) + 1);

    const minutes = ukMinutesOfDay(row.created_at);
    const hourRow = byHour[Math.floor(minutes / 60)];
    hourRow.views += 1;
    if (country === "GB") hourRow.uk += 1;
    else if (country === "Unknown") hourRow.unknown += 1;
    else {
      hourRow.overseas += 1;
      overseasPaths.set(row.path, (overseasPaths.get(row.path) ?? 0) + 1);
    }

    if (minutes < EARLY_MORNING_END_MINUTES) {
      earlyViews += 1;
      earlyViewsByCountry.set(country, (earlyViewsByCountry.get(country) ?? 0) + 1);
      if (isVisit) earlyVisitsByCountry.set(country, (earlyVisitsByCountry.get(country) ?? 0) + 1);
      earlyPaths.set(row.path, (earlyPaths.get(row.path) ?? 0) + 1);
    }
  }

  return {
    days,
    since,
    clampedToCountryStart,
    totalViews,
    botViews,
    knownCountryViews,
    countries: countryRows(viewsByCountry, visitsByCountry, totalViews),
    byHour,
    earlyMorning: {
      views: earlyViews,
      share: totalViews > 0 ? earlyViews / totalViews : 0,
      countries: countryRows(earlyViewsByCountry, earlyVisitsByCountry, earlyViews),
      topPaths: topPathRows(earlyPaths, TOP_PATHS_COUNTRY),
    },
    overseasTopPaths: topPathRows(overseasPaths, TOP_PATHS_COUNTRY),
  };
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

// Pages whose recorded history predates their being worth measuring.
//
// The Coach App landing pages were built, rewritten and previewed repeatedly
// through early September, by Graham and by an agent driving a browser, and
// the PPC variants only became real ad destinations on 9 September. Their
// earlier rows are overwhelmingly setup traffic: on 8 September the calculator
// page held 24 rows, 13 of them the agent's, and most of the remainder Graham
// checking the deploy.
//
// Excluded in reporting rather than deleted, so page_views stays the honest
// raw record and this stays one editable line. Deliberately separate from
// isBotRow: these rows are not bots and must not be counted as such in the
// "excluded as bot traffic" figure the reports publish. They are simply from
// before the page started meaning anything.
const RECORDING_STARTS: { pathPrefix: string; from: string }[] = [
  { pathPrefix: "/football-parent-coach-app", from: "2026-09-09T00:00:00Z" },
];

function isBeforeRecordingStart(path: string, createdAt: string): boolean {
  const ts = new Date(createdAt).getTime();
  return RECORDING_STARTS.some(
    (rule) =>
      (path === rule.pathPrefix || path.startsWith(`${rule.pathPrefix}/`)) &&
      ts < new Date(rule.from).getTime()
  );
}

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

  let rows: { path: string; created_at: string; user_agent: string | null }[] = [];
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

  rows = rows.filter((row) => !isBeforeRecordingStart(row.path, row.created_at));

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

// The per-path bot rules, shared by the trend chart (getPageViewsForPath)
// and the per-path source breakdown (getPageViewSourcesForPath) so the two
// can never disagree about which rows are real. Returns a predicate rather
// than a filtered array because the duplicate-UA rule needs the whole set
// counted first.
function isBotRowForPath<T extends { created_at: string; user_agent: string | null }>(
  path: string,
  rows: T[]
): (row: T) => boolean {
  const dayUaCounts = new Map<string, number>();
  for (const row of rows) {
    if (!row.user_agent) continue;
    const day = row.created_at.slice(0, 10);
    const key = `${day}|${row.user_agent}`;
    dayUaCounts.set(key, (dayUaCounts.get(key) ?? 0) + 1);
  }

  return (row: T) => {
    if (isKnownBotIncident(path, row.created_at)) return true;
    if (row.user_agent) {
      if (matchesKnownBotPattern(row.user_agent)) return true;
      const key = `${row.created_at.slice(0, 10)}|${row.user_agent}`;
      if ((dayUaCounts.get(key) ?? 0) >= DUPLICATE_UA_SAME_PATH_THRESHOLD) return true;
    }
    return false;
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

  let rows: { created_at: string; user_agent: string | null }[] = [];
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

  rows = rows.filter((row) => !isBeforeRecordingStart(path, row.created_at));

  const isBotRow = isBotRowForPath(path, rows);

  const counts = new Map<string, number>();
  for (const row of rows) {
    if (isBotRow(row)) continue;
    const day = row.created_at.slice(0, 10);
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

export interface PathSourceUserAgent {
  userAgent: string;
  hits: number;
  firstSeen: string;
  lastSeen: string;
}

export interface PageViewSourcesForPath {
  sources: SourceGroupCount[];
  // Every user agent that hit this path, busiest first. Raw strings rather
  // than parsed browser names on purpose: what identifies a scripted burst
  // is the exact string repeating, or an implausible one, and parsing throws
  // that away. On 9 September this is what identified the traffic to
  // /parent-guides/what-is-grassroots-football: as a single client rotating
  // user agents - 16 hits claiming iOS 13.2.3 (released December 2019) and
  // nine more across six different Chrome majors, all inside 34 seconds.
  userAgents: PathSourceUserAgent[];
  // Rows excluded by the same bot rules the trend chart uses, reported
  // rather than silently dropped so the two numbers reconcile.
  botViews: number;
  // Rows counted, i.e. everything the source and user-agent lists above are
  // built from.
  totalViews: number;
}

// How many distinct user agents the report returns. A real page sees a long
// tail of one-hit browser strings; the interesting ones are always at the
// top, and the cap only stops a UA-rotating flood from returning hundreds
// of rows.
const TOP_USER_AGENTS = 40;

// Where the views on one exact path came from: traffic sources (from
// referrer_host) and the raw user agents behind them. Backs the per-path
// breakdown on the Page trend tab.
//
// Deliberately a second query rather than folded into getPageViewsForPath:
// that one returns a daily count array consumed elsewhere (the affiliate
// click-out denominator, among others) and is not worth reshaping to carry
// this. Both apply the same bot rules through isBotRowForPath, so the
// counts here reconcile with the trend chart next to them.
export async function getPageViewSourcesForPath(
  path: string,
  days?: number
): Promise<PageViewSourcesForPath> {
  const supabase = adminClient();
  const since = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : null;

  let rows: { created_at: string; user_agent: string | null; referrer_host: string | null }[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    let query = supabase
      .from("page_views")
      .select("created_at, user_agent, referrer_host")
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

  rows = rows.filter((row) => !isBeforeRecordingStart(path, row.created_at));

  const isBot = isBotRowForPath(path, rows);
  const humanRows = rows.filter((row) => !isBot(row));

  const groupMap = new Map<SourceGroup, Map<string, number>>();
  const uaMap = new Map<string, PathSourceUserAgent>();

  for (const row of humanRows) {
    const { group, label } = classifyReferrerHost(row.referrer_host);
    const labels = groupMap.get(group) ?? new Map<string, number>();
    labels.set(label, (labels.get(label) ?? 0) + 1);
    groupMap.set(group, labels);

    const ua = row.user_agent ?? "(no user agent)";
    const existing = uaMap.get(ua);
    if (existing) {
      existing.hits += 1;
      if (row.created_at < existing.firstSeen) existing.firstSeen = row.created_at;
      if (row.created_at > existing.lastSeen) existing.lastSeen = row.created_at;
    } else {
      uaMap.set(ua, {
        userAgent: ua,
        hits: 1,
        firstSeen: row.created_at,
        lastSeen: row.created_at,
      });
    }
  }

  return {
    sources: buildSourceGroups(groupMap),
    userAgents: Array.from(uaMap.values())
      .sort((a, b) => b.hits - a.hits)
      .slice(0, TOP_USER_AGENTS),
    botViews: rows.length - humanRows.length,
    totalViews: humanRows.length,
  };
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
  let rows: {
    path: string;
    created_at: string;
    referrer_host: string | null;
    user_agent: string | null;
    gclid: string | null;
  }[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("page_views")
      .select("path, created_at, referrer_host, user_agent, gclid")
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
  rows = rows.filter((row) => !isBeforeRecordingStart(row.path, row.created_at));

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

    // gclid is Google's auto-tag on every ad-click landing URL, so its
    // presence is the one reliable "this was a paid click" signal - the
    // referrer alone can't tell a Google Ads click from an organic Google
    // result. Takes precedence over the host classification (which would
    // otherwise file it under Search/Google) so paid traffic is visible as
    // its own source rather than inflating organic search.
    const { group, label } = row.gclid
      ? ({ group: "Ads", label: "Google Ads" } as const)
      : classifyReferrerHost(row.referrer_host);
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

// Mirrors the routing in app/components/CoachAppBanner.tsx as it stood when
// the view happened: /coaching/* gets the coach copy, every other article
// the parent copy before SHARE_BANNER_STARTED_AT and whatever
// defaultAudienceForSlug gives its slug after.
function audienceForPath(path: string, createdAt: string): CoachAppAudience {
  return audienceAt(path.split("/").filter(Boolean).pop(), path.startsWith("/coaching/"), createdAt);
}

// Which banner creative (if any) a given logged pageview path would have
// shown. Returns null for pages with no banner: category indexes without a
// section promo, the landing page itself, /search, policy pages and so on.
function bannerOnPath(
  path: string,
  articleSlugs: Set<string>,
  createdAt: string
): { style: string; audience: string; placement: string } | null {
  if (path === "/") {
    return {
      style: bannerStyleForKey(undefined),
      audience: "parent",
      placement: "home",
    };
  }

  // Category pages carrying the section-level promo. Checked before the
  // article lookup because a category path's last segment ("coaching") is
  // not an article slug and would otherwise fall through to null - counting
  // the banner's clicks while attributing it no impressions at all.
  //
  // Pinned to ACTIVE_BANNER_STYLE via bannerStyleForKey(undefined), the same
  // way the homepage is: the A/B test splits by article slug, and a single
  // category page has no meaningful slug to split on.
  if (CATEGORY_BANNER_PATHS.has(path)) {
    return {
      style: bannerStyleForKey(undefined),
      audience: "coach",
      placement: "category",
    };
  }

  const lastSegment = path.split("/").filter(Boolean).pop();
  if (!lastSegment || !articleSlugs.has(lastSegment)) return null;

  return {
    style: bannerStyleForKey(lastSegment),
    audience: audienceForPath(path, createdAt),
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

    const banner = bannerOnPath(row.path, articleSlugs, row.created_at);
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

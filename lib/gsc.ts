import fs from "fs";
import path from "path";
import { JWT } from "google-auth-library";
import { routes as SITEMAP_ROUTES } from "@/app/sitemap";

const REPO_ROOT = process.cwd();
const CONTENT_DIR = path.join(REPO_ROOT, "app");
const MDX_CONTENT_DIR = path.join(REPO_ROOT, "content");

const SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"];

const STRIKING_DISTANCE_MIN_POS = 11;
const STRIKING_DISTANCE_MAX_POS = 20;
const STRIKING_DISTANCE_MIN_IMPRESSIONS = 20;
const LOW_CTR_MIN_IMPRESSIONS = 50;
const DECAY_MIN_CLICK_DROP_PCT = 30;
// Decay gets its own, shorter current/prior window (see DECAY_CURRENT_PERIOD_DAYS
// below) rather than sharing the 90-day window used for striking distance/low
// CTR/cannibalisation - a 90-vs-90 comparison averages a real ranking drop
// across so much time that it's both slow to detect and, on a young site,
// often has no prior-period data to compare against at all. Raised from 5:
// a shorter window means fewer accumulated clicks per page, so the floor
// needs to stay meaningful in weekly-rate terms, not just raw count, to avoid
// flagging "decay" that's really just noise on a low-traffic page.
const DECAY_MIN_PRIOR_CLICKS = 8;
const CURRENT_PERIOD_DAYS = 90;
const COMPARE_PERIOD_DAYS = 90;
const DECAY_CURRENT_PERIOD_DAYS = 28;
const DECAY_COMPARE_PERIOD_DAYS = 28;

// User-selectable trailing-day windows for the striking distance, low CTR
// and no-impressions tabs. Anything outside this set falls back to the
// default (CURRENT_PERIOD_DAYS) rather than hitting the GSC API with an
// arbitrary range.
const ALLOWED_DAY_WINDOWS = [7, 28, 90];

function clampDayWindow(value: number | undefined, fallback: number): number {
  if (value !== undefined && ALLOWED_DAY_WINDOWS.includes(value)) return value;
  return fallback;
}

// "Gone quiet" - pages with real impressions historically that have gone
// near-silent recently. Both windows end at currentEnd, which is already
// lag-adjusted, so this only fires if the whole recent window is quiet, not
// just the last day or two of naturally incomplete GSC data.
const SILENCE_RECENT_DAYS = 7;
const SILENCE_BASELINE_DAYS = 21;
const SILENCE_MIN_BASELINE_IMPRESSIONS = 30;
const SILENCE_MAX_RECENT_IMPRESSIONS = 2;

// Rank tracker: "position today" vs "position 7 days ago" per query/page.
// Real rank-tracking tools (SEMrush etc.) get clean single-day comparisons
// because they run their own live SERP check once a day - one controlled
// measurement, not a sample. GSC's position is an impression-weighted average
// over however many real users happened to search that specific day, so a
// literal single-day comparison is mostly noise for anything but your very
// highest-volume queries. Averaging over a few days smooths that out at the
// cost of it no longer being a literal "today" snapshot.
const RANK_TRACKER_WINDOW_DAYS = 3;
// Minimum combined impressions (both windows together) to list a query at
// all - filters out the long tail of one-off searches that would otherwise
// dominate the table with meaningless swings.
const RANK_TRACKER_MIN_COMBINED_IMPRESSIONS = 4;

// Rough expected CTR by position - industry ballpark, used only to rank
// opportunities relative to each other, not as an absolute target.
const EXPECTED_CTR_BY_POSITION: Record<number, number> = {
  1: 0.28, 2: 0.15, 3: 0.11, 4: 0.08, 5: 0.06,
  6: 0.05, 7: 0.04, 8: 0.03, 9: 0.03, 10: 0.02,
};

function expectedCtr(position: number): number {
  const pos = Math.max(1, Math.round(position));
  return EXPECTED_CTR_BY_POSITION[pos] ?? 0.01;
}

type GscRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

let cachedClient: JWT | null = null;

function getClient(): JWT {
  if (cachedClient) return cachedClient;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY env vars"
    );
  }
  const key = rawKey.replace(/\\n/g, "\n");
  cachedClient = new JWT({ email, key, scopes: SCOPES });
  return cachedClient;
}

type GscFilter = { dimension: string; operator: string; expression: string };

// Google generates a separate "page" row per URL fragment when a result
// shows in-SERP jump links to specific sections of one real page (each
// #anchor gets its own impression count even though it's the same
// document) - confirmed live: one article showed as 6 distinct "page" rows
// for a single query, all at virtually the same position. Left unstripped,
// this makes cannibalisation report false positives (one page looks like
// several competing pages), inflates the rank tracker and striking-distance
// lists with duplicate entries for the same real opportunity, and can
// splinter a page's true impressions thinly enough to dodge or wrongly
// trigger the decay/silence thresholds. Every "page"-dimensioned query goes
// through this before any analysis sees it.
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripUrlFragment(url: string): string {
  const hashIndex = url.indexOf("#");
  return hashIndex === -1 ? url : url.slice(0, hashIndex);
}

function consolidateFragmentRows(rows: GscRow[], dimensions: string[]): GscRow[] {
  const pageIndex = dimensions.indexOf("page");
  if (pageIndex === -1) return rows;

  const merged = new Map<string, { keys: string[]; impressions: number; clicks: number; posWeighted: number }>();
  for (const r of rows) {
    const keys = [...r.keys];
    keys[pageIndex] = stripUrlFragment(keys[pageIndex]);
    const mapKey = keys.join(" ");
    if (!merged.has(mapKey)) merged.set(mapKey, { keys, impressions: 0, clicks: 0, posWeighted: 0 });
    const m = merged.get(mapKey)!;
    m.impressions += r.impressions;
    m.clicks += r.clicks;
    m.posWeighted += r.position * r.impressions;
  }

  return [...merged.values()].map((m) => ({
    keys: m.keys,
    impressions: m.impressions,
    clicks: m.clicks,
    position: m.impressions ? m.posWeighted / m.impressions : 0,
    ctr: m.impressions ? m.clicks / m.impressions : 0,
  }));
}

async function fetchRows(
  startDate: string,
  endDate: string,
  dimensions: string[],
  filters: GscFilter[] | null = null
): Promise<GscRow[]> {
  const client = getClient();
  const siteUrl = process.env.GSC_SITE_URL;
  if (!siteUrl) throw new Error("Missing GSC_SITE_URL env var");

  const rows: GscRow[] = [];
  let startRow = 0;
  const rowLimit = 25000;
  const body: Record<string, unknown> = { startDate, endDate, dimensions, rowLimit, startRow };
  if (filters) body.dimensionFilterGroups = [{ filters }];

  while (true) {
    body.startRow = startRow;
    const res = await client.request({
      url: `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
        siteUrl
      )}/searchAnalytics/query`,
      method: "POST",
      data: body,
    });
    const data = res.data as { rows?: GscRow[] };
    const batch = data.rows || [];
    rows.push(...batch);
    if (batch.length < rowLimit) break;
    startRow += rowLimit;
  }

  return consolidateFragmentRows(rows, dimensions);
}

// The GSC property is configured as an sc-domain resource, not a URL-prefix
// one, so page URLs need reconstructing with a scheme/subdomain - matches
// the siteUrl convention already hardcoded in lib/seo.ts and app/sitemap.ts.
function siteOrigin(): string {
  const siteUrl = process.env.GSC_SITE_URL || "";
  const domain = siteUrl.startsWith("sc-domain:") ? siteUrl.replace("sc-domain:", "") : new URL(siteUrl).hostname;
  return `https://www.${domain}`;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

// --- analysis ---------------------------------------------------------

export type StrikingRow = {
  query: string;
  page: string;
  position: number;
  impressions: number;
  clicks: number;
  ctr: number;
};

function analyseStrikingDistance(rows: GscRow[]): StrikingRow[] {
  const results: StrikingRow[] = [];
  for (const r of rows) {
    const [query, page] = r.keys;
    if (
      r.position >= STRIKING_DISTANCE_MIN_POS &&
      r.position <= STRIKING_DISTANCE_MAX_POS &&
      r.impressions >= STRIKING_DISTANCE_MIN_IMPRESSIONS
    ) {
      results.push({
        query,
        page,
        position: Math.round(r.position * 10) / 10,
        impressions: r.impressions,
        clicks: r.clicks,
        ctr: Math.round(r.ctr * 1000) / 10,
      });
    }
  }
  return results.sort((a, b) => b.impressions - a.impressions);
}

export type LowCtrRow = {
  page: string;
  position: number;
  impressions: number;
  clicks: number;
  actualCtr: number;
  expectedCtr: number;
};

function analyseLowCtr(rows: GscRow[]): LowCtrRow[] {
  const results: LowCtrRow[] = [];
  for (const r of rows) {
    const [page] = r.keys;
    if (r.impressions < LOW_CTR_MIN_IMPRESSIONS) continue;
    const expected = expectedCtr(r.position);
    if (r.ctr < expected * 0.6) {
      results.push({
        page,
        position: Math.round(r.position * 10) / 10,
        impressions: r.impressions,
        clicks: r.clicks,
        actualCtr: Math.round(r.ctr * 1000) / 10,
        expectedCtr: Math.round(expected * 1000) / 10,
      });
    }
  }
  return results.sort((a, b) => b.impressions - a.impressions);
}

export type DecayRow = {
  page: string;
  priorClicks: number;
  currentClicks: number;
  dropPct: number;
  priorPosition: number;
  currentPosition: number;
};

function analyseDecay(currentRows: GscRow[], priorRows: GscRow[]): DecayRow[] {
  const priorMap = new Map<string, GscRow>();
  for (const r of priorRows) priorMap.set(r.keys[0], r);

  const results: DecayRow[] = [];
  for (const r of currentRows) {
    const [page] = r.keys;
    const prior = priorMap.get(page);
    if (!prior || prior.clicks < DECAY_MIN_PRIOR_CLICKS) continue;
    const dropPct = ((prior.clicks - r.clicks) / prior.clicks) * 100;
    if (dropPct >= DECAY_MIN_CLICK_DROP_PCT) {
      results.push({
        page,
        priorClicks: prior.clicks,
        currentClicks: r.clicks,
        dropPct: Math.round(dropPct * 10) / 10,
        priorPosition: Math.round(prior.position * 10) / 10,
        currentPosition: Math.round(r.position * 10) / 10,
      });
    }
  }
  return results.sort((a, b) => b.dropPct - a.dropPct);
}

export type CannibalRow = {
  query: string;
  pages: { page: string; position: number; impressions: number; clicks: number }[];
};

function analyseCannibalisation(rows: GscRow[], minImpressions = 20): CannibalRow[] {
  const byQuery = new Map<string, GscRow[]>();
  for (const r of rows) {
    const [query] = r.keys;
    if (r.impressions >= minImpressions) {
      if (!byQuery.has(query)) byQuery.set(query, []);
      byQuery.get(query)!.push(r);
    }
  }

  const results: CannibalRow[] = [];
  for (const [query, entries] of byQuery) {
    if (entries.length < 2) continue;
    entries.sort((a, b) => a.position - b.position);
    results.push({
      query,
      pages: entries.map((r) => ({
        page: r.keys[1],
        position: Math.round(r.position * 10) / 10,
        impressions: r.impressions,
        clicks: r.clicks,
      })),
    });
  }

  return results.sort(
    (a, b) =>
      b.pages.reduce((s, p) => s + p.impressions, 0) -
      a.pages.reduce((s, p) => s + p.impressions, 0)
  );
}

export type RankRow = {
  query: string;
  page: string;
  recentPosition: number | null;
  recentImpressions: number;
  recentClicks: number;
  priorPosition: number | null;
  priorImpressions: number;
  priorClicks: number;
  delta: number | null; // positive = improved (moved up the results), negative = declined
  direction: "up" | "down" | "same" | "new" | "lost";
};

// "Position today" vs "position 7 days ago" per query/page, each side
// smoothed over RANK_TRACKER_WINDOW_DAYS - see the constant comment for why
// a literal single day isn't meaningful with GSC's sampled data.
function analyseRankTracker(rows: GscRow[], currentEnd: Date): RankRow[] {
  const recentEnd = currentEnd;
  const recentStart = addDays(recentEnd, -(RANK_TRACKER_WINDOW_DAYS - 1));
  const priorEnd = addDays(recentEnd, -7);
  const priorStart = addDays(recentStart, -7);

  type Bucket = { impressions: number; clicks: number; posWeighted: number };
  const emptyBucket = (): Bucket => ({ impressions: 0, clicks: 0, posWeighted: 0 });
  const recentByKey = new Map<string, Bucket>();
  const priorByKey = new Map<string, Bucket>();
  const meta = new Map<string, { query: string; page: string }>();

  for (const r of rows) {
    const [query, page, dateStr] = r.keys;
    const date = new Date(dateStr);
    const key = `${query}||${page}`;
    if (!meta.has(key)) meta.set(key, { query, page });

    let target: Map<string, Bucket> | null = null;
    if (date >= recentStart && date <= recentEnd) target = recentByKey;
    else if (date >= priorStart && date <= priorEnd) target = priorByKey;
    if (!target) continue;

    if (!target.has(key)) target.set(key, emptyBucket());
    const b = target.get(key)!;
    b.impressions += r.impressions;
    b.clicks += r.clicks;
    b.posWeighted += r.position * r.impressions;
  }

  const results: RankRow[] = [];
  for (const [key, { query, page }] of meta) {
    const recent = recentByKey.get(key);
    const prior = priorByKey.get(key);
    const recentImpressions = recent?.impressions || 0;
    const priorImpressions = prior?.impressions || 0;
    if (recentImpressions + priorImpressions < RANK_TRACKER_MIN_COMBINED_IMPRESSIONS) continue;

    const recentPosition = recent && recent.impressions ? Math.round((recent.posWeighted / recent.impressions) * 10) / 10 : null;
    const priorPosition = prior && prior.impressions ? Math.round((prior.posWeighted / prior.impressions) * 10) / 10 : null;

    let direction: RankRow["direction"] = "same";
    let delta: number | null = null;
    if (recentPosition !== null && priorPosition !== null) {
      delta = Math.round((priorPosition - recentPosition) * 10) / 10;
      direction = delta > 0.1 ? "up" : delta < -0.1 ? "down" : "same";
    } else if (recentPosition !== null && priorPosition === null) {
      direction = "new";
    } else if (recentPosition === null && priorPosition !== null) {
      direction = "lost";
    }

    results.push({
      query,
      page,
      recentPosition,
      recentImpressions,
      recentClicks: recent?.clicks || 0,
      priorPosition,
      priorImpressions,
      priorClicks: prior?.clicks || 0,
      delta,
      direction,
    });
  }

  return results.sort(
    (a, b) => b.recentImpressions + b.priorImpressions - (a.recentImpressions + a.priorImpressions)
  );
}

export type SilenceRow = {
  page: string;
  baselineImpressions: number;
  baselineClicks: number;
  baselineDays: number;
  recentImpressions: number;
  recentClicks: number;
  recentDays: number;
};

// A page going from real, steady impressions to near-zero is usually
// technical (deindexing, a noindex slip, a broken canonical, a bad deploy)
// rather than a content problem, and easy to miss by eye across dozens of
// pages. Both windows end at currentEnd, which is already lag-adjusted, so
// this only fires if the whole recent window is quiet, not just the last
// day or two of naturally incomplete GSC data.
function analyseSilence(pageDateRows: GscRow[], currentEnd: Date): SilenceRow[] {
  const recentStart = addDays(currentEnd, -(SILENCE_RECENT_DAYS - 1));
  const baselineEnd = addDays(recentStart, -1);
  const baselineStart = addDays(baselineEnd, -(SILENCE_BASELINE_DAYS - 1));

  const byPage = new Map<
    string,
    { recentImpressions: number; recentClicks: number; baselineImpressions: number; baselineClicks: number }
  >();

  for (const r of pageDateRows) {
    const [page, dateStr] = r.keys;
    const date = new Date(dateStr);
    if (!byPage.has(page)) {
      byPage.set(page, { recentImpressions: 0, recentClicks: 0, baselineImpressions: 0, baselineClicks: 0 });
    }
    const entry = byPage.get(page)!;
    if (date >= recentStart && date <= currentEnd) {
      entry.recentImpressions += r.impressions;
      entry.recentClicks += r.clicks;
    } else if (date >= baselineStart && date <= baselineEnd) {
      entry.baselineImpressions += r.impressions;
      entry.baselineClicks += r.clicks;
    }
  }

  const results: SilenceRow[] = [];
  for (const [page, stats] of byPage) {
    if (
      stats.baselineImpressions >= SILENCE_MIN_BASELINE_IMPRESSIONS &&
      stats.recentImpressions <= SILENCE_MAX_RECENT_IMPRESSIONS
    ) {
      results.push({
        page,
        baselineImpressions: stats.baselineImpressions,
        baselineClicks: stats.baselineClicks,
        baselineDays: SILENCE_BASELINE_DAYS,
        recentImpressions: stats.recentImpressions,
        recentClicks: stats.recentClicks,
        recentDays: SILENCE_RECENT_DAYS,
      });
    }
  }

  return results.sort((a, b) => b.baselineImpressions - a.baselineImpressions);
}

export type NoImpressionsRow = {
  page: string; // pathname, e.g. "/academy-pathway/..." or "/" for the homepage
  url: string;
};

// Every URL in app/sitemap.ts (the source of truth for real routes - see
// internal-link-audit.mjs) that got zero impressions in the window, whether
// because it stopped ranking entirely or never picked up any search
// visibility in the first place. GSC only returns rows for pages with at
// least one impression, so "not present in pageRows" means zero.
function analyseNoImpressions(pageRows: GscRow[]): NoImpressionsRow[] {
  const origin = siteOrigin();
  const withImpressions = new Set<string>();
  for (const r of pageRows) {
    const [page] = r.keys;
    if (r.impressions > 0) withImpressions.add(page);
  }

  const results: NoImpressionsRow[] = [];
  for (const route of SITEMAP_ROUTES) {
    const url = `${origin}${route}`;
    if (!withImpressions.has(url)) {
      results.push({ page: route === "" ? "/" : route, url });
    }
  }
  return results;
}

// --- main entry point ---------------------------------------------------

export type SeoReportOptions = {
  // Trailing-day windows for the three tabs with a user-facing period
  // filter. Each is independent of the others and of the fixed windows
  // used by decay/cannibalisation/silence/rank tracker.
  strikingDays?: number;
  ctrDays?: number;
  noImpressionsDays?: number;
};

export type SeoReport = {
  periodStart: string;
  periodEnd: string;
  strikingDistance: StrikingRow[];
  strikingDays: number;
  lowCtr: LowCtrRow[];
  ctrDays: number;
  decay: DecayRow[];
  cannibalisation: CannibalRow[];
  silence: SilenceRow[];
  rankTracker: RankRow[];
  noImpressions: NoImpressionsRow[];
  noImpressionsDays: number;
};

export async function getSeoReport(options: SeoReportOptions = {}): Promise<SeoReport> {
  const strikingDays = clampDayWindow(options.strikingDays, CURRENT_PERIOD_DAYS);
  const ctrDays = clampDayWindow(options.ctrDays, CURRENT_PERIOD_DAYS);
  const noImpressionsDays = clampDayWindow(options.noImpressionsDays, CURRENT_PERIOD_DAYS);

  const today = new Date();
  const currentEnd = addDays(today, -3); // GSC data lags a couple of days
  const currentStart = addDays(currentEnd, -CURRENT_PERIOD_DAYS);

  // Decay's own, shorter window - see the constant comments above.
  const decayCurrentStart = addDays(currentEnd, -DECAY_CURRENT_PERIOD_DAYS);
  const decayPriorEnd = addDays(decayCurrentStart, -1);
  const decayPriorStart = addDays(decayPriorEnd, -DECAY_COMPARE_PERIOD_DAYS);

  const silenceWindowStart = addDays(currentEnd, -(SILENCE_RECENT_DAYS + SILENCE_BASELINE_DAYS - 1));

  // Rank tracker needs its "recent" window (currentEnd back RANK_TRACKER_WINDOW_DAYS)
  // and the same span 7 days earlier - covered by one fetch from the older
  // boundary through currentEnd.
  const rankTrackerWindowStart = addDays(currentEnd, -(RANK_TRACKER_WINDOW_DAYS - 1 + 7));

  const strikingStart = addDays(currentEnd, -strikingDays);
  const ctrStart = addDays(currentEnd, -ctrDays);
  const noImpressionsStart = addDays(currentEnd, -noImpressionsDays);

  const [
    cannibalRows,
    strikingRows,
    ctrRows,
    decayRowsCurrent,
    decayRowsPrior,
    pageDateRows,
    rankTrackerRows,
    noImpressionsRows,
  ] = await Promise.all([
    // Cannibalisation keeps the fixed 90-day window regardless of the
    // striking-distance filter - the two tabs are independently filterable.
    fetchRows(isoDate(currentStart), isoDate(currentEnd), ["query", "page"]),
    fetchRows(isoDate(strikingStart), isoDate(currentEnd), ["query", "page"]),
    fetchRows(isoDate(ctrStart), isoDate(currentEnd), ["page"]),
    fetchRows(isoDate(decayCurrentStart), isoDate(currentEnd), ["page"]),
    fetchRows(isoDate(decayPriorStart), isoDate(decayPriorEnd), ["page"]),
    fetchRows(isoDate(silenceWindowStart), isoDate(currentEnd), ["page", "date"]),
    fetchRows(isoDate(rankTrackerWindowStart), isoDate(currentEnd), ["query", "page", "date"]),
    fetchRows(isoDate(noImpressionsStart), isoDate(currentEnd), ["page"]),
  ]);

  return {
    periodStart: isoDate(currentStart),
    periodEnd: isoDate(currentEnd),
    strikingDistance: analyseStrikingDistance(strikingRows),
    strikingDays,
    lowCtr: analyseLowCtr(ctrRows),
    ctrDays,
    decay: analyseDecay(decayRowsCurrent, decayRowsPrior),
    cannibalisation: analyseCannibalisation(cannibalRows),
    silence: analyseSilence(pageDateRows, currentEnd),
    rankTracker: analyseRankTracker(rankTrackerRows, currentEnd),
    noImpressions: analyseNoImpressions(noImpressionsRows),
    noImpressionsDays,
  };
}

// --- single-page inspection ---------------------------------------------
// Full GSC history for one page - the "why is this page doing X" question,
// answered with real data instead of guessing. Same underlying logic as
// scripts/inspect-page.mjs, kept here so it can also be exposed as an MCP
// tool without shelling out to a script.

const INSPECT_HISTORY_DAYS = 180;
const INSPECT_TREND_WINDOW_DAYS = 28; // matches the decay window for consistency

function findContentFiles(pathname: string): { pageFile: string | null; mdxFile: string | null } {
  const segments = pathname.split("/").filter(Boolean);
  const appDir = path.join(CONTENT_DIR, ...segments);
  const candidates = ["page.tsx", "page.ts", "page.jsx", "page.js"];
  let pageFile: string | null = null;
  for (const c of candidates) {
    const p = path.join(appDir, c);
    if (fs.existsSync(p)) {
      pageFile = path.relative(REPO_ROOT, p);
      break;
    }
  }
  let mdxFile: string | null = null;
  if (segments.length === 2) {
    const [category, slug] = segments;
    const p = path.join(MDX_CONTENT_DIR, category, `${slug}.mdx`);
    if (fs.existsSync(p)) mdxFile = path.relative(REPO_ROOT, p);
  }
  return { pageFile, mdxFile };
}

function extractFrontmatterMeta(content: string): { title?: string; description?: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fm: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*["']?(.*?)["']?\s*$/);
    if (m) fm[m[1]] = m[2];
  }
  return fm;
}

function extractTsxMeta(content: string): { title: string | null; description: string | null } {
  const titleMatch = content.match(/title:\s*[`"']([^`"']+)[`"']/);
  const descMatch = content.match(/description:\s*[`"']([^`"']+)[`"']/);
  return { title: titleMatch ? titleMatch[1] : null, description: descMatch ? descMatch[1] : null };
}

function getPageCurrentMeta(files: { pageFile: string | null; mdxFile: string | null }): {
  title: string | null;
  description: string | null;
} {
  let title: string | null = null;
  let description: string | null = null;
  if (files.mdxFile) {
    const fm = extractFrontmatterMeta(fs.readFileSync(path.join(REPO_ROOT, files.mdxFile), "utf8"));
    if (fm.title) title = fm.title;
    if (fm.description) description = fm.description;
  }
  if ((!title || !description) && files.pageFile) {
    const meta = extractTsxMeta(fs.readFileSync(path.join(REPO_ROOT, files.pageFile), "utf8"));
    if (!title && meta.title) title = meta.title;
    if (!description && meta.description) description = meta.description;
  }
  return { title, description };
}

type BucketStats = { impressions: number; clicks: number; avgPosition: number | null; ctr: number };

function summariseWindow(dailyRows: GscRow[], start: Date, end: Date): BucketStats {
  let impressions = 0,
    clicks = 0,
    posWeighted = 0;
  for (const r of dailyRows) {
    const [dateStr] = r.keys;
    const d = new Date(dateStr);
    if (d >= start && d <= end) {
      impressions += r.impressions;
      clicks += r.clicks;
      posWeighted += r.position * r.impressions;
    }
  }
  return {
    impressions,
    clicks,
    avgPosition: impressions ? Math.round((posWeighted / impressions) * 10) / 10 : null,
    ctr: impressions ? Math.round((clicks / impressions) * 1000) / 10 : 0,
  };
}

function monthlyBuckets(dailyRows: GscRow[]): (BucketStats & { month: string })[] {
  const byMonth = new Map<string, { impressions: number; clicks: number; posWeighted: number }>();
  for (const r of dailyRows) {
    const [dateStr] = r.keys;
    const month = dateStr.slice(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, { impressions: 0, clicks: 0, posWeighted: 0 });
    const b = byMonth.get(month)!;
    b.impressions += r.impressions;
    b.clicks += r.clicks;
    b.posWeighted += r.position * r.impressions;
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, b]) => ({
      month,
      impressions: b.impressions,
      clicks: b.clicks,
      avgPosition: b.impressions ? Math.round((b.posWeighted / b.impressions) * 10) / 10 : null,
      ctr: b.impressions ? Math.round((b.clicks / b.impressions) * 1000) / 10 : 0,
    }));
}

function weeklyBuckets(dailyRows: GscRow[], currentEnd: Date, weeks = 12): (BucketStats & { weekOf: string })[] {
  const buckets: { start: Date; end: Date; impressions: number; clicks: number; posWeighted: number }[] = [];
  for (let i = 0; i < weeks; i++) {
    const end = addDays(currentEnd, -7 * i);
    const start = addDays(end, -6);
    buckets.unshift({ start, end, impressions: 0, clicks: 0, posWeighted: 0 });
  }
  for (const r of dailyRows) {
    const [dateStr] = r.keys;
    const d = new Date(dateStr);
    for (const b of buckets) {
      if (d >= b.start && d <= b.end) {
        b.impressions += r.impressions;
        b.clicks += r.clicks;
        b.posWeighted += r.position * r.impressions;
        break;
      }
    }
  }
  return buckets
    .filter((b) => b.impressions > 0)
    .map((b) => ({
      weekOf: isoDate(b.start),
      impressions: b.impressions,
      clicks: b.clicks,
      avgPosition: b.impressions ? Math.round((b.posWeighted / b.impressions) * 10) / 10 : null,
      ctr: b.impressions ? Math.round((b.clicks / b.impressions) * 1000) / 10 : 0,
    }));
}

export type PageInspection = {
  pageUrl: string;
  matched: boolean;
  pageFile: string | null;
  mdxFile: string | null;
  currentTitle: string | null;
  currentDescription: string | null;
  hasData: boolean;
  trend: {
    windowDays: number;
    recent: BucketStats;
    prior: BucketStats;
  };
  monthly: (BucketStats & { month: string })[];
  weekly: (BucketStats & { weekOf: string })[];
  topQueries: { query: string; position: number; impressions: number; clicks: number; ctr: number }[];
};

export async function getPageInspection(pathname: string): Promise<PageInspection> {
  const cleanPath = (() => {
    try {
      return new URL(pathname).pathname.replace(/\/$/, "") || "/";
    } catch {
      return pathname.replace(/\/$/, "") || "/";
    }
  })();

  const fullPageUrl = `${siteOrigin()}${cleanPath}`;

  const today = new Date();
  const currentEnd = addDays(today, -3);
  const historyStart = addDays(currentEnd, -INSPECT_HISTORY_DAYS);

  // A plain "equals" filter misses this page's own URL-fragment variants
  // (see consolidateFragmentRows above) - those rows have a literally
  // different page string (".../page#some-heading") so they'd silently
  // never match, undercounting a page that has in-SERP jump links. Anchor
  // the regex to the exact base URL, allowing an optional #fragment tail.
  const pageFilter: GscFilter[] = [
    { dimension: "page", operator: "includingRegex", expression: `^${escapeRegex(fullPageUrl)}(#.*)?$` },
  ];

  const [dailyRows, queryRows] = await Promise.all([
    fetchRows(isoDate(historyStart), isoDate(currentEnd), ["date"], pageFilter),
    fetchRows(isoDate(addDays(currentEnd, -90)), isoDate(currentEnd), ["query"], pageFilter),
  ]);

  const files = findContentFiles(cleanPath);
  const meta = getPageCurrentMeta(files);

  const recentStart = addDays(currentEnd, -(INSPECT_TREND_WINDOW_DAYS - 1));
  const priorEnd = addDays(recentStart, -1);
  const priorStart = addDays(priorEnd, -(INSPECT_TREND_WINDOW_DAYS - 1));

  const topQueries = queryRows
    .filter((r) => r.impressions >= 3)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 20)
    .map((r) => ({
      query: r.keys[0],
      position: Math.round(r.position * 10) / 10,
      impressions: r.impressions,
      clicks: r.clicks,
      ctr: r.impressions ? Math.round((r.clicks / r.impressions) * 1000) / 10 : 0,
    }));

  return {
    pageUrl: fullPageUrl,
    matched: !!files.pageFile,
    pageFile: files.pageFile,
    mdxFile: files.mdxFile,
    currentTitle: meta.title,
    currentDescription: meta.description,
    hasData: dailyRows.length > 0,
    trend: {
      windowDays: INSPECT_TREND_WINDOW_DAYS,
      recent: summariseWindow(dailyRows, recentStart, currentEnd),
      prior: summariseWindow(dailyRows, priorStart, priorEnd),
    },
    monthly: monthlyBuckets(dailyRows),
    weekly: weeklyBuckets(dailyRows, currentEnd),
    topQueries,
  };
}

// --- ad-hoc period comparison ---------------------------------------------
// Answers "why was period A different from period B" for the whole site:
// total impressions/clicks either side, then which specific pages and
// queries account for the difference. Unlike getSeoReport (fixed rolling
// windows, pre-shaped into named tabs) and getPageInspection (locked to one
// page), this takes any two arbitrary date ranges - a single day each for
// "why was Friday down vs Wednesday", or wider ranges for "this week vs
// last week" - and returns raw movers, not a pre-set analysis.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertValidDate(label: string, value: string): void {
  if (!DATE_RE.test(value)) {
    throw new Error(`${label} must be an ISO date (YYYY-MM-DD), got "${value}"`);
  }
}

export type PeriodTotals = { start: string; end: string; impressions: number; clicks: number; avgPosition: number | null; ctr: number };

export type MoverRow = {
  key: string; // page URL or query string
  impressionsA: number;
  impressionsB: number;
  delta: number; // A - B; negative = down in period A vs period B
  clicksA: number;
  clicksB: number;
  positionA: number | null;
  positionB: number | null;
};

export type PeriodComparison = {
  periodA: PeriodTotals;
  periodB: PeriodTotals;
  totalImpressionsDelta: number;
  totalClicksDelta: number;
  topPageDrops: MoverRow[];
  topPageGains: MoverRow[];
  topQueryDrops: MoverRow[];
  topQueryGains: MoverRow[];
  // Non-null whenever either requested range reaches into GSC's own
  // reporting lag - see GSC_DATA_LAG_DAYS. Surfaced in the response itself,
  // not just the tool description, so a too-recent date can't quietly be
  // read as a real drop instead of missing/partial data.
  dataFreshnessWarning: string | null;
};

// GSC typically takes 2-3 days to finish processing a given day's data -
// matches the lag assumption already used in getSeoReport/getPageInspection
// (addDays(today, -3)).
const GSC_DATA_LAG_DAYS = 3;

function freshnessWarning(startA: string, endA: string, startB: string, endB: string): string | null {
  const boundary = isoDate(addDays(new Date(), -GSC_DATA_LAG_DAYS));
  const affected: string[] = [];
  if (endA >= boundary) affected.push(`period A (${startA} to ${endA})`);
  if (endB >= boundary) affected.push(`period B (${startB} to ${endB})`);
  if (affected.length === 0) return null;
  return (
    `Search Console data usually takes ${GSC_DATA_LAG_DAYS} days to finish processing. ` +
    `${affected.join(" and ")} include dates on or after ${boundary}, so numbers there ` +
    `may still be partial/incomplete rather than a real change - don't read a drop in ` +
    `that period as confirmed without rechecking once the lag window has passed.`
  );
}

function totalsFromRows(rows: GscRow[], start: string, end: string): PeriodTotals {
  let impressions = 0,
    clicks = 0,
    posWeighted = 0;
  for (const r of rows) {
    impressions += r.impressions;
    clicks += r.clicks;
    posWeighted += r.position * r.impressions;
  }
  return {
    start,
    end,
    impressions,
    clicks,
    avgPosition: impressions ? Math.round((posWeighted / impressions) * 10) / 10 : null,
    ctr: impressions ? Math.round((clicks / impressions) * 1000) / 10 : 0,
  };
}

function buildMovers(rowsA: GscRow[], rowsB: GscRow[], maxEach = 25): { drops: MoverRow[]; gains: MoverRow[] } {
  const byKey = new Map<string, { a?: GscRow; b?: GscRow }>();
  for (const r of rowsA) {
    const key = r.keys[0];
    if (!byKey.has(key)) byKey.set(key, {});
    byKey.get(key)!.a = r;
  }
  for (const r of rowsB) {
    const key = r.keys[0];
    if (!byKey.has(key)) byKey.set(key, {});
    byKey.get(key)!.b = r;
  }

  const rows: MoverRow[] = [];
  for (const [key, { a, b }] of byKey) {
    const impressionsA = a?.impressions ?? 0;
    const impressionsB = b?.impressions ?? 0;
    // Skip noise: both sides negligible.
    if (impressionsA < 3 && impressionsB < 3) continue;
    rows.push({
      key,
      impressionsA,
      impressionsB,
      delta: impressionsA - impressionsB,
      clicksA: a?.clicks ?? 0,
      clicksB: b?.clicks ?? 0,
      positionA: a ? Math.round(a.position * 10) / 10 : null,
      positionB: b ? Math.round(b.position * 10) / 10 : null,
    });
  }

  const drops = rows
    .filter((r) => r.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, maxEach);
  const gains = rows
    .filter((r) => r.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, maxEach);

  return { drops, gains };
}

export async function comparePeriods(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): Promise<PeriodComparison> {
  assertValidDate("startA", startA);
  assertValidDate("endA", endA);
  assertValidDate("startB", startB);
  assertValidDate("endB", endB);

  const [totalRowsA, totalRowsB, pageRowsA, pageRowsB, queryRowsA, queryRowsB] = await Promise.all([
    // Site-wide totals MUST come from an undimensioned query, not from
    // summing page- or query-dimensioned rows. GSC's page/query breakdowns
    // don't sum back to the true total (e.g. sitelinks can attribute one
    // impression to several page URLs), which previously made this total
    // read ~15% high against the real Search Console UI number - confirmed
    // by direct comparison against a user-reported figure.
    fetchRows(startA, endA, []),
    fetchRows(startB, endB, []),
    fetchRows(startA, endA, ["page"]),
    fetchRows(startB, endB, ["page"]),
    fetchRows(startA, endA, ["query"]),
    fetchRows(startB, endB, ["query"]),
  ]);

  const periodA = totalsFromRows(totalRowsA, startA, endA);
  const periodB = totalsFromRows(totalRowsB, startB, endB);
  const pageMovers = buildMovers(pageRowsA, pageRowsB);
  const queryMovers = buildMovers(queryRowsA, queryRowsB);

  return {
    periodA,
    periodB,
    totalImpressionsDelta: periodA.impressions - periodB.impressions,
    totalClicksDelta: periodA.clicks - periodB.clicks,
    topPageDrops: pageMovers.drops,
    topPageGains: pageMovers.gains,
    topQueryDrops: queryMovers.drops,
    topQueryGains: queryMovers.gains,
    dataFreshnessWarning: freshnessWarning(startA, endA, startB, endB),
  };
}

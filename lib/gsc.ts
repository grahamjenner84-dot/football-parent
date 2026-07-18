import { JWT } from "google-auth-library";

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
const RANK_TRACKER_MAX_ROWS = 150;

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

async function fetchRows(
  startDate: string,
  endDate: string,
  dimensions: string[]
): Promise<GscRow[]> {
  const client = getClient();
  const siteUrl = process.env.GSC_SITE_URL;
  if (!siteUrl) throw new Error("Missing GSC_SITE_URL env var");

  const rows: GscRow[] = [];
  let startRow = 0;
  const rowLimit = 25000;

  while (true) {
    const res = await client.request({
      url: `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
        siteUrl
      )}/searchAnalytics/query`,
      method: "POST",
      data: { startDate, endDate, dimensions, rowLimit, startRow },
    });
    const data = res.data as { rows?: GscRow[] };
    const batch = data.rows || [];
    rows.push(...batch);
    if (batch.length < rowLimit) break;
    startRow += rowLimit;
  }

  return rows;
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

  return results
    .sort((a, b) => b.recentImpressions + b.priorImpressions - (a.recentImpressions + a.priorImpressions))
    .slice(0, RANK_TRACKER_MAX_ROWS);
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

// --- main entry point ---------------------------------------------------

export type SeoReport = {
  periodStart: string;
  periodEnd: string;
  strikingDistance: StrikingRow[];
  lowCtr: LowCtrRow[];
  decay: DecayRow[];
  cannibalisation: CannibalRow[];
  silence: SilenceRow[];
  rankTracker: RankRow[];
};

export async function getSeoReport(): Promise<SeoReport> {
  const today = new Date();
  const currentEnd = addDays(today, -3); // GSC data lags a couple of days
  const currentStart = addDays(currentEnd, -CURRENT_PERIOD_DAYS);
  const priorEnd = addDays(currentStart, -1);
  const priorStart = addDays(priorEnd, -COMPARE_PERIOD_DAYS);

  // Decay's own, shorter window - see the constant comments above.
  const decayCurrentStart = addDays(currentEnd, -DECAY_CURRENT_PERIOD_DAYS);
  const decayPriorEnd = addDays(decayCurrentStart, -1);
  const decayPriorStart = addDays(decayPriorEnd, -DECAY_COMPARE_PERIOD_DAYS);

  const silenceWindowStart = addDays(currentEnd, -(SILENCE_RECENT_DAYS + SILENCE_BASELINE_DAYS - 1));

  // Rank tracker needs its "recent" window (currentEnd back RANK_TRACKER_WINDOW_DAYS)
  // and the same span 7 days earlier - covered by one fetch from the older
  // boundary through currentEnd.
  const rankTrackerWindowStart = addDays(currentEnd, -(RANK_TRACKER_WINDOW_DAYS - 1 + 7));

  const [queryPageRows, pageRowsCurrent, decayRowsCurrent, decayRowsPrior, pageDateRows, rankTrackerRows] = await Promise.all([
    fetchRows(isoDate(currentStart), isoDate(currentEnd), ["query", "page"]),
    fetchRows(isoDate(currentStart), isoDate(currentEnd), ["page"]),
    fetchRows(isoDate(decayCurrentStart), isoDate(currentEnd), ["page"]),
    fetchRows(isoDate(decayPriorStart), isoDate(decayPriorEnd), ["page"]),
    fetchRows(isoDate(silenceWindowStart), isoDate(currentEnd), ["page", "date"]),
    fetchRows(isoDate(rankTrackerWindowStart), isoDate(currentEnd), ["query", "page", "date"]),
  ]);

  return {
    periodStart: isoDate(currentStart),
    periodEnd: isoDate(currentEnd),
    strikingDistance: analyseStrikingDistance(queryPageRows),
    lowCtr: analyseLowCtr(pageRowsCurrent),
    decay: analyseDecay(decayRowsCurrent, decayRowsPrior),
    cannibalisation: analyseCannibalisation(queryPageRows),
    silence: analyseSilence(pageDateRows, currentEnd),
    rankTracker: analyseRankTracker(rankTrackerRows, currentEnd),
  };
}

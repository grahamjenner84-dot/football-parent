import { JWT } from "google-auth-library";

const SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"];

const STRIKING_DISTANCE_MIN_POS = 11;
const STRIKING_DISTANCE_MAX_POS = 20;
const STRIKING_DISTANCE_MIN_IMPRESSIONS = 20;
const LOW_CTR_MIN_IMPRESSIONS = 50;
const DECAY_MIN_CLICK_DROP_PCT = 30;
const DECAY_MIN_PRIOR_CLICKS = 5;
const CURRENT_PERIOD_DAYS = 90;
const COMPARE_PERIOD_DAYS = 90;

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

// --- main entry point ---------------------------------------------------

export type SeoReport = {
  periodStart: string;
  periodEnd: string;
  strikingDistance: StrikingRow[];
  lowCtr: LowCtrRow[];
  decay: DecayRow[];
  cannibalisation: CannibalRow[];
};

export async function getSeoReport(): Promise<SeoReport> {
  const today = new Date();
  const currentEnd = addDays(today, -3); // GSC data lags a couple of days
  const currentStart = addDays(currentEnd, -CURRENT_PERIOD_DAYS);
  const priorEnd = addDays(currentStart, -1);
  const priorStart = addDays(priorEnd, -COMPARE_PERIOD_DAYS);

  const [queryPageRows, pageRowsCurrent, pageRowsPrior] = await Promise.all([
    fetchRows(isoDate(currentStart), isoDate(currentEnd), ["query", "page"]),
    fetchRows(isoDate(currentStart), isoDate(currentEnd), ["page"]),
    fetchRows(isoDate(priorStart), isoDate(priorEnd), ["page"]),
  ]);

  return {
    periodStart: isoDate(currentStart),
    periodEnd: isoDate(currentEnd),
    strikingDistance: analyseStrikingDistance(queryPageRows),
    lowCtr: analyseLowCtr(pageRowsCurrent),
    decay: analyseDecay(pageRowsCurrent, pageRowsPrior),
    cannibalisation: analyseCannibalisation(queryPageRows),
  };
}

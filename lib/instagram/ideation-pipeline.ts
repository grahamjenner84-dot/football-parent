import type { SeoReport, StrikingRow, LowCtrRow, RankRow } from "../gsc";

// Turns a raw SeoReport into a ranked shortlist of pages worth an education
// carousel, by combining three independent signals per page rather than
// treating them as separate lists:
//   - lowCtr: proven demand (real impressions) that isn't converting to
//     clicks - the page already ranks, the snippet/intent match is the gap.
//   - strikingDistance: queries at position 11-20 - close enough to page 1
//     that a stronger content signal (which a carousel driving traffic back
//     to the article can be) may tip them over.
//   - rankTracker 'new'/'up': freshly emerging or improving demand - worth
//     capitalising on while it's rising, not after it's already peaked.
// A page hit by more than one signal (a "cluster") is a stronger bet than
// any single signal alone, so clustering multiplies rather than just adds.

export type OpportunityType = "low_ctr" | "striking_distance" | "rising_query" | "cluster";

export interface OpportunityQuery {
  query: string;
  impressions: number;
  position: number | null;
}

export interface Opportunity {
  page: string; // full URL, as returned by GSC
  pathname: string;
  score: number;
  dominantType: OpportunityType;
  signals: OpportunityType[];
  queries: OpportunityQuery[]; // top queries driving the score, impressions desc
  totalImpressions: number;
  rationale: string;
}

export interface IdeationConfig {
  topN: number;
  lowCtrWeight: number;
  strikingWeight: number;
  risingWeight: number;
  risingMinImpressions: number;
  risingMinDelta: number; // minimum position improvement to count 'up' as rising, not noise
  clusterMinSignals: number;
  clusterBonus: number; // multiplier applied when clusterMinSignals is met
  maxQueriesPerOpportunity: number;
}

const DEFAULT_CONFIG: IdeationConfig = {
  topN: 5,
  lowCtrWeight: 1,
  strikingWeight: 1,
  risingWeight: 1.5, // rising demand is time-sensitive - worth capitalising on before it's obvious
  risingMinImpressions: 5,
  risingMinDelta: 2,
  clusterMinSignals: 2,
  clusterBonus: 1.4,
  maxQueriesPerOpportunity: 5,
};

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function getIdeationConfig(): IdeationConfig {
  return {
    topN: envNumber("IDEATION_TOP_N", DEFAULT_CONFIG.topN),
    lowCtrWeight: envNumber("IDEATION_LOWCTR_WEIGHT", DEFAULT_CONFIG.lowCtrWeight),
    strikingWeight: envNumber("IDEATION_STRIKING_WEIGHT", DEFAULT_CONFIG.strikingWeight),
    risingWeight: envNumber("IDEATION_RISING_WEIGHT", DEFAULT_CONFIG.risingWeight),
    risingMinImpressions: envNumber("IDEATION_RISING_MIN_IMPRESSIONS", DEFAULT_CONFIG.risingMinImpressions),
    risingMinDelta: envNumber("IDEATION_RISING_MIN_DELTA", DEFAULT_CONFIG.risingMinDelta),
    clusterMinSignals: envNumber("IDEATION_CLUSTER_MIN_SIGNALS", DEFAULT_CONFIG.clusterMinSignals),
    clusterBonus: envNumber("IDEATION_CLUSTER_BONUS", DEFAULT_CONFIG.clusterBonus),
    maxQueriesPerOpportunity: envNumber("IDEATION_MAX_QUERIES", DEFAULT_CONFIG.maxQueriesPerOpportunity),
  };
}

function pathnameOf(url: string): string | null {
  try {
    return new URL(url).pathname.replace(/\/$/, "") || "/";
  } catch {
    return null;
  }
}

interface PageAccumulator {
  page: string;
  pathname: string;
  lowCtrScore: number;
  lowCtrDetail?: string;
  lowCtrImpressions: number;
  strikingScore: number;
  risingScore: number;
  signals: Set<OpportunityType>;
  queries: Map<string, OpportunityQuery>;
}

function getOrCreate(map: Map<string, PageAccumulator>, page: string, pathname: string): PageAccumulator {
  let acc = map.get(pathname);
  if (!acc) {
    acc = { page, pathname, lowCtrScore: 0, lowCtrImpressions: 0, strikingScore: 0, risingScore: 0, signals: new Set(), queries: new Map() };
    map.set(pathname, acc);
  }
  return acc;
}

function addQuery(acc: PageAccumulator, query: string, impressions: number, position: number | null): void {
  const existing = acc.queries.get(query);
  if (!existing || existing.impressions < impressions) {
    acc.queries.set(query, { query, impressions, position });
  }
}

function scoreLowCtr(rows: LowCtrRow[], byPage: Map<string, PageAccumulator>): void {
  for (const row of rows) {
    const pathname = pathnameOf(row.page);
    if (!pathname) continue;
    const acc = getOrCreate(byPage, row.page, pathname);
    // Magnitude of the gap between what CTR "should" be at this position and
    // what it actually is, scaled by how many people saw it - this is a
    // proxy for "clicks left on the table", not a real CTR forecast.
    const gap = Math.max(0, row.expectedCtr - row.actualCtr);
    acc.lowCtrScore += row.impressions * gap;
    acc.lowCtrImpressions += row.impressions;
    acc.lowCtrDetail = `${row.impressions} impressions at ${row.actualCtr}% CTR (expected ~${row.expectedCtr}% at position ${row.position})`;
    acc.signals.add("low_ctr");
  }
}

function scoreStrikingDistance(rows: StrikingRow[], byPage: Map<string, PageAccumulator>): void {
  for (const row of rows) {
    const pathname = pathnameOf(row.page);
    if (!pathname) continue;
    const acc = getOrCreate(byPage, row.page, pathname);
    // Closer to page 1 (lower position number) is worth more - a query at
    // 11 is much likelier to convert with a nudge than one at 20.
    const closeness = Math.max(0, 21 - row.position);
    acc.strikingScore += row.impressions * closeness;
    acc.signals.add("striking_distance");
    addQuery(acc, row.query, row.impressions, row.position);
  }
}

function scoreRising(rows: RankRow[], byPage: Map<string, PageAccumulator>, config: IdeationConfig): void {
  for (const row of rows) {
    const pathname = pathnameOf(row.page);
    if (!pathname) continue;
    if (row.recentImpressions < config.risingMinImpressions) continue;

    const isNew = row.direction === "new";
    const isRisingUp = row.direction === "up" && (row.delta ?? 0) >= config.risingMinDelta;
    if (!isNew && !isRisingUp) continue;

    const acc = getOrCreate(byPage, row.page, pathname);
    // A brand-new query with no prior-period data is weighted higher than an
    // improving one - it's demand that didn't exist a week ago, the
    // freshest signal in the report.
    const bonus = isNew ? 2 : 1 + (row.delta ?? 0) / 10;
    acc.risingScore += row.recentImpressions * bonus;
    acc.signals.add("rising_query");
    addQuery(acc, row.query, row.recentImpressions, row.recentPosition);
  }
}

function dominantType(acc: PageAccumulator, config: IdeationConfig): OpportunityType {
  if (acc.signals.size >= config.clusterMinSignals) return "cluster";
  const weighted: [OpportunityType, number][] = [
    ["low_ctr", acc.lowCtrScore * config.lowCtrWeight],
    ["striking_distance", acc.strikingScore * config.strikingWeight],
    ["rising_query", acc.risingScore * config.risingWeight],
  ];
  weighted.sort((a, b) => b[1] - a[1]);
  return weighted[0][0];
}

function buildRationale(acc: PageAccumulator, type: OpportunityType, config: IdeationConfig): string {
  const parts: string[] = [];
  if (acc.lowCtrScore > 0 && acc.lowCtrDetail) parts.push(`low CTR (${acc.lowCtrDetail})`);
  if (acc.strikingScore > 0) parts.push(`striking-distance queries close to page 1`);
  if (acc.risingScore > 0) parts.push(`new/rising query demand`);
  const clusterNote = acc.signals.size >= config.clusterMinSignals ? " - multiple signals stacking on one page (cluster)" : "";
  return parts.join("; ") + clusterNote;
}

// Selects the strongest N page-level opportunities from a full SeoReport.
// Deliberately picks a shortlist rather than surfacing every flagged
// row - see IdeationConfig.topN.
export function selectOpportunities(report: SeoReport, config: IdeationConfig = getIdeationConfig()): Opportunity[] {
  const byPage = new Map<string, PageAccumulator>();

  scoreLowCtr(report.lowCtr, byPage);
  scoreStrikingDistance(report.strikingDistance, byPage);
  scoreRising(report.rankTracker, byPage, config);

  const opportunities: Opportunity[] = [];
  for (const acc of byPage.values()) {
    const clusterMultiplier = acc.signals.size >= config.clusterMinSignals ? config.clusterBonus : 1;
    const score =
      (acc.lowCtrScore * config.lowCtrWeight + acc.strikingScore * config.strikingWeight + acc.risingScore * config.risingWeight) *
      clusterMultiplier;
    if (score <= 0) continue;

    const type = dominantType(acc, config);
    const queries = [...acc.queries.values()].sort((a, b) => b.impressions - a.impressions).slice(0, config.maxQueriesPerOpportunity);
    // A pure low-CTR opportunity has no per-query rows (GSC's low-CTR
    // analysis is page-level) - fall back to a page-level placeholder so
    // callers always have at least one "query" to anchor the extraction
    // prompt on, carrying the real page-level impressions rather than a
    // fake "1".
    const finalQueries = queries.length > 0 ? queries : [{ query: `(page-level demand, no single driving query)`, impressions: acc.lowCtrImpressions, position: null }];
    // Impressions across the three signal types are measured over
    // overlapping-but-different windows/granularities (page-level for
    // low-CTR, summed per-query for the others), so they aren't additive -
    // the max is a reasonable proxy for "how much demand touches this page".
    const totalImpressions = Math.max(acc.lowCtrImpressions, finalQueries.reduce((s, q) => s + q.impressions, 0));

    opportunities.push({
      page: acc.page,
      pathname: acc.pathname,
      score,
      dominantType: type,
      signals: [...acc.signals],
      queries: finalQueries,
      totalImpressions,
      rationale: buildRationale(acc, type, config),
    });
  }

  return opportunities.sort((a, b) => b.score - a.score).slice(0, config.topN);
}

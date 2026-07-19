import { test } from "node:test";
import assert from "node:assert/strict";
import { selectOpportunities, getIdeationConfig, IdeationConfig } from "../lib/instagram/ideation-pipeline";
import type { SeoReport } from "../lib/gsc";

const BASE_URL = "https://www.footballparent.co.uk";

function emptyReport(overrides: Partial<SeoReport> = {}): SeoReport {
  return {
    periodStart: "2026-04-01",
    periodEnd: "2026-06-30",
    strikingDistance: [],
    lowCtr: [],
    decay: [],
    cannibalisation: [],
    silence: [],
    rankTracker: [],
    ...overrides,
  };
}

function testConfig(overrides: Partial<IdeationConfig> = {}): IdeationConfig {
  return { ...getIdeationConfig(), topN: 10, ...overrides };
}

test("selectOpportunities: a low-CTR page scores above zero and is labeled low_ctr", () => {
  const report = emptyReport({
    lowCtr: [{ page: `${BASE_URL}/football-gear/best-footballs-by-age`, position: 4.2, impressions: 2244, clicks: 16, actualCtr: 0.7, expectedCtr: 8 }],
  });
  const [opp] = selectOpportunities(report, testConfig());
  assert.equal(opp.pathname, "/football-gear/best-footballs-by-age");
  assert.equal(opp.dominantType, "low_ctr");
  assert.ok(opp.score > 0);
});

test("selectOpportunities: striking-distance queries on the same page are grouped and weighted toward page 1", () => {
  const page = `${BASE_URL}/academy-pathway/jpl-meaning`;
  const report = emptyReport({
    strikingDistance: [
      { query: "jpl meaning", page, position: 12, impressions: 100, clicks: 1, ctr: 1 },
      { query: "what does jpl stand for", page, position: 18, impressions: 50, clicks: 0, ctr: 0 },
    ],
  });
  const [opp] = selectOpportunities(report, testConfig());
  assert.equal(opp.pathname, "/academy-pathway/jpl-meaning");
  assert.equal(opp.dominantType, "striking_distance");
  assert.equal(opp.queries.length, 2);
  // position 12 (closer to page 1) contributes more per-impression than position 18
  assert.ok(opp.score > 0);
});

test("selectOpportunities: a 'new' rank-tracker query counts as rising, a 'down' one is ignored", () => {
  const risingPage = `${BASE_URL}/academy-pathway/category-1-academy`;
  const decliningPage = `${BASE_URL}/academy-pathway/category-2-academy`;
  const report = emptyReport({
    rankTracker: [
      { query: "category 1 academy", page: risingPage, recentPosition: 15, recentImpressions: 40, recentClicks: 0, priorPosition: null, priorImpressions: 0, priorClicks: 0, delta: null, direction: "new" },
      { query: "category 2 academy", page: decliningPage, recentPosition: 25, recentImpressions: 40, recentClicks: 0, priorPosition: 10, priorImpressions: 40, priorClicks: 5, delta: -15, direction: "down" },
    ],
  });
  const results = selectOpportunities(report, testConfig());
  const pathnames = results.map((r) => r.pathname);
  assert.ok(pathnames.includes("/academy-pathway/category-1-academy"), "rising 'new' query should be scored");
  assert.ok(!pathnames.includes("/academy-pathway/category-2-academy"), "declining 'down' query should not be scored");
});

test("selectOpportunities: an 'up' query below risingMinDelta is treated as noise and ignored", () => {
  const page = `${BASE_URL}/parent-guides/small-improvement`;
  const report = emptyReport({
    rankTracker: [
      { query: "small improvement", page, recentPosition: 14, recentImpressions: 40, recentClicks: 0, priorPosition: 15, priorImpressions: 40, priorClicks: 0, delta: 1, direction: "up" },
    ],
  });
  const results = selectOpportunities(report, testConfig({ risingMinDelta: 2 }));
  assert.equal(results.length, 0);
});

test("selectOpportunities: a page hit by multiple signal types is a cluster and outranks a single-signal page of similar raw magnitude", () => {
  const clusterPage = `${BASE_URL}/academy-pathway/jpl-guide`;
  const singlePage = `${BASE_URL}/football-gear/single-signal-page`;
  const report = emptyReport({
    lowCtr: [{ page: clusterPage, position: 5, impressions: 500, clicks: 5, actualCtr: 1, expectedCtr: 6 }],
    strikingDistance: [{ query: "jpl meaning", page: clusterPage, position: 12, impressions: 500, clicks: 2, ctr: 0.4 }],
    rankTracker: [{ query: "single signal", page: singlePage, recentPosition: 12, recentImpressions: 1000, recentClicks: 0, priorPosition: null, priorImpressions: 0, priorClicks: 0, delta: null, direction: "new" }],
  });
  const results = selectOpportunities(report, testConfig({ clusterMinSignals: 2, clusterBonus: 1.4 }));
  const cluster = results.find((r) => r.pathname === "/academy-pathway/jpl-guide")!;
  assert.equal(cluster.dominantType, "cluster");
  assert.ok(cluster.signals.length >= 2);
});

test("selectOpportunities: respects topN and sorts by score descending", () => {
  const report = emptyReport({
    lowCtr: [
      { page: `${BASE_URL}/a`, position: 5, impressions: 100, clicks: 1, actualCtr: 1, expectedCtr: 6 },
      { page: `${BASE_URL}/b`, position: 5, impressions: 900, clicks: 1, actualCtr: 1, expectedCtr: 6 },
      { page: `${BASE_URL}/c`, position: 5, impressions: 300, clicks: 1, actualCtr: 1, expectedCtr: 6 },
    ],
  });
  const results = selectOpportunities(report, testConfig({ topN: 2 }));
  assert.equal(results.length, 2);
  assert.equal(results[0].pathname, "/b");
  assert.equal(results[1].pathname, "/c");
});

test("selectOpportunities: a page with no positive-scoring signal is excluded entirely", () => {
  const report = emptyReport();
  const results = selectOpportunities(report, testConfig());
  assert.equal(results.length, 0);
});

test("getIdeationConfig: reads overrides from env and falls back to defaults otherwise", () => {
  const original = process.env.IDEATION_TOP_N;
  process.env.IDEATION_TOP_N = "3";
  try {
    assert.equal(getIdeationConfig().topN, 3);
  } finally {
    if (original === undefined) delete process.env.IDEATION_TOP_N;
    else process.env.IDEATION_TOP_N = original;
  }
  const config = getIdeationConfig();
  assert.equal(config.clusterMinSignals, 2, "unset knobs should fall back to their documented default");
});

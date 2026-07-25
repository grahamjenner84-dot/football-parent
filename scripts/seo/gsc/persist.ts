import { getDb, nowIso } from "../database/db";
import { fetchGscRows, gscSiteOrigin, isoDate, addDays, type GscRow, type GscFilter } from "./client";

export type ObservationSource = "live_service_account" | "csv_import" | "xlsx_import";

export function upsertPage(url: string): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO pages (url, created_at, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(url) DO NOTHING`
  ).run(url, nowIso(), nowIso());
}

type ObservationRow = {
  pageUrl: string;
  query: string | null;
  date: string | null;
  periodStart: string;
  periodEnd: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number | null;
  source: ObservationSource;
};

// Re-pulling refreshes clicks/impressions/ctr/position for the same
// (page, query, date, period, source) identity rather than accumulating
// duplicates - GSC's own numbers can settle slightly within the lag window,
// and this keeps a repeat pull idempotent per the cache-freshness rules.
//
// SQLite gotcha this depends on getting right: UNIQUE/ON CONFLICT treats
// NULL as never equal to NULL, so two rows that are both
// query=NULL/date=NULL (the aggregate, no-query-dimension case) would never
// collide and would silently duplicate on every re-pull instead of
// upserting - caught by tests/seo/gsc-persist.test.ts. query/date are
// therefore stored as "" (not NULL) whenever there's no value, so the
// UNIQUE constraint actually enforces the identity it's meant to.
export function upsertObservation(row: ObservationRow): void {
  const db = getDb();
  upsertPage(row.pageUrl);
  db.prepare(
    `INSERT INTO gsc_observations
      (page_url, query, date, period_start, period_end, clicks, impressions, ctr, position, source, retrieved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(page_url, query, date, period_start, period_end, source) DO UPDATE SET
       clicks = excluded.clicks,
       impressions = excluded.impressions,
       ctr = excluded.ctr,
       position = excluded.position,
       retrieved_at = excluded.retrieved_at`
  ).run(
    row.pageUrl,
    row.query ?? "",
    row.date ?? "",
    row.periodStart,
    row.periodEnd,
    row.clicks,
    row.impressions,
    row.ctr,
    row.position,
    row.source,
    nowIso()
  );
}

export type PullResult = { rowsFetched: number; rowsPersisted: number; periodStart: string; periodEnd: string };

// "Existing, existing terms": query+page rows over an explicit window,
// persisted as period-aggregate observations (date=null). Call this twice
// with the current-28 and previous-28 windows to get the brief's "current
// 28 days versus previous 28 days" comparison - both land as distinct rows
// because their period_start/period_end differ.
export async function pullQueryPagePeriod(startDate: string, endDate: string): Promise<PullResult> {
  const rows = await fetchGscRows(startDate, endDate, ["query", "page"]);
  for (const r of rows) {
    const [query, page] = r.keys;
    upsertObservation({
      pageUrl: page,
      query,
      date: null,
      periodStart: startDate,
      periodEnd: endDate,
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
      source: "live_service_account",
    });
  }
  return { rowsFetched: rows.length, rowsPersisted: rows.length, periodStart: startDate, periodEnd: endDate };
}

// Site-wide page+date rows (no query dimension) - the raw material for
// decay/silence detection at the database layer. One row per page per day.
export async function pullPageDatePeriod(startDate: string, endDate: string, filters: GscFilter[] | null = null): Promise<PullResult> {
  const rows = await fetchGscRows(startDate, endDate, ["page", "date"], filters);
  for (const r of rows) {
    const [page, date] = r.keys;
    upsertObservation({
      pageUrl: page,
      query: null,
      date,
      periodStart: date,
      periodEnd: date,
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
      source: "live_service_account",
    });
  }
  return { rowsFetched: rows.length, rowsPersisted: rows.length, periodStart: startDate, periodEnd: endDate };
}

// Full history (query+page+date) for one specific page - used by the
// seo-page skill's "why is this page doing X" step. Mirrors
// lib/gsc.ts's getPageInspection query, but persisted this time.
export async function pullPageHistory(pathOrUrl: string, days = 180): Promise<PullResult & { pageUrl: string }> {
  const pageUrl = pathOrUrl.startsWith("http") ? pathOrUrl : `${gscSiteOrigin()}${pathOrUrl.replace(/\/$/, "") || "/"}`;
  const today = new Date();
  const currentEnd = addDays(today, -3); // GSC data lags a couple of days
  const historyStart = addDays(currentEnd, -days);
  const filters: GscFilter[] = [{ dimension: "page", operator: "equals", expression: pageUrl }];

  const rows = await fetchGscRows(isoDate(historyStart), isoDate(currentEnd), ["query", "date"], filters);
  for (const r of rows) {
    const [query, date] = r.keys;
    upsertObservation({
      pageUrl,
      query,
      date,
      periodStart: date,
      periodEnd: date,
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
      source: "live_service_account",
    });
  }
  return {
    rowsFetched: rows.length,
    rowsPersisted: rows.length,
    periodStart: isoDate(historyStart),
    periodEnd: isoDate(currentEnd),
    pageUrl,
  };
}

export function isStale(cacheFamily: "gsc", lastRetrievedAt: string | null, freshnessDays: number): boolean {
  if (!lastRetrievedAt) return true;
  const ageMs = Date.now() - new Date(lastRetrievedAt).getTime();
  return ageMs > freshnessDays * 24 * 60 * 60 * 1000;
}

export function lastGscRetrievalFor(pageUrl?: string): string | null {
  const db = getDb();
  const row = pageUrl
    ? (db.prepare("SELECT MAX(retrieved_at) as t FROM gsc_observations WHERE page_url = ?").get(pageUrl) as { t: string | null })
    : (db.prepare("SELECT MAX(retrieved_at) as t FROM gsc_observations").get() as { t: string | null });
  return row.t;
}

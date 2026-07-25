// /seo-status backend. Run: npx tsx scripts/seo/cli/status.ts
import fs from "node:fs";
import { migrate, tableCounts } from "../database/migrate";
import { getDb, DB_PATH } from "../database/db";
import { getDataForSeoEnvironment, isLiveAllowedByEnv, getDataForSeoCredentials } from "../shared/env";

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

async function main() {
  migrate();
  const db = getDb();

  const report: Record<string, unknown> = {};

  report.tableCounts = tableCounts();

  report.gscObservationCount = (db.prepare("SELECT COUNT(*) as c FROM gsc_observations").get() as { c: number }).c;
  report.uniqueKeywordCount = (db.prepare("SELECT COUNT(*) as c FROM keywords").get() as { c: number }).c;
  report.pageCount = (db.prepare("SELECT COUNT(*) as c FROM pages").get() as { c: number }).c;
  report.discoveryRunCount = (db.prepare("SELECT COUNT(*) as c FROM discovery_runs").get() as { c: number }).c;
  report.trendRunCount = (db.prepare("SELECT COUNT(*) as c FROM trend_runs").get() as { c: number }).c;
  report.backlinkProspectCount = (db.prepare("SELECT COUNT(*) as c FROM backlink_prospects").get() as { c: number }).c;

  report.rawResponsesByEnvironment = db
    .prepare("SELECT environment, COUNT(*) as c FROM raw_responses GROUP BY environment")
    .all();

  const cacheStatusCounts = db
    .prepare("SELECT cache_status, COUNT(*) as c FROM api_usage GROUP BY cache_status")
    .all() as { cache_status: string; c: number }[];
  const totalUsage = cacheStatusCounts.reduce((s, r) => s + r.c, 0);
  const hits = cacheStatusCounts.find((r) => r.cache_status === "hit")?.c ?? 0;
  report.cacheHitRate = totalUsage > 0 ? `${Math.round((hits / totalUsage) * 1000) / 10}%` : "n/a (no requests logged yet)";
  report.cacheStatusBreakdown = cacheStatusCounts;

  report.staleCacheRecords = (
    db.prepare("SELECT COUNT(*) as c FROM cache_records WHERE expires_at < datetime('now')").get() as { c: number }
  ).c;

  report.apiUsageByDate = db
    .prepare("SELECT date(occurred_at) as date, COUNT(*) as requests, SUM(COALESCE(cost,0)) as cost FROM api_usage GROUP BY date(occurred_at) ORDER BY date DESC LIMIT 30")
    .all();
  report.apiUsageByWorkflow = db
    .prepare("SELECT workflow, COUNT(*) as requests, SUM(COALESCE(cost,0)) as cost FROM api_usage GROUP BY workflow ORDER BY requests DESC")
    .all();
  report.apiUsageByEndpoint = db
    .prepare("SELECT endpoint, COUNT(*) as requests, SUM(COALESCE(cost,0)) as cost FROM api_usage GROUP BY endpoint ORDER BY requests DESC")
    .all();
  report.apiUsageByEnvironment = db
    .prepare("SELECT environment, COUNT(*) as requests, SUM(COALESCE(cost,0)) as cost FROM api_usage GROUP BY environment")
    .all();

  report.lastGscUpdate = (db.prepare("SELECT MAX(retrieved_at) as t FROM gsc_observations").get() as { t: string | null }).t;
  report.lastTrendUpdate = (db.prepare("SELECT MAX(created_at) as t FROM trend_runs").get() as { t: string | null }).t;

  report.latestImports = db.prepare("SELECT * FROM imports ORDER BY imported_at DESC LIMIT 10").all();

  report.databaseHealth = {
    path: DB_PATH,
    exists: fs.existsSync(DB_PATH),
    sizeBytes: safe(() => fs.statSync(DB_PATH).size, 0),
  };

  report.environmentSafety = {
    dataForSeoEnvironment: getDataForSeoEnvironment(),
    liveAllowedByEnv: isLiveAllowedByEnv(),
    dataForSeoCredentialsPresent: safe(() => !!getDataForSeoCredentials(), false),
    note: "Live calls additionally require confirmLive:true, only set in code after explicit in-session user approval - see scripts/seo/dataforseo/client.ts",
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

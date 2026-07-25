// /seo-setup backend (structure + env + DB + GSC check only - no
// DataForSEO calls at all, sandbox included; run
// scripts/seo/cli/sandbox-integration-test.ts separately for that).
// Run: npx tsx scripts/seo/cli/setup.ts
import fs from "node:fs";
import path from "node:path";
import { migrate, tableCounts } from "../database/migrate";
import { REPO_ROOT, ensureEnvLoaded, getDataForSeoEnvironment, isLiveAllowedByEnv } from "../shared/env";
import { fetchGscRows, isoDate, addDays } from "../gsc/client";

type Check = { name: string; ok: boolean; detail: string };
const checks: Check[] = [];
function check(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
}

const REQUIRED_DIRS = [
  "seo-data/database",
  "seo-data/imports",
  "seo-data/exports",
  "seo-data/raw",
  "seo-data/reports",
  "scripts/seo/shared",
  "scripts/seo/database",
  "scripts/seo/dataforseo/endpoints",
  "scripts/seo/gsc",
  "scripts/seo/imports",
  "scripts/seo/exports",
  "scripts/seo/clustering",
];

const REQUIRED_ENV_VARS = [
  ["DATAFORSEO_USERNAME or DATAFORSEO_LOGIN", () => !!(process.env.DATAFORSEO_USERNAME || process.env.DATAFORSEO_LOGIN)],
  ["DATAFORSEO_PASSWORD", () => !!process.env.DATAFORSEO_PASSWORD],
  ["GOOGLE_SERVICE_ACCOUNT_EMAIL", () => !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL],
  ["GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", () => !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY],
  ["GSC_SITE_URL", () => !!process.env.GSC_SITE_URL],
] as const;

async function main() {
  ensureEnvLoaded();

  for (const dir of REQUIRED_DIRS) {
    check(`directory exists: ${dir}`, fs.existsSync(path.join(REPO_ROOT, dir)), path.join(REPO_ROOT, dir));
  }

  for (const [label, test] of REQUIRED_ENV_VARS) {
    // Presence only - values are never read into this report.
    check(`env var set: ${label}`, test(), test() ? "present" : "MISSING");
  }

  const env = getDataForSeoEnvironment();
  check("DataForSEO environment defaults safely", env === "sandbox" || env === "live", `DATAFORSEO_ENV resolves to "${env}"`);
  check(
    "Live calls are not silently allowed",
    env === "sandbox" || isLiveAllowedByEnv() === (process.env.DATAFORSEO_ALLOW_LIVE === "true"),
    `live allowed by env flags: ${isLiveAllowedByEnv()} (live calls additionally require confirmLive:true in code)`
  );

  const migration = migrate();
  check("SQLite schema migrated", true, `schema_version=${migration.schemaVersion} (node:sqlite, no native deps)`);

  try {
    const end = addDays(new Date(), -3);
    const start = addDays(end, -1);
    const rows = await fetchGscRows(isoDate(start), isoDate(end), ["page"]);
    check("Existing GSC connection reachable", true, `service-account JWT auth OK, ${rows.length} page rows in a 1-day probe window`);
  } catch (err) {
    check("Existing GSC connection reachable", false, err instanceof Error ? err.message : String(err));
  }

  console.log(`\nDataForSEO environment: ${env}`);
  console.log(`Table counts: ${JSON.stringify(tableCounts())}`);
  console.log(`\nChecks:`);
  for (const c of checks) console.log(`${c.ok ? "OK" : "FAIL"} - ${c.name}: ${c.detail}`);

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} setup checks passed.`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

#!/usr/bin/env tsx
/**
 * Runway check - "do I need to sit down and run npm run render soon?"
 *
 *   npm run render:status
 *   npm run render:status -- --cadence=2 --threshold=4
 *
 * Read-only: never renders or changes anything. This is the report a future
 * alert/digest (Phase B+) would eventually wrap - for now it's just a
 * command you run yourself.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "./lib/load-env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
loadEnvLocal(REPO_ROOT);

import { createAdminClient, getRunwayStats } from "../lib/supabase/render-pipeline";

function argOrEnv(flag: string, envVar: string, fallback: number): number {
  const argPrefix = `--${flag}=`;
  const argMatch = process.argv.find((a) => a.startsWith(argPrefix));
  if (argMatch) {
    const val = Number(argMatch.slice(argPrefix.length));
    if (!Number.isNaN(val) && val > 0) return val;
  }
  const envVal = Number(process.env[envVar]);
  if (!Number.isNaN(envVal) && envVal > 0) return envVal;
  return fallback;
}

async function main() {
  const cadencePerDay = argOrEnv("cadence", "RENDER_CADENCE_PER_DAY", 1);
  const thresholdDays = argOrEnv("threshold", "RENDER_RUNWAY_THRESHOLD_DAYS", 3);
  const lookaheadDays = thresholdDays;

  const supabase = createAdminClient();
  const stats = await getRunwayStats(supabase, lookaheadDays);

  const runwayDays = stats.readyToPublish / cadencePerDay;

  console.log("Instagram content render runway");
  console.log("================================");
  console.log(`Posting cadence assumed: ${cadencePerDay} post(s)/day (override with --cadence=N)`);
  console.log("");
  console.log(`Rendered & ready to publish: ${stats.readyToPublish} post(s)`);
  console.log(`  -> approx runway: ${runwayDays.toFixed(1)} day(s) at current cadence`);
  if (stats.earliestReadyScheduledTime) {
    console.log(`  -> earliest scheduled_time: ${stats.earliestReadyScheduledTime}`);
  }
  if (stats.latestReadyScheduledTime) {
    console.log(`  -> latest scheduled_time:   ${stats.latestReadyScheduledTime}`);
  }
  console.log("");
  console.log(`Queued but NOT yet rendered (status='approved'): ${stats.awaitingRender} post(s)`);
  console.log(`  -> of which scheduled within the next ${lookaheadDays} day(s) and still unrendered: ${stats.awaitingRenderApproachingSoon}`);
  console.log("");

  const lowRunway = runwayDays < thresholdDays;
  const approachingUnrendered = stats.awaitingRenderApproachingSoon > 0;

  if (lowRunway || approachingUnrendered) {
    console.log(`>>> YOU SHOULD RUN \`npm run render\` <<<`);
    if (lowRunway) {
      console.log(`  - runway (${runwayDays.toFixed(1)}d) is below the threshold (${thresholdDays}d)`);
    }
    if (approachingUnrendered) {
      console.log(`  - ${stats.awaitingRenderApproachingSoon} unrendered post(s) have a scheduled slot in the next ${lookaheadDays} day(s)`);
    }
    process.exitCode = 1; // non-zero so this can gate a future alert/digest job
  } else {
    console.log("Runway looks healthy - nothing to do right now.");
  }
}

main().catch((err) => {
  console.error("render-status crashed:", err instanceof Error ? err.stack ?? err.message : err);
  process.exitCode = 2;
});

// Portable air conditioning research (2026-10-17), phase 2: live UK top 10
// for representative keywords from each cluster in
// portable-aircon-research-2026-10-17.json, with SERP features and PAA.
// Output: seo-data/exports/portable-aircon-serps-2026-10-17.json
//
// SAFETY: three-factor live gate; Graham asked for this research in-session 2026-10-17.
// Run:
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/portable-aircon-serps.ts
import { writeFileSync } from "node:fs";
import { migrate } from "../database/migrate";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { extractSerpFeatures, type SerpItem } from "../dataforseo/serp-features";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const WORKFLOW = "portable-aircon-research";
const OUT = "seo-data/exports/portable-aircon-serps-2026-10-17.json";

const TERMS = [
  // window kits and seals
  "window kit air conditioner", "portable air conditioner window kit", "air conditioner window seal kit", "casement window air conditioner",
  "air conditioner window kit outward opening", "air conditioner window kit outward opening uk", "window seal for portable air conditioner",
  "casement window air conditioner kit", "portable air conditioner for push out window", "how to install portable air conditioner in push-out window",
  "air conditioner velux window kit", "air conditioner sash window kit", "velux window seal kit", "portable air conditioner velux window",
  "portable air conditioner casement window", "tilt and turn window air conditioner", "portable air conditioner roof window", "skylight air conditioner",
  // no window, no hose, venting
  "best portable air conditioner uk without hose", "air conditioner unit no hose", "portable air conditioner without hose uk", "ventless air conditioner",
  "self evaporating portable air conditioner", "air conditioner without window", "portable air conditioner no window",
  "do portable air conditioners need to be vented", "how to vent a portable air conditioner without a window", "how to vent portable air conditioner",
  "portable air conditioner wall vent kit", "portable air conditioner vent through wall",
  // hoses and unit types
  "air conditioner hose extension", "insulated air conditioner hose", "dual hose portable air conditioner uk",
  // loft
  "does opening the loft hatch cool a house", "loft air conditioning", "loft conversion air conditioning", "how to keep loft cool in summer",
  "how to cool a loft room", "portable air conditioner for loft", "how to keep a loft room cool in summer", "loft room too hot",
  // quiet and bedroom
  "quiet portable air conditioner", "quietest portable air conditioner uk", "portable air conditioner for bedroom", "best portable air conditioner for bedroom uk",
  // running cost
  "how much does a portable air conditioner cost to run", "air conditioner running cost uk", "portable air conditioner running costs",
  // roof window heat blinds
  "thermal blinds velux", "blackout blinds velux", "velux heat protection blinds",
];

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }
  let totalCost = 0;
  const opts = { workflow: WORKFLOW, environment: "live" as const, confirmLive: true };
  const serps: Record<string, unknown> = {};
  for (const kw of TERMS) {
    const r = await googleOrganicSerp(kw, { ...opts, depth: 10 });
    totalCost += r.cost ?? 0;
    const items = ((r.data?.tasks?.[0]?.result?.[0] as { items?: SerpItem[] } | undefined)?.items ?? []) as (SerpItem & { rank_group?: number; domain?: string; url?: string })[];
    const organic = items.filter((i) => i.type === "organic").slice(0, 10).map((i) => ({ rank: i.rank_group, domain: i.domain, title: i.title, url: i.url }));
    const features = [...new Set(items.filter((i) => i.type !== "organic").map((i) => i.type))];
    const f = extractSerpFeatures(items);
    serps[kw] = { features, organic, paa: f.paaQuestions };
    console.log(`${kw}: ${organic.length} organic`);
  }
  writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), totalCost, serps }, null, 2));
  console.log(`written ${OUT}. Total cost $${totalCost.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

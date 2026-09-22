// Retries the specific keywords that hit DataForSEO task 40101 (Internal SE
// Server Error, uncharged) during the main SERP discovery pass.
import fs from "node:fs";
import path from "node:path";
import { migrate } from "../database/migrate";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { ensureEnvLoaded, REPO_ROOT } from "../shared/env";

ensureEnvLoaded();

const UK_LOCATION = 2826;
const US_LOCATION = 2840;

const RETRY_KEYWORDS = [
  "substitution rules youth football",
  "squad rotation youth football",
  "fair play policy football",
  "youth football team selection",
  "coach playing time favoritism",
  "minimum playing time rule soccer",
  "team sheet app football",
  "lineup app grassroots football",
];

type OrganicItem = { type?: string; url?: string; domain?: string; title?: string; description?: string; rank_absolute?: number };
type Candidate = { url: string; domain: string; title: string | null; description: string | null; position: number | null; foundVia: string[]; locations: string[] };

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes.");
    return;
  }

  const outPath = path.join(REPO_ROOT, "seo-data", "raw", "playing-time-prospecting-candidates.json");
  const existing: { candidates: Record<string, Candidate>; searchedKeywords: string[]; totalCost: number } = JSON.parse(fs.readFileSync(outPath, "utf8"));

  let totalCost = 0;
  const common = { workflow: "playing-time-prospecting-serp-retry", environment: "live" as const, confirmLive: true };

  for (const keyword of RETRY_KEYWORDS) {
    const isUsTerm = /\bsoccer\b/i.test(keyword) && !/\bfootball\b/i.test(keyword);
    const locationCode = isUsTerm ? US_LOCATION : UK_LOCATION;
    const res = await googleOrganicSerp(keyword, { ...common, locationCode, depth: 30, forceRefresh: true });
    totalCost += res.cost ?? 0;
    if (res.error || !res.data) {
      console.log(`[${keyword}] STILL ERROR: ${res.error}`);
      continue;
    }
    const items = (res.data.tasks?.[0]?.result as Array<{ items?: OrganicItem[] }> | undefined) ?? [];
    const organic = (items[0]?.items ?? []).filter((it) => it.type === "organic" && it.url);
    console.log(`[${keyword}] (${locationCode === US_LOCATION ? "US" : "UK"}) ${organic.length} organic results, cost so far $${totalCost.toFixed(3)}`);
    for (const it of organic) {
      const url = it.url!;
      if (!existing.candidates[url]) {
        existing.candidates[url] = { url, domain: it.domain ?? new URL(url).hostname.replace(/^www\./, ""), title: it.title ?? null, description: it.description ?? null, position: it.rank_absolute ?? null, foundVia: [], locations: [] };
      }
      const c = existing.candidates[url];
      if (!c.foundVia.includes(keyword)) c.foundVia.push(keyword);
      const locLabel = locationCode === US_LOCATION ? "US" : "UK";
      if (!c.locations.includes(locLabel)) c.locations.push(locLabel);
    }
    existing.totalCost = (existing.totalCost ?? 0) + (res.cost ?? 0);
  }

  fs.writeFileSync(outPath, JSON.stringify(existing, null, 2));
  console.log(`\nTotal candidates now: ${Object.keys(existing.candidates).length}`);
  console.log(`Retry cost: $${totalCost.toFixed(3)}`);
  console.log(`Cumulative recorded cost: $${(existing.totalCost ?? 0).toFixed(3)}`);
}

main().catch((err) => { console.error(err); process.exitCode = 1; });

// Step 2/3 of the playing-time-tracking-app backlink prospecting brief
// (2026-09-19): run googleOrganicSerp (depth 30) for every phrase in the
// keyword universe written by playing-time-prospecting-keywords.ts, collect
// organic result URLs, and dedupe by URL (not domain) into a single
// candidate list for the classification stage.
//
// Usage:
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/playing-time-prospecting-serp.ts [startIndex] [endIndex]
import fs from "node:fs";
import path from "node:path";
import { migrate } from "../database/migrate";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { ensureEnvLoaded, REPO_ROOT } from "../shared/env";

ensureEnvLoaded();

const UK_LOCATION = 2826;
const US_LOCATION = 2840;

type OrganicItem = {
  type?: string;
  url?: string;
  domain?: string;
  title?: string;
  description?: string;
  rank_absolute?: number;
};

type Candidate = {
  url: string;
  domain: string;
  title: string | null;
  description: string | null;
  position: number | null;
  foundVia: string[]; // search phrases that surfaced this URL
  locations: string[];
};

async function main() {
  migrate();

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";

  const universePath = path.join(REPO_ROOT, "seo-data", "raw", "playing-time-prospecting-keyword-universe.json");
  const universe = JSON.parse(fs.readFileSync(universePath, "utf8")) as { finalUniverse: string[] };
  const keywords: string[] = universe.finalUniverse;

  const startIndex = process.argv[2] ? parseInt(process.argv[2], 10) : 0;
  const endIndex = process.argv[3] ? parseInt(process.argv[3], 10) : keywords.length;
  const batch = keywords.slice(startIndex, endIndex);

  console.log(`Plan: ${batch.length} googleOrganicSerp calls (depth 30). Estimated cost: ~$${(batch.length * 0.007).toFixed(2)}.`);
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes.");
    return;
  }

  const outPath = path.join(REPO_ROOT, "seo-data", "raw", "playing-time-prospecting-candidates.json");
  const existing: { candidates: Record<string, Candidate>; searchedKeywords: string[]; totalCost: number } = fs.existsSync(outPath)
    ? JSON.parse(fs.readFileSync(outPath, "utf8"))
    : { candidates: {}, searchedKeywords: [], totalCost: 0 };

  let totalCost = 0;
  const common = { workflow: "playing-time-prospecting-serp", environment: "live" as const, confirmLive: true };

  for (const keyword of batch) {
    if (existing.searchedKeywords.includes(keyword)) {
      console.log(`[skip, already searched] ${keyword}`);
      continue;
    }
    const isUsTerm = /\bsoccer\b|\bsoccer's\b|youth sports/i.test(keyword) && !/\bfootball\b/i.test(keyword);
    const locationCode = isUsTerm ? US_LOCATION : UK_LOCATION;
    const res = await googleOrganicSerp(keyword, { ...common, locationCode, depth: 30 });
    totalCost += res.cost ?? 0;
    if (res.error || !res.data) {
      console.log(`[${keyword}] ERROR: ${res.error}`);
      existing.searchedKeywords.push(keyword);
      continue;
    }
    const items = (res.data.tasks?.[0]?.result as Array<{ items?: OrganicItem[] }> | undefined) ?? [];
    const organic = (items[0]?.items ?? []).filter((it) => it.type === "organic" && it.url);
    console.log(`[${keyword}] (${locationCode === US_LOCATION ? "US" : "UK"}) ${organic.length} organic results, cost so far $${totalCost.toFixed(3)}`);
    for (const it of organic) {
      const url = it.url!;
      if (!existing.candidates[url]) {
        existing.candidates[url] = {
          url,
          domain: it.domain ?? new URL(url).hostname.replace(/^www\./, ""),
          title: it.title ?? null,
          description: it.description ?? null,
          position: it.rank_absolute ?? null,
          foundVia: [],
          locations: [],
        };
      }
      const c = existing.candidates[url];
      if (!c.foundVia.includes(keyword)) c.foundVia.push(keyword);
      const locLabel = locationCode === US_LOCATION ? "US" : "UK";
      if (!c.locations.includes(locLabel)) c.locations.push(locLabel);
    }
    existing.searchedKeywords.push(keyword);
    existing.totalCost = (existing.totalCost ?? 0) + (res.cost ?? 0);
    fs.writeFileSync(outPath, JSON.stringify(existing, null, 2));
  }

  console.log(`\nTotal candidates so far: ${Object.keys(existing.candidates).length}`);
  console.log(`Keywords searched so far: ${existing.searchedKeywords.length} / ${keywords.length}`);
  console.log(`This run's actual API-reported cost: $${totalCost.toFixed(3)}`);
  console.log(`Cumulative recorded cost: $${(existing.totalCost ?? 0).toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

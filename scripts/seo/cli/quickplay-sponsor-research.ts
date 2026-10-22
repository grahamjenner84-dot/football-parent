// Sponsorship-pitch research on QuickPlay (quickplaysport.com): what the
// brand and its product lines are searched for in the UK, and which of
// those terms an editorial page could realistically rank for. Round 1 pulls
// the domain's ranked keywords plus suggestions around the brand name.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/quickplay-sponsor-research.ts <outPath>
import { writeFileSync } from "node:fs";
import { migrate } from "../database/migrate";
import { keywordSuggestions, rankedKeywords } from "../dataforseo/endpoints/labs";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

type RankedRow = {
  keyword_data?: { keyword?: string; keyword_info?: { search_volume?: number; cpc?: number }; keyword_properties?: { keyword_difficulty?: number } };
  ranked_serp_element?: { serp_item?: { etv?: number; rank_absolute?: number; url?: string } };
};
type SuggestionRow = { keyword?: string; keyword_info?: { search_volume?: number; cpc?: number }; keyword_properties?: { keyword_difficulty?: number } };

// Brand, then the product lines outside goals and rebounders (both already
// covered by our gear articles).
const SEEDS = [
  "quickplay",
  "kickster goal",
  "football reaction lights",
  "ball mastery mat",
  "football agility ladder",
  "goalkeeper rebounder",
  "pop up football goals",
  "ball stop netting",
  "indoor football training",
];

async function main() {
  migrate();
  const out = process.argv[2] ?? "quickplay-round1.json";
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(`Plan: 1 ranked_keywords (limit 1000) for quickplaysport.com + ${SEEDS.length} keyword_suggestions. Rough cost ~$0.40.`);
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }
  const live = { workflow: "quickplay-sponsor-research", environment: "live" as const, confirmLive: true };
  let cost = 0;

  const ranked = await rankedKeywords("quickplaysport.com", { ...live, limit: 1000, cacheFamily: "competitor_rankings" });
  if (ranked.error || !ranked.data) throw new Error(String(ranked.error));
  cost += ranked.cost ?? 0;
  const rows = ((ranked.data.tasks?.[0]?.result as Array<{ items?: RankedRow[] }> | undefined)?.[0]?.items) ?? [];
  const rankedOut = rows.map((r) => ({
    keyword: r.keyword_data?.keyword,
    volume: r.keyword_data?.keyword_info?.search_volume ?? null,
    cpc: r.keyword_data?.keyword_info?.cpc ?? null,
    kd: r.keyword_data?.keyword_properties?.keyword_difficulty ?? null,
    rank: r.ranked_serp_element?.serp_item?.rank_absolute ?? null,
    etv: r.ranked_serp_element?.serp_item?.etv ?? 0,
    url: r.ranked_serp_element?.serp_item?.url,
  }));

  const suggestions: Record<string, unknown[]> = {};
  for (const seed of SEEDS) {
    const res = await keywordSuggestions(seed, { ...live, limit: 200 });
    if (res.error || !res.data) {
      console.log(`suggestions failed for ${seed}: ${res.error}`);
      continue;
    }
    cost += res.cost ?? 0;
    const items = ((res.data.tasks?.[0]?.result as Array<{ items?: SuggestionRow[] }> | undefined)?.[0]?.items) ?? [];
    suggestions[seed] = items.map((i) => ({
      keyword: i.keyword,
      volume: i.keyword_info?.search_volume ?? null,
      cpc: i.keyword_info?.cpc ?? null,
      kd: i.keyword_properties?.keyword_difficulty ?? null,
    }));
  }

  writeFileSync(out, JSON.stringify({ ranked: rankedOut, suggestions }, null, 2));
  console.log(`${rankedOut.length} ranked rows; suggestions: ${Object.entries(suggestions).map(([k, v]) => `${k}=${v.length}`).join(", ")}`);
  console.log(`Wrote ${out}. Cost: $${cost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

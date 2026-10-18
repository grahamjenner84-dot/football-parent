// Kids' football base layer research (2026-10-12): the thermal/compression
// layer worn under the football shirt, which parents call "under armour",
// "skins", "base layer" or "thermals". Measures UK volume + monthly history
// (to confirm the cold-weather peak), KD, related-keyword expansion, and the
// live UK page one for the top terms.
// Output: seo-data/exports/base-layer-research-2026-10-12.json
//
// SAFETY: three-factor live gate; Graham approved in-session 2026-10-12.
// Run:
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/base-layer-research.ts
import { writeFileSync } from "node:fs";
import { migrate } from "../database/migrate";
import { googleAdsSearchVolume } from "../dataforseo/endpoints/keywords_data";
import { bulkKeywordDifficulty, relatedKeywords } from "../dataforseo/endpoints/labs";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { extractSerpFeatures, type SerpItem } from "../dataforseo/serp-features";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const WORKFLOW = "base-layer-research";
const OUT = "seo-data/exports/base-layer-research-2026-10-12.json";

const HAND_LIST = [
  "kids base layer", "kids base layer football", "football base layer kids", "boys base layer football",
  "girls base layer football", "base layer for football", "football base layer", "football base layers",
  "junior base layer football", "youth base layer football", "children's base layer football",
  "thermal football top kids", "kids thermal football top", "thermal football top", "football thermal top",
  "kids thermals football", "football thermals kids", "football thermals", "thermal top for football",
  "kids skins football", "skins for football kids", "football skins kids", "football skins", "skins football",
  "compression top kids football", "kids compression top", "kids compression shirt", "compression top football",
  "football compression top", "boys compression top", "kids compression shirt long sleeve",
  "under armour kids football", "under armour for football kids", "kids under armour top", "under armour base layer kids",
  "kids under armour", "under armour for football", "under armour football top kids", "kids under armour cold gear",
  "under armour coldgear kids", "under armour coldgear boys", "nike pro kids", "nike pro boys",
  "long sleeve base layer kids football", "long sleeve base layer football", "kids long sleeve base layer",
  "base layer under football shirt", "what to wear under football shirt", "what to wear under football kit in winter",
  "kids football winter kit", "football winter kit kids", "what to wear for football in cold weather",
  "thermal leggings kids football", "kids football leggings", "football leggings kids", "football base layer leggings",
  "kids base layer leggings", "football tights kids", "kids football tights", "thermal tights football",
  "football snood kids", "kids football snood", "snood football", "football neck warmer kids",
  "kids thermal base layer", "kids thermal top", "kids thermal vest", "base layer colour football rules",
  "can you wear base layers in football", "base layer colour rules football", "undershirt colour rule football",
  "best base layer for football", "best kids base layer", "best football base layer", "kids sports base layer",
];

const RELATED_SEEDS = ["kids base layer", "football base layer", "kids thermal top"];

type AdsItem = { keyword?: string; search_volume?: number | null; cpc?: number | null; competition?: string | null; monthly_searches?: { year: number; month: number; search_volume: number | null }[] };
type KdItem = { keyword?: string; keyword_difficulty?: number | null };
type RelatedItem = { keyword_data?: { keyword?: string; keyword_info?: { search_volume?: number | null } } };

function clean(k: string) {
  return k.toLowerCase().replace(/[^a-z0-9' \-]/g, " ").replace(/\s+/g, " ").trim();
}

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }
  let totalCost = 0;
  const opts = { workflow: WORKFLOW, environment: "live" as const, confirmLive: true };

  // 1. Related keywords expansion.
  const related: Record<string, { keyword: string; volume: number | null }[]> = {};
  for (const seed of RELATED_SEEDS) {
    const r = await relatedKeywords(seed, { ...opts, limit: 100 });
    totalCost += r.cost ?? 0;
    const items = ((r.data?.tasks?.[0]?.result?.[0] as { items?: RelatedItem[] } | undefined)?.items ?? []) as RelatedItem[];
    related[seed] = items
      .map((i) => ({ keyword: i.keyword_data?.keyword ?? "", volume: i.keyword_data?.keyword_info?.search_volume ?? null }))
      .filter((i) => i.keyword);
    console.log(`related(${seed}): ${related[seed].length}`);
  }
  const relatedTerms = Object.values(related).flat().map((r) => r.keyword);

  // 2. Google Ads volume + monthly history for hand list + related terms.
  const candidates = [...new Set([...HAND_LIST, ...relatedTerms].map(clean))].filter((k) => k.split(" ").length <= 10 && k.length <= 80).slice(0, 1000);
  const vol = await googleAdsSearchVolume(candidates, opts);
  totalCost += vol.cost ?? 0;
  if (vol.error || !vol.data) throw new Error(`search_volume failed: ${vol.error}`);
  const adsItems = (vol.data.tasks?.[0]?.result ?? []) as AdsItem[];
  console.log(`search_volume: ${adsItems.length} rows for ${candidates.length} candidates`);

  // 3. KD for anything with volume.
  const withVol = adsItems.filter((i) => (i.search_volume ?? 0) >= 20 && i.keyword).map((i) => i.keyword as string);
  const kdMap = new Map<string, number | null>();
  if (withVol.length) {
    const kd = await bulkKeywordDifficulty(withVol.slice(0, 1000), opts);
    totalCost += kd.cost ?? 0;
    const items = ((kd.data?.tasks?.[0]?.result?.[0] as { items?: KdItem[] } | undefined)?.items ?? []) as KdItem[];
    for (const it of items) if (it.keyword) kdMap.set(it.keyword.toLowerCase(), it.keyword_difficulty ?? null);
  }

  const rows = adsItems
    .filter((i) => i.keyword)
    .map((i) => {
      const months = [...(i.monthly_searches ?? [])].sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month)).slice(-12);
      return {
        keyword: i.keyword as string,
        volume: i.search_volume ?? null,
        kd: kdMap.get((i.keyword as string).toLowerCase()) ?? null,
        cpc: i.cpc ?? null,
        competition: i.competition ?? null,
        months: months.map((m) => ({ ym: `${m.year}-${String(m.month).padStart(2, "0")}`, v: m.search_volume })),
      };
    })
    .sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1));

  // 4. Live UK SERPs for the top parent-phrased terms.
  const serpTerms = process.env.SERP_TERMS ? process.env.SERP_TERMS.split("|") : ["kids base layer", "football base layer", "kids thermal top"];
  const serps: Record<string, unknown> = {};
  for (const kw of serpTerms) {
    const r = await googleOrganicSerp(kw, { ...opts, depth: 20 });
    totalCost += r.cost ?? 0;
    const items = ((r.data?.tasks?.[0]?.result?.[0] as { items?: SerpItem[] } | undefined)?.items ?? []) as (SerpItem & { rank_group?: number; domain?: string; url?: string })[];
    const organic = items.filter((i) => i.type === "organic").slice(0, 10).map((i) => ({ rank: i.rank_group, domain: i.domain, title: i.title, url: i.url }));
    const features = [...new Set(items.filter((i) => i.type !== "organic").map((i) => i.type))];
    const f = extractSerpFeatures(items);
    serps[kw] = { features, organic, paa: f.paaQuestions, related: f.relatedSearches };
  }

  writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), totalCost, rows, related, serps }, null, 2));
  console.log(`${rows.filter((r) => (r.volume ?? 0) > 0).length} with volume; written ${OUT}. Total cost $${totalCost.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

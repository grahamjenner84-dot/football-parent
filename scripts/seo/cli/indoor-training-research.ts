// Indoor / at-home football training research (2026-10-24): how parents
// phrase training a child at home over the winter (indoors, garage, garden,
// on their own), and which home training equipment terms have volume.
// Checks how much of "indoor football training" is venue intent (local pack).
// Output: seo-data/exports/indoor-training-research-2026-10-24.json
//
// SAFETY: three-factor live gate; Graham approved in-session 2026-10-24.
// Run:
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/indoor-training-research.ts
import { writeFileSync } from "node:fs";
import { migrate } from "../database/migrate";
import { googleAdsSearchVolume } from "../dataforseo/endpoints/keywords_data";
import { bulkKeywordDifficulty, relatedKeywords } from "../dataforseo/endpoints/labs";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { extractSerpFeatures, type SerpItem } from "../dataforseo/serp-features";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const WORKFLOW = "indoor-training-research";
const OUT = "seo-data/exports/indoor-training-research-2026-10-24.json";

const HAND_LIST = ["indoor football training", "football training indoors", "indoor football drills", "indoor football training for kids", "indoor football drills for kids", "indoor football games for kids", "indoor football games", "football games indoors", "indoor football practice", "football training at home", "football training at home for kids", "football drills at home", "football drills to do at home", "football drills for kids at home", "football practice at home", "football skills at home", "football skills to practice at home", "football exercises at home", "football workouts at home", "football fitness at home", "how to improve football skills at home", "how to get better at football at home", "how to practice football at home", "how to train football at home", "football training at home without a ball", "football training in small space", "football drills small space", "football drills in the house", "football in the house", "football in the garden", "garden football drills", "football drills in the garden", "backyard football drills", "football drills on your own", "solo football drills", "football drills by yourself", "how to practice football alone", "football training on your own", "football training alone", "solo football training", "football drills for one person", "football wall drills", "wall passing drills football", "football drills against a wall", "keepy uppy", "keepy uppy tips", "how to do keepy uppies", "football juggling drills", "dribbling drills at home", "football footwork drills", "football footwork drills at home", "ball mastery drills at home", "ball mastery", "football first touch drills at home", "football drills for 6 year olds at home", "football drills for 8 year olds at home", "football drills for 10 year olds at home", "football drills for kids", "football training for kids", "winter football training", "football training in winter", "rainy day football", "football training equipment", "football training equipment for home", "football training equipment for kids", "football training aids", "home football training equipment", "football training gear", "football training kit for home", "indoor football", "indoor football ball", "indoor football for kids", "soft football", "foam football", "soft football for indoors", "mini football", "size 1 football", "skills ball football", "futsal ball", "low bounce football", "indoor mini goals", "mini football goals indoor", "football skills mat", "football training mat", "football kick trainer", "solo football trainer", "football kick trainer belt", "football reaction lights", "reaction lights", "agility ladder", "agility ladder drills", "football agility ladder drills", "football cones", "football rebounder indoor", "football rebound board", "football rebound wall"];

const RELATED_SEEDS = ["football training at home", "indoor football training", "football drills at home", "football training equipment"];

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
  const serpTerms = process.env.SERP_TERMS ? process.env.SERP_TERMS.split("|") : ["indoor football training", "football training at home", "football drills at home", "football training equipment"];
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

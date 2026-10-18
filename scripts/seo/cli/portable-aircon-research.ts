// Portable air conditioning keyword research (2026-10-17), for a possible
// separate UK affiliate site, not Football Parent. Seeds are Graham's:
// venting/setup in UK homes (roof, tilt-and-turn, casement, no window) and
// loft cooling. Expands each seed, then pulls Google Ads UK volume with four
// years of monthly history (to compare hot and cool summers), KD and intent.
// Output: seo-data/exports/portable-aircon-research-2026-10-17.json
//
// SAFETY: three-factor live gate; Graham asked for this research in-session 2026-10-17.
// Run:
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/portable-aircon-research.ts
import { writeFileSync } from "node:fs";
import { migrate } from "../database/migrate";
import { dataForSeoRequest } from "../dataforseo/client";
import { bulkKeywordDifficulty, keywordSuggestions, relatedKeywords, searchIntent } from "../dataforseo/endpoints/labs";
import { DEFAULT_LANGUAGE_CODE, DEFAULT_LOCATION_CODE } from "../shared/normalise";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const WORKFLOW = "portable-aircon-research";
const OUT = "seo-data/exports/portable-aircon-research-2026-10-17.json";

const SEEDS = [
  "portable air conditioner velux window", "portable air conditioner roof window", "portable aircon tilt and turn window",
  "portable air conditioner casement window", "portable air conditioner no window", "how to vent portable air conditioner",
  "portable air conditioner window kit", "portable air conditioner loft", "air conditioning loft conversion",
  "how to cool a loft room", "loft room too hot", "portable air conditioner bedroom quiet", "portable air conditioner running cost uk",
];

// Shorter heads used only for expansion, since long seeds return few suggestions.
const EXPANSION_HEADS = [
  "portable air conditioner window", "velux window", "tilt and turn window air conditioner", "portable air conditioner vent",
  "window kit air conditioner", "loft conversion hot", "cool loft", "loft too hot", "attic too hot", "portable air conditioner without window",
  "portable air conditioner running cost", "quiet portable air conditioner", "air conditioner hose",
];

const HAND_LIST = [
  "portable air conditioner for velux window", "velux window air conditioner", "velux air conditioning", "velux window seal kit",
  "portable air conditioner skylight", "roof window air conditioner", "skylight air conditioner",
  "tilt and turn window air conditioner", "portable air conditioner tilt and turn", "air conditioner tilt and turn window",
  "window seal for portable air conditioner", "portable air conditioner window seal", "air conditioner window seal kit",
  "portable air conditioner window kit casement", "casement window air conditioner", "sliding window air conditioner kit",
  "portable air conditioner without window", "air conditioner without window", "ventless portable air conditioner",
  "portable air conditioner without exhaust hose", "portable air conditioner through wall", "portable air conditioner vent through wall",
  "portable air conditioner door kit", "portable air conditioner vent through door", "portable air conditioner exhaust hose",
  "portable air conditioner hose extension", "how to install portable air conditioner", "do portable air conditioners need a window",
  "do portable air conditioners need to be vented", "can you use a portable air conditioner without venting it",
  "how to cool a loft conversion", "loft conversion too hot", "loft conversion too hot in summer", "loft bedroom too hot",
  "how to keep loft cool in summer", "how to keep a loft conversion cool", "attic bedroom too hot", "how to cool an attic room",
  "air conditioning for loft room", "loft air conditioning", "best air conditioner for loft", "best portable air conditioner for loft",
  "velux blinds heat", "blackout blinds velux", "thermal blinds velux", "velux heat protection blinds", "velux awning blinds",
  "quiet portable air conditioner", "quietest portable air conditioner", "quietest portable air conditioner uk",
  "portable air conditioner for bedroom", "best portable air conditioner for bedroom uk", "silent air conditioner for bedroom",
  "portable air conditioner running costs", "how much does a portable air conditioner cost to run", "portable air conditioner electricity usage",
  "cost to run portable air conditioner uk", "portable air conditioner cost per hour", "air conditioner running cost uk",
  "best portable air conditioner uk", "portable air conditioner", "portable air conditioners", "portable aircon", "air conditioning unit portable",
  "dual hose portable air conditioner", "dual hose portable air conditioner uk", "split portable air conditioner", "air cooler vs air conditioner",
  "evaporative air cooler", "do air coolers work", "how to cool a room without air conditioning", "how to cool a bedroom",
  "pedestal fan", "tower fan", "best fan for bedroom uk", "how to keep house cool in heatwave",
];

type AdsItem = { keyword?: string; search_volume?: number | null; cpc?: number | null; competition?: string | null; monthly_searches?: { year: number; month: number; search_volume: number | null }[] };
type KdItem = { keyword?: string; keyword_difficulty?: number | null };
type IntentItem = { keyword?: string; keyword_intent?: { label?: string; probability?: number }; secondary_keyword_intents?: { label?: string }[] | null };
type LabsItem = { keyword?: string; keyword_info?: { search_volume?: number | null }; keyword_data?: { keyword?: string; keyword_info?: { search_volume?: number | null } } };

function clean(k: string) {
  return k.toLowerCase().replace(/[^a-z0-9' \-]/g, " ").replace(/\s+/g, " ").trim();
}

// Keep expansions on-topic: cooling, venting, windows, lofts.
const TOPIC = /air ?con|aircon|a\/c|portable|cool|hot|heat|vent|exhaust|hose|window|velux|skylight|loft|attic|fan|blind|dehumid/;

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }
  let totalCost = 0;
  const opts = { workflow: WORKFLOW, environment: "live" as const, confirmLive: true };

  // 1. Expansion: suggestions (contain the seed) and related (Google's related searches).
  const expansions: Record<string, string[]> = {};
  for (const seed of [...SEEDS, ...EXPANSION_HEADS]) {
    for (const [name, fn] of [["sugg", keywordSuggestions], ["rel", relatedKeywords]] as const) {
      const r = await fn(seed, { ...opts, limit: 100 });
      totalCost += r.cost ?? 0;
      const items = ((r.data?.tasks?.[0]?.result?.[0] as { items?: LabsItem[] } | undefined)?.items ?? []) as LabsItem[];
      const kws = items.map((i) => i.keyword ?? i.keyword_data?.keyword ?? "").filter(Boolean);
      expansions[`${name}:${seed}`] = kws;
      console.log(`${name}(${seed}): ${kws.length}`);
    }
  }
  const expanded = Object.values(expansions).flat().map(clean).filter((k) => TOPIC.test(k));

  // 2. Google Ads UK volume with four years of monthly history.
  const candidates = [...new Set([...SEEDS, ...HAND_LIST, ...expanded].map(clean))]
    .filter((k) => k.split(" ").length <= 10 && k.length <= 80)
    .slice(0, 1000);
  const body = { keywords: candidates, location_code: DEFAULT_LOCATION_CODE, language_code: DEFAULT_LANGUAGE_CODE, date_from: "2022-10-01" };
  const vol = await dataForSeoRequest({
    workflow: WORKFLOW, apiFamily: "keywords_data", cacheFamily: "google_ads_volume", endpoint: "keywords_data/google_ads/search_volume/live",
    body, environment: "live", confirmLive: true, seedTerms: candidates, locationCode: body.location_code, languageCode: body.language_code,
  });
  totalCost += vol.cost ?? 0;
  if (vol.error || !vol.data) throw new Error(`search_volume failed: ${vol.error}`);
  const adsItems = (vol.data.tasks?.[0]?.result ?? []) as AdsItem[];
  console.log(`search_volume: ${adsItems.length} rows for ${candidates.length} candidates`);

  // 3. KD and intent for anything with volume.
  const withVol = adsItems.filter((i) => (i.search_volume ?? 0) >= 10 && i.keyword).map((i) => i.keyword as string);
  const kdMap = new Map<string, number | null>();
  const intentMap = new Map<string, string>();
  if (withVol.length) {
    const kd = await bulkKeywordDifficulty(withVol.slice(0, 1000), opts);
    totalCost += kd.cost ?? 0;
    for (const it of ((kd.data?.tasks?.[0]?.result?.[0] as { items?: KdItem[] } | undefined)?.items ?? []) as KdItem[])
      if (it.keyword) kdMap.set(it.keyword.toLowerCase(), it.keyword_difficulty ?? null);
    const intent = await searchIntent(withVol.slice(0, 1000), opts);
    totalCost += intent.cost ?? 0;
    for (const it of ((intent.data?.tasks?.[0]?.result?.[0] as { items?: IntentItem[] } | undefined)?.items ?? []) as IntentItem[])
      if (it.keyword) intentMap.set(it.keyword.toLowerCase(), [it.keyword_intent?.label, ...(it.secondary_keyword_intents ?? []).map((s) => s.label)].filter(Boolean).join("+"));
  }

  const rows = adsItems
    .filter((i) => i.keyword)
    .map((i) => {
      const months = [...(i.monthly_searches ?? [])].sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));
      const k = (i.keyword as string).toLowerCase();
      return {
        keyword: i.keyword as string,
        volume: i.search_volume ?? null,
        kd: kdMap.get(k) ?? null,
        intent: intentMap.get(k) ?? null,
        cpc: i.cpc ?? null,
        competition: i.competition ?? null,
        months: months.map((m) => ({ ym: `${m.year}-${String(m.month).padStart(2, "0")}`, v: m.search_volume })),
      };
    })
    .sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1));

  writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), totalCost, rows, expansions }, null, 2));
  console.log(`${rows.filter((r) => (r.volume ?? 0) > 0).length} with volume; written ${OUT}. Total cost $${totalCost.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

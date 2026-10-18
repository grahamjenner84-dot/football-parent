// Portable air conditioning research (2026-10-17), phase 3: higher-ticket
// alternative for "no window / no hose" searchers - wall-mounted air con
// with no outdoor unit (monoblock / through-wall, e.g. Olimpia Splendid
// Unico type), plus DIY split units. Volume with 4 years of history, KD,
// intent, then live UK top 10 for the biggest terms.
// Output: seo-data/exports/portable-aircon-no-outdoor-unit-2026-10-17.json
//
// SAFETY: three-factor live gate; Graham approved in-session 2026-10-17.
// Run:
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/portable-aircon-no-outdoor-unit.ts
import { writeFileSync } from "node:fs";
import { migrate } from "../database/migrate";
import { dataForSeoRequest } from "../dataforseo/client";
import { bulkKeywordDifficulty, keywordSuggestions, searchIntent } from "../dataforseo/endpoints/labs";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { extractSerpFeatures, type SerpItem } from "../dataforseo/serp-features";
import { DEFAULT_LANGUAGE_CODE, DEFAULT_LOCATION_CODE } from "../shared/normalise";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const WORKFLOW = "portable-aircon-research";
const OUT = "seo-data/exports/portable-aircon-no-outdoor-unit-2026-10-17.json";

const EXPANSION_HEADS = [
  "air conditioning without outdoor unit", "air conditioner without outside unit", "through wall air conditioner", "monoblock air conditioner",
  "olimpia splendid unico", "unico air conditioner", "wall mounted air conditioner", "diy air conditioning", "diy split air conditioner",
  "self install air conditioner",
];

const HAND_LIST = [
  "air conditioning without outdoor unit", "air conditioner without outdoor unit", "air conditioning without external unit",
  "air conditioner without external unit", "air conditioner no outside unit", "air conditioning no outside unit",
  "wall air conditioner no outside unit", "wall mounted air conditioner without outside unit", "through the wall air conditioner uk",
  "through wall air conditioner", "through wall air conditioning unit", "monoblock air conditioner", "monoblock air conditioning",
  "olimpia splendid unico", "olimpia splendid unico pro", "unico air conditioner", "unico air conditioning", "olimpia splendid",
  "fixed air conditioning unit no outside unit", "wall mounted air conditioner uk", "wall mounted air conditioning unit",
  "diy air conditioning uk", "diy split air conditioner", "diy air conditioning unit", "self install air conditioning uk",
  "pre gassed air conditioning", "pre charged split air conditioner", "split air conditioner diy install", "quick connect split air conditioner",
  "air conditioning for flat no outside unit", "air conditioning for flat", "air conditioning for listed building",
  "air conditioning unit for bedroom uk", "best through wall air conditioner uk", "best air conditioner without outdoor unit",
  "innova 2.0 air conditioner", "innova air conditioner", "argo apollo air conditioner", "electriq wall mounted air conditioner",
  "home air conditioning uk cost", "air conditioning installation cost uk", "how much does air conditioning cost uk",
];

type AdsItem = { keyword?: string; search_volume?: number | null; cpc?: number | null; monthly_searches?: { year: number; month: number; search_volume: number | null }[] };
type KdItem = { keyword?: string; keyword_difficulty?: number | null };
type IntentItem = { keyword?: string; keyword_intent?: { label?: string } };
type LabsItem = { keyword?: string };

const clean = (k: string) => k.toLowerCase().replace(/[^a-z0-9 .\-]/g, " ").replace(/\s+/g, " ").trim();
const TOPIC = /air ?con|aircon|unico|olimpia|monoblock|through.?wall|split|wall mounted|outdoor unit|outside unit|external unit|innova|argo/;

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }
  let totalCost = 0;
  const opts = { workflow: WORKFLOW, environment: "live" as const, confirmLive: true };

  const expanded: string[] = [];
  for (const seed of EXPANSION_HEADS) {
    const r = await keywordSuggestions(seed, { ...opts, limit: 100 });
    totalCost += r.cost ?? 0;
    const items = ((r.data?.tasks?.[0]?.result?.[0] as { items?: LabsItem[] } | undefined)?.items ?? []) as LabsItem[];
    expanded.push(...items.map((i) => i.keyword ?? "").filter(Boolean));
  }
  const candidates = [...new Set([...HAND_LIST, ...expanded].map(clean))].filter((k) => TOPIC.test(k) && k.split(" ").length <= 10).slice(0, 1000);
  const body = { keywords: candidates, location_code: DEFAULT_LOCATION_CODE, language_code: DEFAULT_LANGUAGE_CODE, date_from: "2022-10-01" };
  const vol = await dataForSeoRequest({
    workflow: WORKFLOW, apiFamily: "keywords_data", cacheFamily: "google_ads_volume", endpoint: "keywords_data/google_ads/search_volume/live",
    body, environment: "live", confirmLive: true, seedTerms: candidates, locationCode: body.location_code, languageCode: body.language_code,
  });
  totalCost += vol.cost ?? 0;
  if (vol.error || !vol.data) throw new Error(`search_volume failed: ${vol.error}`);
  const ads = (vol.data.tasks?.[0]?.result ?? []) as AdsItem[];

  const withVol = ads.filter((i) => (i.search_volume ?? 0) >= 10 && i.keyword).map((i) => i.keyword as string);
  const kdMap = new Map<string, number | null>();
  const intentMap = new Map<string, string>();
  if (withVol.length) {
    const kd = await bulkKeywordDifficulty(withVol, opts);
    totalCost += kd.cost ?? 0;
    for (const it of ((kd.data?.tasks?.[0]?.result?.[0] as { items?: KdItem[] } | undefined)?.items ?? []) as KdItem[])
      if (it.keyword) kdMap.set(it.keyword.toLowerCase(), it.keyword_difficulty ?? null);
    const intent = await searchIntent(withVol, opts);
    totalCost += intent.cost ?? 0;
    for (const it of ((intent.data?.tasks?.[0]?.result?.[0] as { items?: IntentItem[] } | undefined)?.items ?? []) as IntentItem[])
      if (it.keyword) intentMap.set(it.keyword.toLowerCase(), it.keyword_intent?.label ?? "");
  }
  const rows = ads
    .filter((i) => i.keyword)
    .map((i) => {
      const k = (i.keyword as string).toLowerCase();
      const months = [...(i.monthly_searches ?? [])].sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));
      return {
        keyword: i.keyword as string, volume: i.search_volume ?? null, kd: kdMap.get(k) ?? null, intent: intentMap.get(k) ?? null, cpc: i.cpc ?? null,
        months: months.map((m) => ({ ym: `${m.year}-${String(m.month).padStart(2, "0")}`, v: m.search_volume })),
      };
    })
    .sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1));

  // Top 10 for the biggest distinct-volume terms (skip Ads variant duplicates).
  const seenSig = new Set<string>();
  const serpTerms: string[] = [];
  for (const r of rows) {
    if ((r.volume ?? 0) < 50 || serpTerms.length >= 18) continue;
    const sig = r.months.map((m) => m.v).join(",");
    if (seenSig.has(sig)) continue;
    seenSig.add(sig);
    serpTerms.push(r.keyword);
  }
  const serps: Record<string, unknown> = {};
  for (const kw of serpTerms) {
    const r = await googleOrganicSerp(kw, { ...opts, depth: 10 });
    totalCost += r.cost ?? 0;
    const items = ((r.data?.tasks?.[0]?.result?.[0] as { items?: SerpItem[] } | undefined)?.items ?? []) as (SerpItem & { rank_group?: number; domain?: string; url?: string })[];
    const f = extractSerpFeatures(items);
    serps[kw] = {
      features: [...new Set(items.filter((i) => i.type !== "organic").map((i) => i.type))],
      organic: items.filter((i) => i.type === "organic").slice(0, 10).map((i) => ({ rank: i.rank_group, domain: i.domain, title: i.title, url: i.url })),
      paa: f.paaQuestions,
    };
  }
  writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), totalCost, rows, serps }, null, 2));
  console.log(`${rows.filter((r) => (r.volume ?? 0) > 0).length} with volume, ${serpTerms.length} SERPs; written ${OUT}. Total cost $${totalCost.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

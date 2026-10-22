// Follow-up to xmas-affiliate-seasonality.ts (2026-10-22). Three questions:
// (1) a football advent calendar article: the keyword family, its monthly
// curve, difficulty and the live page one with People Also Ask; (2) November
// and Black Friday variants of the products our existing gear pages already
// cover (Veo, rebounders, boots, GPS trackers, gifts by age); (3) pyjamas,
// slippers and annuals as gifts guide sections, plus the gifts guide's own
// page one. Keyword suggestions widen each seed, Google Ads gives UK volume
// with 12 months of history, Labs gives KD, and live SERPs (async AI
// Overviews loaded) give page one, PAA and related searches.
// Output: seo-data/exports/xmas-opportunity-research-2026-10-22.json
//
// SAFETY: three-factor live gate; Graham asked for this in-session 2026-10-22.
// Run:
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/xmas-opportunity-research.ts
import { writeFileSync } from "node:fs";
import { migrate } from "../database/migrate";
import { googleAdsSearchVolume } from "../dataforseo/endpoints/keywords_data";
import { bulkKeywordDifficulty, keywordSuggestions } from "../dataforseo/endpoints/labs";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { extractSerpFeatures, citationSummary, type SerpItem } from "../dataforseo/serp-features";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const WORKFLOW = "xmas-opportunity-research";
const OUT = "seo-data/exports/xmas-opportunity-research-2026-10-22.json";

const GROUPS: Record<string, { seeds: string[]; hand: string[] }> = {
  advent: {
    seeds: ["football advent calendar", "match attax advent calendar", "advent calendar football"],
    hand: [
      "football advent calendar 2026", "kids football advent calendar", "football advent calendar for kids",
      "football advent calendar for boys", "premier league advent calendar", "match attax advent calendar 2026",
      "match attax advent calendar 2025 26", "topps advent calendar", "panini advent calendar",
      "football card advent calendar", "football sticker advent calendar", "football sock advent calendar",
      "football skills advent calendar", "football figure advent calendar", "lego football advent calendar",
      "arsenal advent calendar", "liverpool advent calendar", "man utd advent calendar", "manchester united advent calendar",
      "chelsea advent calendar", "man city advent calendar", "tottenham advent calendar", "newcastle advent calendar",
      "celtic advent calendar", "rangers advent calendar", "football chocolate advent calendar", "football advent calendar adults",
      "best football advent calendar", "football advent calendar uk", "england football advent calendar",
      "football stars advent calendar", "football quiz advent calendar",
    ],
  },
  november: {
    seeds: ["football gifts for boys", "veo black friday", "football boots black friday"],
    hand: [
      "veo black friday", "veo camera black friday", "veo black friday deal", "veo go black friday", "xbotgo black friday",
      "pixellot black friday", "football camera black friday", "veo discount", "veo discount code",
      "football rebounder black friday", "rebounder black friday", "quickplay black friday", "forza black friday",
      "football goal black friday", "football black friday", "football black friday deals", "black friday football deals uk",
      "kids football boots black friday", "kids football boots sale", "football boots sale kids", "junior football boots sale",
      "nike football boots black friday", "adidas football boots black friday", "football boots sale",
      "playermaker black friday", "football gps tracker black friday", "playermaker discount code",
      "football gifts for 8 year old", "football gifts for 10 year old", "football gifts for 6 year old",
      "football gifts for 10 year old boy", "football gifts for 12 year old boy", "football gifts for teenage boy",
      "football gifts for boys", "football gifts for girls", "football gifts under 10", "football gifts under 20",
      "secret santa football gifts", "football christmas gifts for kids", "gifts for football mad kids",
      "gifts for footballers", "footballer gifts", "football gifts for coaches", "gifts for football coach",
      "christmas gifts for football players", "best football gifts", "unusual football gifts",
      "christmas football goals", "football goal for christmas", "rebounder for christmas",
    ],
  },
  giftsAdditions: {
    seeds: ["football pyjamas", "football slippers", "football annual"],
    hand: [
      "football pyjamas", "kids football pyjamas", "boys football pyjamas", "football pyjamas boys", "football christmas pyjamas",
      "christmas football pyjamas", "arsenal pyjamas", "liverpool pyjamas", "man utd pyjamas", "chelsea pyjamas",
      "football slippers", "football slippers kids", "kids football slippers", "boys football slippers", "football boot slippers",
      "football annual", "football annual 2027", "match annual 2027", "match annual", "shoot annual", "premier league annual",
      "premier league annual 2027", "arsenal annual 2027", "liverpool annual 2027", "football books for kids",
      "best football books for kids", "football books for 8 year olds", "football books for 10 year olds",
      "football dressing gown", "football onesie", "football bedding", "football lamp", "football light",
    ],
  },
};

const SERPS = [
  "football advent calendar", "match attax advent calendar", "football advent calendar 2026",
  "football gifts for kids", "football gifts for boys", "football gifts for 10 year old",
  "football pyjamas", "football slippers", "football annual 2027", "veo black friday", "football rebounder black friday",
];

type AdsItem = { keyword?: string; search_volume?: number | null; cpc?: number | null; competition?: string | null; monthly_searches?: { year: number; month: number; search_volume: number | null }[] };
type SuggestItem = { keyword?: string; keyword_info?: { search_volume?: number | null } };
type KdItem = { keyword?: string; keyword_difficulty?: number | null };
type OrganicItem = { type?: string; rank_group?: number; domain?: string; title?: string; url?: string };

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
  let cost = 0;
  const opts = { workflow: WORKFLOW, environment: "live" as const, confirmLive: true };

  // 1. Widen each seed with keyword suggestions (phrase-match expansions).
  const groupOf = new Map<string, string>();
  for (const [group, { seeds, hand }] of Object.entries(GROUPS)) {
    for (const k of hand) if (!groupOf.has(clean(k))) groupOf.set(clean(k), group);
    for (const seed of seeds) {
      const r = await keywordSuggestions(seed, { ...opts, limit: 100 });
      cost += r.cost ?? 0;
      const items = ((r.data?.tasks?.[0]?.result?.[0] as { items?: SuggestItem[] } | undefined)?.items ?? []) as SuggestItem[];
      for (const it of items) if (it.keyword && !groupOf.has(clean(it.keyword))) groupOf.set(clean(it.keyword), group);
      console.log(`suggestions(${seed}): ${items.length}`);
    }
  }

  // 2. Google Ads volume with monthly history.
  const candidates = [...groupOf.keys()].filter((k) => k.split(" ").length <= 10 && k.length <= 80).slice(0, 1000);
  const vol = await googleAdsSearchVolume(candidates, opts);
  cost += vol.cost ?? 0;
  if (vol.error || !vol.data) throw new Error(`search_volume failed: ${vol.error}`);
  const ads = (vol.data.tasks?.[0]?.result ?? []) as AdsItem[];

  // 3. KD for anything that peaks at 50+ in Nov or Dec.
  const peakers = ads.filter((i) => (i.monthly_searches ?? []).some((m) => m.year === 2025 && (m.month === 11 || m.month === 12) && (m.search_volume ?? 0) >= 50)).map((i) => i.keyword as string);
  const kdMap = new Map<string, number | null>();
  if (peakers.length) {
    const kd = await bulkKeywordDifficulty(peakers.slice(0, 1000), opts);
    cost += kd.cost ?? 0;
    const items = ((kd.data?.tasks?.[0]?.result?.[0] as { items?: KdItem[] } | undefined)?.items ?? []) as KdItem[];
    for (const it of items) if (it.keyword) kdMap.set(it.keyword.toLowerCase(), it.keyword_difficulty ?? null);
  }

  const rows = ads
    .filter((i) => i.keyword)
    .map((i) => {
      const months = [...(i.monthly_searches ?? [])].sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month)).slice(-12);
      const by = new Map(months.map((m) => [`${m.year}-${String(m.month).padStart(2, "0")}`, m.search_volume ?? 0]));
      const others = months.filter((m) => !(m.year === 2025 && (m.month === 11 || m.month === 12))).map((m) => m.search_volume ?? 0);
      const base = others.length ? others.reduce((a, b) => a + b, 0) / others.length : 0;
      const nov = by.get("2025-11") ?? 0;
      const dec = by.get("2025-12") ?? 0;
      return {
        keyword: i.keyword as string,
        group: groupOf.get(clean(i.keyword as string)) ?? null,
        avgVolume: i.search_volume ?? null,
        oct2025: by.get("2025-10") ?? null,
        nov2025: nov,
        dec2025: dec,
        baseline: Math.round(base),
        lift: base ? Math.round((Math.max(nov, dec) / base) * 10) / 10 : null,
        kd: kdMap.get((i.keyword as string).toLowerCase()) ?? null,
        cpc: i.cpc ?? null,
      };
    })
    .sort((a, b) => b.nov2025 + b.dec2025 - (a.nov2025 + a.dec2025));

  // 4. Live SERPs, depth 20, async AI Overviews loaded.
  const serps = [];
  for (const kw of SERPS) {
    const r = await googleOrganicSerp(kw, { ...opts, depth: 20, loadAsyncAiOverview: true });
    cost += r.cost ?? 0;
    const items = ((r.data?.tasks?.[0]?.result?.[0] as { items?: (SerpItem & OrganicItem)[] } | undefined)?.items ?? []);
    const f = extractSerpFeatures(items);
    serps.push({
      keyword: kw,
      itemTypes: [...new Set(items.map((i) => i.type))],
      aiOverview: f.aiOverview ? citationSummary(f.aiOverview.references) : null,
      paa: f.paaQuestions,
      related: f.relatedSearches,
      organic: items.filter((i) => i.type === "organic").map((i) => ({ rank: i.rank_group, domain: i.domain, title: i.title, url: i.url })),
    });
    console.log(`serp(${kw}): ${items.length} items`);
  }

  writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), cost, rows, serps }, null, 2));
  console.log(`rows ${rows.length}, serps ${serps.length}, cost $${cost.toFixed(3)}, wrote ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

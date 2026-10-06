// Girls' football keyword discovery (2026-10-06). The cached database had
// almost nothing on girls' terms beyond our own article titles, so this
// pulls Labs keyword ideas + suggestions (UK) for a spread of girls'
// football seeds and dumps every item, with volume, KD, CPC, competition
// and intent, to seo-data/exports/girls-football-keyword-discovery-<date>.json
// for shortlisting. Gear terms are deliberately out of scope for this pass.
//
// SAFETY: same three-factor live gate as the other research scripts;
// confirmLive:true is set because Graham approved this run in-session on
// 2026-10-06.
// Run:
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/girls-football-keyword-discovery.ts
import { writeFileSync } from "node:fs";
import { migrate } from "../database/migrate";
import { keywordIdeas, keywordSuggestions } from "../dataforseo/endpoints/labs";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const WORKFLOW = "girls-football-keyword-discovery";

const IDEA_SEED_SETS = [
  ["girls football", "girls football club", "girls football academy", "girls football trials", "football for girls"],
  ["women's football", "girls football training", "girls football camps", "female footballer", "wsl academy"],
];
const SUGGESTION_SEEDS = [
  "girls football",
  "football for girls",
  "girls football club",
  "girls academy",
  "women's football",
  "female football",
  "girl footballer",
  "girls soccer",
];

type LabsItem = {
  keyword?: string;
  keyword_info?: { search_volume?: number | null; cpc?: number | null; competition_level?: string | null; monthly_searches?: { year: number; month: number; search_volume: number | null }[] };
  keyword_properties?: { keyword_difficulty?: number | null };
  search_intent_info?: { main_intent?: string | null };
};

type Row = { keyword: string; volume: number | null; kd: number | null; cpc: number | null; competition: string | null; intent: string | null; sources: string[]; peakMonth: number | null };

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }
  const common = { workflow: WORKFLOW, environment: "live" as const, confirmLive: true, limit: 1000 };
  const rows = new Map<string, Row>();
  let totalCost = 0;

  const absorb = (items: LabsItem[], source: string) => {
    for (const it of items) {
      if (!it.keyword) continue;
      const key = it.keyword.toLowerCase();
      const existing = rows.get(key);
      if (existing) {
        existing.sources.push(source);
        continue;
      }
      const months = it.keyword_info?.monthly_searches ?? [];
      const peak = months.reduce<{ month: number; v: number } | null>((best, m) => ((m.search_volume ?? 0) > (best?.v ?? -1) ? { month: m.month, v: m.search_volume ?? 0 } : best), null);
      rows.set(key, {
        keyword: it.keyword,
        volume: it.keyword_info?.search_volume ?? null,
        kd: it.keyword_properties?.keyword_difficulty ?? null,
        cpc: it.keyword_info?.cpc ?? null,
        competition: it.keyword_info?.competition_level ?? null,
        intent: it.search_intent_info?.main_intent ?? null,
        sources: [source],
        peakMonth: peak?.month ?? null,
      });
    }
  };

  for (const seeds of IDEA_SEED_SETS) {
    const r = await keywordIdeas(seeds, common);
    totalCost += r.cost ?? 0;
    const items = ((r.data?.tasks?.[0]?.result?.[0] as { items?: LabsItem[] } | undefined)?.items ?? []) as LabsItem[];
    console.log(`ideas [${seeds.join(", ")}]: ${items.length} items, cache=${r.cacheStatus}, error=${r.error ?? "none"}`);
    absorb(items, `ideas:${seeds[0]}`);
  }
  for (const seed of SUGGESTION_SEEDS) {
    const r = await keywordSuggestions(seed, common);
    totalCost += r.cost ?? 0;
    const items = ((r.data?.tasks?.[0]?.result?.[0] as { items?: LabsItem[] } | undefined)?.items ?? []) as LabsItem[];
    console.log(`suggestions "${seed}": ${items.length} items, cache=${r.cacheStatus}, error=${r.error ?? "none"}`);
    absorb(items, `suggest:${seed}`);
  }

  const all = [...rows.values()].sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1));
  const out = `seo-data/exports/girls-football-keyword-discovery-2026-10-06.json`;
  writeFileSync(out, JSON.stringify(all, null, 2));
  console.log(`\n${all.length} unique keywords written to ${out}`);
  console.log(`Total actual API-reported cost: $${totalCost.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

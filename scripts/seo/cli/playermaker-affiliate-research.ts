// Playermaker affiliate + football tracker keyword research (2026-10-24):
// Graham's list of Playermaker affiliate-programme terms plus tracker terms we
// already rank for. UK volume + 12-month history, KD, and the live UK top 30
// for every term, so we can see where footballparent.co.uk sits today and who
// holds page one.
// Output: seo-data/exports/playermaker-affiliate-research-2026-10-24.json
//
// SAFETY: three-factor live gate; Graham requested the research in-session 2026-10-24.
// Run:
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/playermaker-affiliate-research.ts
import { writeFileSync } from "node:fs";
import { migrate } from "../database/migrate";
import { googleAdsSearchVolume } from "../dataforseo/endpoints/keywords_data";
import { bulkKeywordDifficulty } from "../dataforseo/endpoints/labs";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { type SerpItem } from "../dataforseo/serp-features";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const WORKFLOW = "playermaker-affiliate-research";
const OUT = "seo-data/exports/playermaker-affiliate-research-2026-10-24.json";

const KEYWORDS = [
  "sports technology", "football tech innovations", "smart sports equipment", "soccer analytics",
  "football performance analysis", "youth soccer development", "soccer training devices", "performance analysis tools",
  "sports analytics software", "soccer skill tracking", "athletic training gadgets", "football training technology",
  "wearable technology for athletes", "soccer performance metrics", "sports performance analysis", "soccer fitness tracking",
  "football player tracking", "sports tech devices", "soccer coaching apps", "football analytics",
  "youth football development", "football training devices", "football skill tracking", "football performance metrics",
  "football fitness tracking", "football coaching apps", "playermaker", "playermaker football tracker",
  "playermaker 2.0", "playermaker discount code", "cityplay football tracker", "football tracker",
  "football tracker kids", "kids football tracker", "football boot tracker", "football boot tracker kids",
  "football gps tracker", "best football gps tracker", "football gps vest", "football tracker vest",
];

type AdsItem = { keyword?: string; search_volume?: number | null; cpc?: number | null; competition?: string | null; monthly_searches?: { year: number; month: number; search_volume: number | null }[] };
type KdItem = { keyword?: string; keyword_difficulty?: number | null };

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }
  let totalCost = 0;
  const opts = { workflow: WORKFLOW, environment: "live" as const, confirmLive: true };

  const vol = await googleAdsSearchVolume(KEYWORDS, opts);
  totalCost += vol.cost ?? 0;
  if (vol.error || !vol.data) throw new Error(`search_volume failed: ${vol.error}`);
  const adsItems = (vol.data.tasks?.[0]?.result ?? []) as AdsItem[];

  const kd = await bulkKeywordDifficulty(KEYWORDS, opts);
  totalCost += kd.cost ?? 0;
  const kdMap = new Map<string, number | null>();
  for (const it of ((kd.data?.tasks?.[0]?.result?.[0] as { items?: KdItem[] } | undefined)?.items ?? []) as KdItem[]) {
    if (it.keyword) kdMap.set(it.keyword.toLowerCase(), it.keyword_difficulty ?? null);
  }

  const rows = [];
  for (const kw of KEYWORDS) {
    const a = adsItems.find((i) => i.keyword?.toLowerCase() === kw);
    const r = await googleOrganicSerp(kw, { ...opts, depth: 30 });
    totalCost += r.cost ?? 0;
    const items = ((r.data?.tasks?.[0]?.result?.[0] as { items?: SerpItem[] } | undefined)?.items ?? []) as (SerpItem & { rank_group?: number; domain?: string; url?: string })[];
    const organic = items.filter((i) => i.type === "organic").map((i) => ({ rank: i.rank_group, domain: i.domain, title: i.title, url: i.url }));
    const ours = organic.filter((o) => o.domain?.includes("footballparent"));
    const months = [...(a?.monthly_searches ?? [])].sort((x, y) => x.year * 12 + x.month - (y.year * 12 + y.month)).slice(-12);
    rows.push({
      keyword: kw,
      volume: a?.search_volume ?? null,
      kd: kdMap.get(kw) ?? null,
      cpc: a?.cpc ?? null,
      months: months.map((m) => m.search_volume),
      features: [...new Set(items.filter((i) => i.type !== "organic").map((i) => i.type))],
      ours,
      top10: organic.slice(0, 10),
    });
    console.log(`${kw}: vol ${a?.search_volume ?? "-"} kd ${kdMap.get(kw) ?? "-"} ours ${ours.map((o) => `#${o.rank} ${o.url}`).join(", ") || "none"}`);
  }

  writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), totalCost, rows }, null, 2));
  console.log(`written ${OUT}. Total cost $${totalCost.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

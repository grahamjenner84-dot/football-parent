// November/December affiliate seasonality (2026-10-22): which kids' football
// products and gift searches peak around Black Friday and Christmas, how big
// the peak is against the rest of the year, and when it starts. Google Ads
// monthly history gives absolute UK volume per month (last 12 months, so
// Nov/Dec 2025 is in it); Google Trends weekly series on the biggest terms
// gives the timing of the climb (Black Friday week vs December).
// Output: seo-data/exports/xmas-affiliate-seasonality-2026-10-22.json
//
// SAFETY: three-factor live gate; Graham asked for this in-session 2026-10-22.
// Run:
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/xmas-affiliate-seasonality.ts
import { writeFileSync } from "node:fs";
import { migrate } from "../database/migrate";
import { googleAdsSearchVolume, googleTrendsExplore } from "../dataforseo/endpoints/keywords_data";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const WORKFLOW = "xmas-affiliate-seasonality";
const OUT = "seo-data/exports/xmas-affiliate-seasonality-2026-10-22.json";

const TERMS = [
  // gifts
  "football gifts", "football gifts for kids", "football gifts for boys", "football gifts for girls", "football presents",
  "football christmas presents", "christmas football gifts", "football stocking fillers", "personalised football gifts",
  "football gift ideas", "goalkeeper gifts", "football advent calendar", "match attax advent calendar", "match attax",
  "football cards", "panini stickers", "premier league stickers", "football annual", "match annual",
  "football books for kids", "football bedding", "football lamp", "football slippers", "football pyjamas",
  // games and garden
  "table football", "table football for kids", "football table", "subbuteo", "mini football table",
  "football goals for garden", "kids football goals", "pop up football goals", "football goal", "football net",
  "football rebounder", "football rebounder net", "football training equipment", "football training equipment for kids",
  "football agility ladder", "football cones", "football skills mat", "football speed cage", "skills ball",
  "football pump", "football training aids", "kick trainer football", "football ball", "kids football",
  "size 4 football", "size 3 football", "size 5 football",
  // kit and gear (Black Friday)
  "kids football boots", "football boots kids", "junior football boots", "astro turf trainers kids", "kids astro boots",
  "shin pads kids", "kids shin pads", "goalkeeper gloves kids", "kids goalkeeper gloves", "football gloves kids",
  "kids football kit", "football kits for kids", "football tracksuit kids", "kids football coat", "football coat kids",
  "football boot bag", "football bag kids", "kids football socks", "grip socks football", "football base layer kids",
  "kids thermal football top", "football snood kids", "football hat kids", "football hoodie kids",
  // tech
  "football gps tracker", "playermaker", "kids football tracker", "veo camera", "football camera", "football watch kids",
  "football boots black friday", "black friday football boots", "nike football boots black friday",
];

// Trends groups of five; first term repeated as the anchor so groups compare.
const TREND_GROUPS = [
  ["football gifts", "football advent calendar", "table football", "football goals for garden", "football rebounder"],
  ["football gifts", "kids football boots", "goalkeeper gloves kids", "kids football kit", "shin pads kids"],
  ["football gifts", "match attax", "football stocking fillers", "personalised football gifts", "football training equipment"],
  ["football gifts", "football gps tracker", "veo camera", "kids football coat", "football base layer kids"],
];

type AdsItem = { keyword?: string; search_volume?: number | null; cpc?: number | null; competition?: string | null; monthly_searches?: { year: number; month: number; search_volume: number | null }[] };
type GraphItem = { type: string; keywords?: string[]; data?: { date_from: string; date_to: string; values: (number | null)[] }[] };

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }
  let cost = 0;
  const opts = { workflow: WORKFLOW, environment: "live" as const, confirmLive: true };

  const vol = await googleAdsSearchVolume([...new Set(TERMS)], opts);
  cost += vol.cost ?? 0;
  if (vol.error || !vol.data) throw new Error(`search_volume failed: ${vol.error}`);
  const ads = (vol.data.tasks?.[0]?.result ?? []) as AdsItem[];

  const rows = ads
    .filter((i) => i.keyword)
    .map((i) => {
      const months = [...(i.monthly_searches ?? [])].sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month)).slice(-12);
      const byYm = new Map(months.map((m) => [`${m.year}-${String(m.month).padStart(2, "0")}`, m.search_volume ?? 0]));
      const vals = months.map((m) => m.search_volume ?? 0);
      const nov = byYm.get("2025-11") ?? null;
      const dec = byYm.get("2025-12") ?? null;
      const others = months.filter((m) => !(m.year === 2025 && (m.month === 11 || m.month === 12))).map((m) => m.search_volume ?? 0);
      const baseline = others.length ? others.reduce((a, b) => a + b, 0) / others.length : 0;
      return {
        keyword: i.keyword as string,
        avgVolume: i.search_volume ?? null,
        cpc: i.cpc ?? null,
        competition: i.competition ?? null,
        nov2025: nov,
        dec2025: dec,
        baselineOtherMonths: Math.round(baseline),
        novLift: baseline && nov !== null ? Math.round((nov / baseline) * 10) / 10 : null,
        decLift: baseline && dec !== null ? Math.round((dec / baseline) * 10) / 10 : null,
        peakMonth: months.length ? `${months[vals.indexOf(Math.max(...vals))].year}-${String(months[vals.indexOf(Math.max(...vals))].month).padStart(2, "0")}` : null,
        months: Object.fromEntries(byYm),
      };
    })
    .sort((a, b) => (b.nov2025 ?? 0) + (b.dec2025 ?? 0) - ((a.nov2025 ?? 0) + (a.dec2025 ?? 0)));

  const trends: { group: string[]; weekly: { week: string; values: (number | null)[] }[] }[] = [];
  for (const group of TREND_GROUPS) {
    const r = await googleTrendsExplore(group, { ...opts, pollAttempts: 20, pollDelayMs: 3000 });
    cost += r.cost ?? 0;
    const items = ((r.data?.tasks?.[0]?.result?.[0] as { items?: GraphItem[] } | undefined)?.items ?? []) as GraphItem[];
    const graph = items.find((i) => i.type === "google_trends_graph");
    trends.push({ group, weekly: (graph?.data ?? []).map((d) => ({ week: d.date_from, values: d.values })) });
    console.log(`trends(${group.join(", ")}): ${graph?.data?.length ?? 0} weeks`);
  }

  writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), cost, rows, trends }, null, 2));
  console.log(`rows ${rows.length}, cost $${cost.toFixed(3)}, wrote ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

// Widened discovery for two clusters, follow-up to statzo-cluster-kd-serp.ts:
//  1. Stats tracking (coach side: Coach App; parent side: Progress) -
//     keyword suggestions, related keywords, keyword ideas, plus People Also
//     Ask / related searches / "people also search" from live UK SERPs.
//  2. Football GPS trackers (gear/affiliate angle) - same, plus
//     site:amazon.co.uk SERPs to find the products actually sold on Amazon UK.
// Writes everything to seo-data/exports/stats-gps-discovery.json.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/stats-and-gps-tracker-discovery.ts
import fs from "node:fs";
import path from "node:path";
import { migrate } from "../database/migrate";
import { keywordSuggestions, relatedKeywords, keywordIdeas } from "../dataforseo/endpoints/labs";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { ensureEnvLoaded, REPO_ROOT } from "../shared/env";

ensureEnvLoaded();

type KwRow = { keyword: string; volume: number | null; kd: number | null; cpc: number | null; source: string };
type SerpItem = {
  type: string;
  rank_absolute?: number;
  domain?: string;
  title?: string;
  url?: string;
  description?: string;
  items?: Array<{ title?: string } | string>;
};

const CLUSTERS = {
  stats: {
    suggestions: [
      "football stats app",
      "football stats tracker",
      "track football stats",
      "football player stats",
      "kids football stats",
      "football stats sheet",
      "grassroots football stats",
      "football match stats app",
      "football tracker app",
    ],
    related: ["football stats app", "football stats tracker", "football player stats app", "football statistics app"],
    ideas: ["football stats app", "football stats tracker", "grassroots football app", "football player stats tracker"],
    serps: [
      "football stats app",
      "football stats tracker",
      "grassroots football stats app",
      "track my child's football stats",
      "football stats app for parents",
      "football player stats tracker",
      "app to track football stats",
      "football match stats app",
    ],
  },
  gps: {
    suggestions: ["football gps tracker", "gps tracker football", "football tracker", "playr", "football gps vest", "kids football tracker"],
    related: ["football gps tracker", "football tracker"],
    ideas: ["football gps tracker", "football gps vest", "football tracker"],
    serps: [
      "football gps tracker for kids",
      "gps football tracker",
      "best football gps tracker",
      "football gps vest kids",
      "site:amazon.co.uk football gps tracker",
      "site:amazon.co.uk football gps vest",
      "site:amazon.co.uk kids football tracker",
    ],
  },
} as const;

function labsItems(data: unknown): Array<Record<string, any>> {
  const result = (data as any)?.tasks?.[0]?.result?.[0];
  return (result?.items ?? []) as Array<Record<string, any>>;
}

function toRow(item: Record<string, any>, source: string): KwRow | null {
  const d = item.keyword_data ?? item; // related_keywords nests under keyword_data
  if (!d?.keyword) return null;
  return {
    keyword: d.keyword,
    volume: d.keyword_info?.search_volume ?? null,
    kd: d.keyword_properties?.keyword_difficulty ?? null,
    cpc: d.keyword_info?.cpc ?? null,
    source,
  };
}

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }
  const common = { workflow: "stats-and-gps-tracker-discovery", environment: "live" as const, confirmLive: true };
  let totalCost = 0;
  const out: Record<string, unknown> = {};

  for (const [name, c] of Object.entries(CLUSTERS)) {
    const kws = new Map<string, KwRow>();
    const add = (r: KwRow | null) => {
      if (r && !kws.has(r.keyword)) kws.set(r.keyword, r);
    };
    for (const seed of c.suggestions) {
      const r = await keywordSuggestions(seed, { ...common, limit: 100 });
      totalCost += r.cost ?? 0;
      labsItems(r.data).forEach((i) => add(toRow(i, `suggest:${seed}`)));
    }
    for (const seed of c.related) {
      const r = await relatedKeywords(seed, { ...common, limit: 100 });
      totalCost += r.cost ?? 0;
      labsItems(r.data).forEach((i) => add(toRow(i, `related:${seed}`)));
    }
    const ideas = await keywordIdeas([...c.ideas], { ...common, limit: 200 });
    totalCost += ideas.cost ?? 0;
    labsItems(ideas.data).forEach((i) => add(toRow(i, "ideas")));

    const serps: Record<string, unknown> = {};
    for (const q of c.serps) {
      const r = await googleOrganicSerp(q, { ...common, depth: 20 });
      totalCost += r.cost ?? 0;
      const items = ((r.data as any)?.tasks?.[0]?.result?.[0]?.items ?? []) as SerpItem[];
      const nested = (type: string) =>
        items
          .filter((i) => i.type === type)
          .flatMap((i) => i.items ?? [])
          .map((x) => (typeof x === "string" ? x : x.title))
          .filter(Boolean);
      serps[q] = {
        features: [...new Set(items.filter((i) => i.type !== "organic").map((i) => i.type))],
        paa: nested("people_also_ask"),
        relatedSearches: nested("related_searches"),
        peopleAlsoSearch: nested("people_also_search"),
        organic: items
          .filter((i) => i.type === "organic")
          .slice(0, 20)
          .map((i) => ({ pos: i.rank_absolute, domain: i.domain, title: i.title, url: i.url, description: i.description })),
      };
    }
    out[name] = { keywords: [...kws.values()].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0)), serps };
  }

  const file = path.join(REPO_ROOT, "seo-data", "exports", "stats-gps-discovery.json");
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`Wrote ${file}`);
  console.log(`Total actual API-reported cost: $${totalCost.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

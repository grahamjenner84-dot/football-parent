// One-off sizing research for a possible /coaching article on recruiting
// players to a grassroots team (2026-10-09). Prompted by GSC: "how to
// recruit players for grassroots football" shows 52 impressions at ~14 on
// /academy-trials/how-football-clubs-recruit-young-players, a parent-facing
// page about academy scouting, so the coach intent has no page of its own.
//
// Real DataForSEO UK/English data only. Calls kept small:
//   1. one batched search_volume call across all seeds
//   2. one keyword_ideas call per cluster
//   3. one bulk_keyword_difficulty call on the shortlist
//   4. a top-10 organic SERP (with PAA / AI Overview) for the three
//      highest-volume seeds, to see who ranks and what Google shows
//
// Graham asked for this research in-session on 2026-10-09.
// Run:
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/coach-recruit-players-research.ts
import { migrate } from "../database/migrate";
import { getDb } from "../database/db";
import { googleAdsSearchVolume } from "../dataforseo/endpoints/keywords_data";
import { keywordIdeas, bulkKeywordDifficulty } from "../dataforseo/endpoints/labs";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { extractSerpFeatures, type SerpItem } from "../dataforseo/serp-features";
import { upsertKeywordWithMetrics } from "../dataforseo/persist-results";
import { isSuppressedKeyword } from "../shared/keyword-suppressions";
import { ensureEnvLoaded } from "../shared/env";

const WORKFLOW = "coach-recruit-players-research";

type SearchVolumeItem = { keyword: string; search_volume: number | null; cpc: number | null; competition: string | null };
type KeywordIdeaItem = {
  keyword: string;
  keyword_info?: { search_volume?: number | null; cpc?: number | null; competition?: number | null };
};
type OrganicItem = SerpItem & { rank_group?: number; domain?: string; url?: string };
type DifficultyItem = { keyword: string; keyword_difficulty: number | null };

const CLUSTERS: Record<string, string[]> = {
  recruit_players: [
    "how to recruit players for grassroots football",
    "how to recruit players for a football team",
    "how to find players for my football team",
    "how to get more players for my football team",
    "how to attract players to your football club",
    "recruiting players for youth football team",
    "football team looking for players",
    "players wanted football",
    "how to advertise for football players",
    "football club recruitment ideas",
    "not enough players football team",
  ],
  start_team: [
    "how to start a grassroots football team",
    "how to start a youth football team",
    "how to start a kids football team",
    "how to set up a football team",
    "how to start a football club for kids",
  ],
  retention: [
    "how to keep players at your football club",
    "player retention grassroots football",
    "why do kids quit football",
  ],
};

async function main() {
  ensureEnvLoaded();
  migrate();
  const db = getDb();

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  const allSeeds = Object.values(CLUSTERS).flat();
  console.log(`Seed keywords: ${allSeeds.length} across ${Object.keys(CLUSTERS).length} clusters.`);
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  let totalCost = 0;
  const report: {
    cluster: string;
    keyword: string;
    type: "seed" | "idea";
    volume: number | null;
    cpc: number | null;
    difficulty: number | null;
  }[] = [];

  // 1. Search volume for every seed.
  const volResult = await googleAdsSearchVolume(allSeeds, { workflow: WORKFLOW, environment: "live", confirmLive: true });
  console.log(`[search_volume] cacheStatus=${volResult.cacheStatus} cost=${volResult.cost} error=${volResult.error ?? "none"}`);
  totalCost += volResult.cost ?? 0;
  if (volResult.error || !volResult.data) {
    console.error("search_volume failed, aborting:", volResult.error);
    process.exitCode = 1;
    return;
  }
  const volRawRow = db.prepare("SELECT id FROM raw_responses WHERE request_hash = ?").get(volResult.requestHash) as { id: number } | undefined;
  const volItems = (volResult.data.tasks?.[0]?.result ?? []) as SearchVolumeItem[];
  const volByKeyword = new Map(volItems.map((i) => [i.keyword.toLowerCase(), i]));
  for (const [cluster, seeds] of Object.entries(CLUSTERS)) {
    for (const seed of seeds) {
      const v = volByKeyword.get(seed.toLowerCase());
      report.push({ cluster, keyword: seed, type: "seed", volume: v?.search_volume ?? null, cpc: v?.cpc ?? null, difficulty: null });
      upsertKeywordWithMetrics({
        keyword: seed,
        volume: v?.search_volume ?? null,
        cpc: v?.cpc ?? null,
        competition: v?.competition ?? null,
        source: "dataforseo_live",
        isSandbox: false,
        rawResponseId: volRawRow?.id ?? null,
      });
    }
  }

  // 2. Keyword ideas per cluster.
  const seen = new Set(allSeeds.map((s) => s.toLowerCase()));
  for (const [cluster, seeds] of Object.entries(CLUSTERS)) {
    const ideasResult = await keywordIdeas(seeds, { workflow: WORKFLOW, environment: "live", confirmLive: true, limit: 30 });
    console.log(`[keyword_ideas:${cluster}] cacheStatus=${ideasResult.cacheStatus} cost=${ideasResult.cost} error=${ideasResult.error ?? "none"}`);
    totalCost += ideasResult.cost ?? 0;
    if (ideasResult.error || !ideasResult.data) continue;
    const ideasRawRow = db.prepare("SELECT id FROM raw_responses WHERE request_hash = ?").get(ideasResult.requestHash) as { id: number } | undefined;
    const ideaItems = ((ideasResult.data.tasks?.[0]?.result as unknown[])?.[0] as { items?: KeywordIdeaItem[] } | undefined)?.items ?? [];
    for (const item of ideaItems) {
      if (!item.keyword) continue;
      const key = item.keyword.toLowerCase();
      if (seen.has(key) || isSuppressedKeyword(item.keyword)) continue;
      seen.add(key);
      report.push({ cluster, keyword: item.keyword, type: "idea", volume: item.keyword_info?.search_volume ?? null, cpc: item.keyword_info?.cpc ?? null, difficulty: null });
      upsertKeywordWithMetrics({
        keyword: item.keyword,
        volume: item.keyword_info?.search_volume ?? null,
        cpc: item.keyword_info?.cpc ?? null,
        competition: item.keyword_info?.competition ?? null,
        source: "dataforseo_live",
        isSandbox: false,
        rawResponseId: ideasRawRow?.id ?? null,
      });
    }
  }

  // 3. Difficulty for seeds plus the top 10 ideas per cluster.
  const shortlist = new Set(allSeeds);
  for (const cluster of Object.keys(CLUSTERS)) {
    report
      .filter((r) => r.cluster === cluster && r.type === "idea")
      .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
      .slice(0, 10)
      .forEach((r) => shortlist.add(r.keyword));
  }
  const kdResult = await bulkKeywordDifficulty([...shortlist], { workflow: WORKFLOW, environment: "live", confirmLive: true });
  console.log(`[bulk_keyword_difficulty] cacheStatus=${kdResult.cacheStatus} cost=${kdResult.cost} error=${kdResult.error ?? "none"}`);
  totalCost += kdResult.cost ?? 0;
  if (!kdResult.error && kdResult.data) {
    const kdItems = (kdResult.data.tasks?.[0]?.result?.[0] as { items?: DifficultyItem[] } | undefined)?.items
      ?? ((kdResult.data.tasks?.[0]?.result ?? []) as DifficultyItem[]);
    const kdBy = new Map(kdItems.filter((i) => i.keyword).map((i) => [i.keyword.toLowerCase(), i.keyword_difficulty]));
    for (const r of report) {
      const kd = kdBy.get(r.keyword.toLowerCase());
      if (kd !== undefined) r.difficulty = kd;
    }
  }

  // 4. SERPs for the three highest-volume seeds.
  const serpTargets = report
    .filter((r) => r.type === "seed" && (r.volume ?? 0) > 0)
    .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
    .slice(0, 3)
    .map((r) => r.keyword);
  const serps: Record<string, unknown> = {};
  for (const kw of serpTargets) {
    const s = await googleOrganicSerp(kw, { workflow: WORKFLOW, environment: "live", confirmLive: true, depth: 10, forceRefresh: true });
    console.log(`[serp:${kw}] cacheStatus=${s.cacheStatus} cost=${s.cost} error=${s.error ?? "none"}`);
    totalCost += s.cost ?? 0;
    if (s.error || !s.data) continue;
    const items = ((s.data.tasks?.[0]?.result as unknown[])?.[0] as { items?: OrganicItem[] } | undefined)?.items ?? [];
    const organic = items
      .filter((it) => it.type === "organic")
      .map((it) => ({ rank: it.rank_group, domain: it.domain, title: it.title, url: it.url }));
    serps[kw] = { organic, features: extractSerpFeatures(items) };
  }

  console.log(`\n=== TOTAL ACTUAL COST THIS RUN: $${totalCost.toFixed(4)} ===\n`);
  console.log(JSON.stringify({ report, serps }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

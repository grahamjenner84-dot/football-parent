// One-off cluster keyword research for the grassroots coaching app content
// cluster (fair game time / team picking-rotation / stats tracking / new
// coach / commercial). Real DataForSEO UK/English data only - no invented
// numbers. Three calls kept deliberately small given a tight account
// balance:
//   1. one batched search_volume call across all seed keywords
//   2. one keyword_ideas call per cluster (batched seeds per cluster)
//   3. one bulk_keyword_difficulty call across the resulting shortlist
//
// Usage (after explicit user approval in-session):
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/coach-keyword-research.ts
import { migrate } from "../database/migrate";
import { getDb, nowIso } from "../database/db";
import { googleAdsSearchVolume } from "../dataforseo/endpoints/keywords_data";
import { keywordIdeas, bulkKeywordDifficulty } from "../dataforseo/endpoints/labs";
import { upsertKeywordWithMetrics } from "../dataforseo/persist-results";
import { isSuppressedKeyword } from "../shared/keyword-suppressions";

type SearchVolumeItem = { keyword: string; search_volume: number | null; cpc: number | null; competition: string | null };
type KeywordIdeaItem = {
  keyword: string;
  keyword_info?: { search_volume?: number | null; cpc?: number | null; competition?: number | null };
};
type DifficultyItem = { keyword: string; keyword_difficulty: number | null };

const CLUSTERS: Record<string, string[]> = {
  "fair_game_time": [
    "equal playing time football",
    "equal game time grassroots",
    "how to give every player equal game time",
    "how many minutes should each player play",
    "fair substitution system football",
    "rotating players fairly youth football",
  ],
  "picking_rotating_team": [
    "how to pick a football team",
    "football team rotation system",
    "how to rotate players youth football",
    "should everyone play every position",
    "team selection grassroots football",
  ],
  "stats_tracking": [
    "how to track stats for grassroots football team",
    "what stats to track youth football",
    "how to track player minutes football",
    "grassroots football stats",
  ],
  "new_first_time_coach": [
    "tips for new grassroots football coach",
    "how to start coaching kids football",
    "what do i need to start coaching football",
    "managing an under 7s team",
    "first season coaching under 8s",
    "grassroots coaching for beginners",
  ],
  "commercial": [
    "grassroots football team management app",
    "football management app",
    "best football team management apps uk",
    "spond alternatives",
  ],
};

async function main() {
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
    competition: string | number | null;
    difficulty: number | null;
  }[] = [];

  // 1. Search volume for every seed, one batched call.
  const volResult = await googleAdsSearchVolume(allSeeds, { workflow: "coach-keyword-research", environment: "live", confirmLive: true });
  console.log(`\n[search_volume] cacheStatus=${volResult.cacheStatus} cost=${volResult.cost} error=${volResult.error ?? "none"}`);
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
      report.push({
        cluster,
        keyword: seed,
        type: "seed",
        volume: v?.search_volume ?? null,
        cpc: v?.cpc ?? null,
        competition: v?.competition ?? null,
        difficulty: null,
      });
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

  // 2. Keyword ideas per cluster, one call per cluster (batched seeds).
  const ideaKeywordsSeen = new Set(allSeeds.map((s) => s.toLowerCase()));
  for (const [cluster, seeds] of Object.entries(CLUSTERS)) {
    const ideasResult = await keywordIdeas(seeds, { workflow: "coach-keyword-research", environment: "live", confirmLive: true, limit: 30 });
    console.log(`[keyword_ideas:${cluster}] cacheStatus=${ideasResult.cacheStatus} cost=${ideasResult.cost} error=${ideasResult.error ?? "none"}`);
    totalCost += ideasResult.cost ?? 0;
    if (ideasResult.error || !ideasResult.data) {
      console.error(`keyword_ideas failed for ${cluster}, skipping:`, ideasResult.error);
      continue;
    }
    const ideasRawRow = db.prepare("SELECT id FROM raw_responses WHERE request_hash = ?").get(ideasResult.requestHash) as { id: number } | undefined;
    const ideaItems = ((ideasResult.data.tasks?.[0]?.result as unknown[])?.[0] as { items?: KeywordIdeaItem[] } | undefined)?.items ?? [];
    const sorted = [...ideaItems].sort((a, b) => (b.keyword_info?.search_volume ?? 0) - (a.keyword_info?.search_volume ?? 0));
    for (const item of sorted) {
      if (!item.keyword) continue;
      const key = item.keyword.toLowerCase();
      if (ideaKeywordsSeen.has(key)) continue;
      ideaKeywordsSeen.add(key);
      if (isSuppressedKeyword(item.keyword)) continue;
      report.push({
        cluster,
        keyword: item.keyword,
        type: "idea",
        volume: item.keyword_info?.search_volume ?? null,
        cpc: item.keyword_info?.cpc ?? null,
        competition: item.keyword_info?.competition ?? null,
        difficulty: null,
      });
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

  // 3. Bulk keyword difficulty for the shortlist: all seeds + top 10 ideas
  // per cluster by volume, to keep this untested-cost endpoint bounded.
  const shortlist = new Set(allSeeds);
  for (const cluster of Object.keys(CLUSTERS)) {
    const topIdeas = report
      .filter((r) => r.cluster === cluster && r.type === "idea")
      .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
      .slice(0, 10);
    for (const t of topIdeas) shortlist.add(t.keyword);
  }
  const shortlistArr = [...shortlist];
  console.log(`\n[bulk_keyword_difficulty] requesting difficulty for ${shortlistArr.length} keywords...`);
  const kdResult = await bulkKeywordDifficulty(shortlistArr, { workflow: "coach-keyword-research", environment: "live", confirmLive: true });
  console.log(`[bulk_keyword_difficulty] cacheStatus=${kdResult.cacheStatus} cost=${kdResult.cost} error=${kdResult.error ?? "none"}`);
  totalCost += kdResult.cost ?? 0;
  if (!kdResult.error && kdResult.data) {
    const kdItems = (kdResult.data.tasks?.[0]?.result ?? []) as DifficultyItem[];
    const kdByKeyword = new Map(kdItems.filter((i) => i.keyword).map((i) => [i.keyword.toLowerCase(), i.keyword_difficulty]));
    for (const r of report) {
      const kd = kdByKeyword.get(r.keyword.toLowerCase());
      if (kd !== undefined) r.difficulty = kd;
    }
  }

  console.log(`\n=== TOTAL ACTUAL COST THIS RUN: $${totalCost.toFixed(4)} ===\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

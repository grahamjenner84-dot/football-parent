// Step 1/2 of the playing-time-tracking-app backlink prospecting brief
// (2026-09-19): expand Graham's seed list via DataForSEO Labs related
// keyword data, filter out excluded topics, and write a final shortlist of
// search phrases to disk for the next stage (SERP discovery) to consume.
//
// Usage:
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/playing-time-prospecting-keywords.ts
import fs from "node:fs";
import path from "node:path";
import { migrate } from "../database/migrate";
import { keywordIdeas, relatedKeywords } from "../dataforseo/endpoints/labs";
import { ensureEnvLoaded, REPO_ROOT } from "../shared/env";

ensureEnvLoaded();

const SEED_KEYWORDS = [
  "equal playing time", "fair playing time", "equal game time", "fair game time",
  "equal minutes football", "playing time policy", "playing time policy football",
  "youth football playing time policy", "grassroots football playing time policy",
  "youth football substitutions", "managing substitutes football",
  "substitution rules youth football", "substitution management football",
  "player rotation youth football", "squad rotation youth football",
  "squad rotation policy", "rolling substitutes grassroots football",
  "tracking player minutes football", "tracking playing time football",
  "how much game time should children get football",
  "should children get equal playing time football",
  "fair play policy football", "FA fair play playing time",
  "managing large squads football", "keeping substitutes involved",
  "fairness in children's football", "parents unhappy about playing time",
  "parent concerns game time football", "coach favouritism playing time",
  "grassroots football substitution rules", "under 7s football substitutions",
  "mini soccer substitutions rules", "youth football team selection",
  "team selection policy youth football", "best xi vs development football",
  "FA player development playing time", "county fa playing time policy",
  "club playing time policy template", "coaching philosophy fair playing time",
  "equal playing time youth soccer", "fair playing time policy soccer",
  "playing time policy youth soccer", "youth soccer substitution rules",
  "managing substitutes soccer", "player rotation youth soccer",
  "squad rotation youth soccer", "tracking playing time soccer",
  "soccer playing time tracker", "how much playing time should kids get soccer",
  "parents upset about playing time soccer", "AYSO equal playing time",
  "US youth soccer playing time rules", "recreational soccer playing time policy",
  "travel soccer playing time", "youth sports playing time debate",
  "equal playing time youth sports", "playing time policy youth sports",
  "coach playing time favoritism", "minimum playing time rule soccer",
  "mandatory playing time rule", "playing time rule youth league",
  "football substitution tracker", "team sheet app football",
  "lineup app grassroots football", "coach app grassroots football",
  "football match day app coach", "football playing time spreadsheet",
  "youth football coaching philosophy fairness", "grassroots football fairness",
];

// Broad idea-discovery seeds (kept short - keyword_ideas fans out a lot per seed).
const IDEA_SEEDS = [
  "equal playing time football",
  "fair playing time policy",
  "youth soccer playing time",
  "managing substitutes youth football",
  "player rotation policy football",
];
const RELATED_SEEDS = ["playing time football", "substitutions football", "playing time youth sports", "squad rotation football"];

const EXCLUDE_PATTERN = /\b(fantasy football|betting|bet365|odds|fifa \d\d|ea sports|video game|player of the (month|week|season|year)|premier league table|transfer (news|rumour|window)|injury news|fpl\b|match ?day \d+ prediction)\b/i;

// Must be topically on-brief: playing time / game time / substitutions /
// rotation / squad management / fairness in a youth/grassroots/parent
// context. This is a *keep* filter (require a hit), unlike EXCLUDE_PATTERN
// which is a *drop* filter.
const RELEVANT_PATTERN = /playing time|play time|game time|playtime|substitut|rotation|squad|lineup|line-up|line up|team selection|fair play|fairness|minutes played|game minutes/i;

type Idea = { keyword?: string; keyword_info?: { search_volume?: number | null } };

async function main() {
  migrate();

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(`Plan: 1 keyword_ideas call (5 seeds) + 2 related_keywords calls. Estimated cost: ~$0.35.`);
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes.");
    return;
  }

  let totalCost = 0;
  const common = { workflow: "playing-time-prospecting-keywords", environment: "live" as const, confirmLive: true };
  const discovered = new Map<string, number | null>();

  console.log("\n=== keyword_ideas (broad discovery) ===");
  const ideas = await keywordIdeas(IDEA_SEEDS, { ...common, limit: 500 });
  totalCost += ideas.cost ?? 0;
  console.log(`cost so far: $${totalCost.toFixed(3)}`);
  if (ideas.error || !ideas.data) {
    console.log(`ERROR: ${ideas.error}`);
  } else {
    const items = (ideas.data.tasks?.[0]?.result as Array<{ items?: Idea[] }> | undefined) ?? [];
    const rows = items[0]?.items ?? [];
    console.log(`${rows.length} ideas returned.`);
    for (const r of rows) {
      if (!r.keyword) continue;
      const kw = r.keyword.toLowerCase();
      if (EXCLUDE_PATTERN.test(kw)) continue;
      if (!RELEVANT_PATTERN.test(kw)) continue;
      discovered.set(kw, r.keyword_info?.search_volume ?? null);
    }
  }

  for (const seed of RELATED_SEEDS) {
    console.log(`\n=== related_keywords: "${seed}" ===`);
    const related = await relatedKeywords(seed, { ...common, limit: 150 });
    totalCost += related.cost ?? 0;
    console.log(`cost so far: $${totalCost.toFixed(3)}`);
    if (related.error || !related.data) {
      console.log(`ERROR: ${related.error}`);
      continue;
    }
    const items = (related.data.tasks?.[0]?.result as Array<{ items?: Array<{ keyword_data?: Idea }> }> | undefined) ?? [];
    const rows = items[0]?.items ?? [];
    console.log(`${rows.length} related keywords returned.`);
    for (const r of rows) {
      const kw = r.keyword_data?.keyword?.toLowerCase();
      if (!kw) continue;
      if (EXCLUDE_PATTERN.test(kw)) continue;
      if (!RELEVANT_PATTERN.test(kw)) continue;
      discovered.set(kw, r.keyword_data?.keyword_info?.search_volume ?? null);
    }
  }

  const seedSet = new Set(SEED_KEYWORDS.map((k) => k.toLowerCase()));
  const newlyDiscovered = [...discovered.keys()].filter((k) => !seedSet.has(k));

  const finalUniverse = [...new Set([...SEED_KEYWORDS.map((k) => k.toLowerCase()), ...newlyDiscovered])];

  console.log(`\n=== Final search-term universe: ${finalUniverse.length} phrases (${SEED_KEYWORDS.length} seed + ${newlyDiscovered.length} newly discovered) ===`);
  console.log(`\n--- Newly discovered terms not in the original seed list ---`);
  for (const k of newlyDiscovered) console.log(`  ${k} | labs vol=${discovered.get(k) ?? "n/a"}`);

  const outPath = path.join(REPO_ROOT, "seo-data", "raw", "playing-time-prospecting-keyword-universe.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        seedCount: SEED_KEYWORDS.length,
        newlyDiscoveredCount: newlyDiscovered.length,
        newlyDiscovered,
        finalUniverse,
      },
      null,
      2
    )
  );
  console.log(`\nWrote keyword universe to ${outPath}`);
  console.log(`\nTotal actual API-reported cost: $${totalCost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

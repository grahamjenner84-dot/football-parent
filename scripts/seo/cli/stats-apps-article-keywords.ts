// Volume + difficulty for the extra phrasings around the planned
// /parent-guides/best-football-stats-apps article (parent, kids, record book,
// spreadsheet variants), on top of the cluster already pulled in
// stats-and-gps-tracker-discovery.ts.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/stats-apps-article-keywords.ts
import { migrate } from "../database/migrate";
import { keywordOverview } from "../dataforseo/endpoints/labs";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const KEYWORDS = [
  "football stats app for kids",
  "kids football stats",
  "football stats for kids",
  "football stats book",
  "football record book",
  "football journal for kids",
  "football match journal",
  "football stats tracker for kids",
  "how to track football stats",
  "track football stats",
  "football stats tracker app",
  "free football stats app",
  "grassroots football stats",
  "youth football stats app",
  "football stats sheet",
  "football stats template",
  "player stats app football",
  "football goals and assists tracker",
  "goals and assists tracker",
  "football season stats",
];

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }
  const r = await keywordOverview(KEYWORDS, { workflow: "stats-apps-article-keywords", environment: "live", confirmLive: true });
  const items = ((r.data as any)?.tasks?.[0]?.result?.[0]?.items ?? []) as any[];
  for (const k of KEYWORDS) {
    const i = items.find((x) => x.keyword === k);
    console.log(`${k} | vol ${i?.keyword_info?.search_volume ?? "-"} | KD ${i?.keyword_properties?.keyword_difficulty ?? "-"} | intent ${i?.search_intent_info?.main_intent ?? "-"}`);
  }
  console.log(`cost $${(r.cost ?? 0).toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

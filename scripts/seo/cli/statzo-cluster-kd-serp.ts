// Difficulty + real UK page one for the "football stats app" cluster that
// statzoapp.com ranks for (see statzo-ranked-keywords.ts), to decide whether
// Football Parent should target it.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/statzo-cluster-kd-serp.ts
import { migrate } from "../database/migrate";
import { bulkKeywordDifficulty } from "../dataforseo/endpoints/labs";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

type DifficultyItem = { keyword: string; keyword_difficulty: number | null };
type SerpItem = { type: string; rank_absolute?: number; domain?: string; title?: string; url?: string };

const KD_KEYWORDS = [
  "football stats app",
  "football statistics app",
  "football stat app",
  "apps for football stats",
  "app for football stats",
  "football stats tracker",
  "best football stats app",
  "best football statistics app",
  "football tracker",
  "stat football",
  "football performance tracker",
  "grassroots football stats app",
  "football player stats tracker",
];
const SERP_KEYWORDS = ["football stats app", "football stats tracker", "best football stats app", "football tracker"];

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }
  const common = { workflow: "statzo-cluster-kd-serp", environment: "live" as const, confirmLive: true };
  let totalCost = 0;

  const kdResult = await bulkKeywordDifficulty(KD_KEYWORDS, common);
  totalCost += kdResult.cost ?? 0;
  const kdItems = (kdResult.data?.tasks?.[0]?.result?.[0] as { items?: DifficultyItem[] } | undefined)?.items ?? [];
  console.log("=== Keyword difficulty (UK) ===");
  for (const k of KD_KEYWORDS) {
    const m = kdItems.find((i) => i.keyword?.toLowerCase() === k);
    console.log(`  ${k}: KD ${m?.keyword_difficulty ?? "n/a"}`);
  }

  for (const kw of SERP_KEYWORDS) {
    const serp = await googleOrganicSerp(kw, { ...common, depth: 20 });
    totalCost += serp.cost ?? 0;
    console.log(`\n=== "${kw}" ===`);
    if (serp.error || !serp.data) {
      console.log(`SERP failed: ${serp.error}`);
      continue;
    }
    const items = (serp.data.tasks?.[0]?.result?.[0] as { items?: SerpItem[] } | undefined)?.items ?? [];
    const features = [...new Set(items.filter((i) => i.type !== "organic").map((i) => i.type))];
    console.log(`  SERP features: ${features.join(", ") || "none"}`);
    for (const i of items.filter((i) => i.type === "organic").slice(0, 12)) {
      console.log(`  #${i.rank_absolute}  ${i.domain}  ${i.title}`);
    }
  }
  console.log(`\nTotal actual API-reported cost: $${totalCost.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

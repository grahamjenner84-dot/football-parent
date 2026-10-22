// Follow-up to quickplay-sponsor-serps.ts: the two biggest mat terms were
// recommended on volume without a SERP check. Top-20 SERP for each.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/quickplay-mat-serps.ts
import { migrate } from "../database/migrate";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const TERMS = ["football training mat", "football skills mat"];

type SerpItem = { type?: string; rank_absolute?: number; domain?: string; title?: string; url?: string };

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(`Plan: ${TERMS.length} SERPs at depth 20. Rough cost ~$0.01.`);
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }
  let cost = 0;
  for (const term of TERMS) {
    const res = await googleOrganicSerp(term, { workflow: "quickplay-mat-serps", environment: "live", confirmLive: true, depth: 20 });
    if (res.error || !res.data) {
      console.log(`SERP failed for ${term}: ${res.error}`);
      continue;
    }
    cost += res.cost ?? 0;
    const items = ((res.data.tasks?.[0]?.result as Array<{ items?: SerpItem[] }> | undefined)?.[0]?.items) ?? [];
    const features = [...new Set(items.map((i) => i.type ?? "").filter((t) => t && t !== "organic"))];
    console.log(`\n== ${term} == [${features.join(",")}]`);
    for (const i of items.filter((i) => i.type === "organic")) {
      console.log(`${i.rank_absolute}\t${i.domain}\t${(i.title ?? "").slice(0, 85)}\t${i.url}`);
    }
  }
  console.log(`\nCost: $${cost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

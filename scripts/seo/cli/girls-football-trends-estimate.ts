// Step 4 of the girls' football research (2026-10-06). Google Ads and
// DataForSEO clickstream both return null volume for nearly every "girls"
// phrasing (Google withholds it), so this estimates UK volume from Google
// Trends: each group shares one anchor term whose Ads volume is known, and
// estimated volume = term's 12-month average / anchor's average * anchor
// volume. Rough (Trends rounds small series to 0/1), but it ranks terms
// on real Google data rather than guesswork.
// Note: on the 2026-10-06 run, 8 of the 9 Trends tasks outlasted the
// client's default polling (5 x 1.5s) and were cached as empty "partial"
// results. The export JSON was then built by fetching each finished task
// directly with task_get/{id}, at no extra cost. Raise pollAttempts before
// re-running this.
// SAFETY: three-factor live gate; Graham approved in-session 2026-10-06.
// Run: LIVE_CONFIRM=yes npx tsx scripts/seo/cli/girls-football-trends-estimate.ts
import { writeFileSync } from "node:fs";
import { migrate } from "../database/migrate";
import { googleTrendsExplore } from "../dataforseo/endpoints/keywords_data";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const ANCHORS: Record<string, number> = { "wildcats football": 390, "etc football": 110, "girls football boots": 6600 };

const GROUPS = [
  ["wildcats football", "girls football", "girls football near me", "football for girls", "girls football club"],
  ["wildcats football", "girls football trials", "girls football academy", "girls football camps", "girls football training"],
  ["wildcats football", "girls football teams near me", "girls football league", "girls football clubs near me", "girls football team"],
  ["wildcats football", "can girls play on boys football teams", "mixed football", "girls football age", "what age can girls play football"],
  ["etc football", "girls academy trials", "girls football drills", "girls football coaching", "girls football tournaments"],
  ["etc football", "girls football scholarships", "girls etc", "girls rtc", "girls futsal"],
  ["etc football", "arsenal girls academy", "chelsea girls academy", "man city girls academy", "girls football academy near me"],
  ["etc football", "football trials for girls", "girls football trials near me", "girls football camps near me", "girls football training near me"],
  ["girls football boots", "girls football", "best football boots for girls", "girls shin pads", "girls football kit"],
];

type GraphItem = { type: string; keywords?: string[]; averages?: number[] };

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }
  let cost = 0;
  const out: { keyword: string; anchor: string; ratio: number | null; estVolume: number | null }[] = [];
  for (const group of GROUPS) {
    const r = await googleTrendsExplore(group, { workflow: "girls-football-trends-estimate", environment: "live", confirmLive: true });
    cost += r.cost ?? 0;
    const items = ((r.data?.tasks?.[0]?.result?.[0] as { items?: GraphItem[] } | undefined)?.items ?? []);
    const graph = items.find((i) => i.type === "google_trends_graph");
    const anchor = group[0];
    if (!graph?.averages) {
      console.log(`[${group.join(", ")}] no graph: ${r.error ?? r.data?.tasks?.[0]?.status_message}`);
      continue;
    }
    const anchorAvg = graph.averages[0];
    console.log(`\nanchor "${anchor}" avg=${anchorAvg} (vol ${ANCHORS[anchor]})`);
    group.slice(1).forEach((kw, idx) => {
      const avg = graph.averages![idx + 1];
      const ratio = anchorAvg ? avg / anchorAvg : null;
      const est = ratio === null ? null : Math.round(ratio * ANCHORS[anchor]);
      out.push({ keyword: kw, anchor, ratio, estVolume: est });
      console.log(`  ${String(est).padStart(6)}  (avg ${avg})  ${kw}`);
    });
  }
  writeFileSync("seo-data/exports/girls-football-trends-estimate-2026-10-06.json", JSON.stringify(out, null, 2));
  console.log(`\nTotal cost $${cost.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

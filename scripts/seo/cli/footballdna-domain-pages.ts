// Follow-up to footballdna-post-rankings.ts: most of the seven posts picked
// for the mutual-promotion link ask rank for nothing, so pull footballdna.co.uk's
// ranked keywords (top 1000 by traffic) and group them by URL to find the
// posts that actually rank, i.e. better places to ask for a link.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/footballdna-domain-pages.ts
import { migrate } from "../database/migrate";
import { rankedKeywords } from "../dataforseo/endpoints/labs";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

type RankedRow = {
  keyword_data?: { keyword?: string; keyword_info?: { search_volume?: number } };
  ranked_serp_element?: { serp_item?: { etv?: number; rank_absolute?: number; url?: string } };
};

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log("Plan: 1 ranked_keywords call (limit 1000) for footballdna.co.uk. Rough estimated cost: ~$0.15.");
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }
  const ranked = await rankedKeywords("footballdna.co.uk", { workflow: "footballdna-domain-pages", environment: "live", confirmLive: true, limit: 1000, cacheFamily: "competitor_rankings" });
  if (ranked.error || !ranked.data) throw new Error(String(ranked.error));
  const rows = ((ranked.data.tasks?.[0]?.result as Array<{ items?: RankedRow[] }> | undefined)?.[0]?.items) ?? [];
  const byUrl = new Map<string, { etv: number; kws: RankedRow[] }>();
  for (const r of rows) {
    const url = r.ranked_serp_element?.serp_item?.url ?? "n/a";
    const e = byUrl.get(url) ?? { etv: 0, kws: [] };
    e.etv += r.ranked_serp_element?.serp_item?.etv ?? 0;
    e.kws.push(r);
    byUrl.set(url, e);
  }
  console.log(`${rows.length} rows, ${byUrl.size} URLs`);
  const sorted = [...byUrl.entries()].sort((a, b) => b[1].etv - a[1].etv);
  for (const [url, e] of sorted.slice(0, 60)) {
    const top = e.kws
      .sort((a, b) => (b.ranked_serp_element?.serp_item?.etv ?? 0) - (a.ranked_serp_element?.serp_item?.etv ?? 0))
      .slice(0, 4)
      .map((r) => `${r.keyword_data?.keyword} (#${r.ranked_serp_element?.serp_item?.rank_absolute}, ${r.keyword_data?.keyword_info?.search_volume})`)
      .join(" | ");
    console.log(`${e.etv.toFixed(0)} etv | ${e.kws.length} kws | ${url}\n    ${top}`);
  }
  console.log(`\nCost: $${(ranked.cost ?? 0).toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

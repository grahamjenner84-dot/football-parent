// Live UK SERP positions for statzoapp.com vs footballparent.co.uk on the
// queries Statzo's own page titles/headings target (read from its sitemap),
// including zero/unmeasured-volume phrasings ranked_keywords can't see.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/statzo-target-serp-check.ts
import { migrate } from "../database/migrate";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

type SerpItem = { type: string; rank_absolute?: number; domain?: string; url?: string; title?: string };

const QUERIES = [
  "best grassroots football app",
  "grassroots football app",
  "how to track your football stats",
  "how to track football stats",
  "track my child's football",
  "app to track my child's football",
  "football stats app for grassroots players",
  "grassroots football stats",
  "grassroots football manager app",
  "football stats app for coaches",
  "football stats tracker for parents",
  "kids football stats app",
  "football stats what do professionals track",
  "motivational football quotes for young players",
  "football quotes for kids",
  "football season stats for my son",
];
const WATCH = ["statzoapp.com", "footballparent.co.uk"];

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }
  let totalCost = 0;
  for (const q of QUERIES) {
    const r = await googleOrganicSerp(q, { workflow: "statzo-target-serp-check", environment: "live", confirmLive: true, depth: 30 });
    totalCost += r.cost ?? 0;
    const items = ((r.data as any)?.tasks?.[0]?.result?.[0]?.items ?? []) as SerpItem[];
    const organic = items.filter((i) => i.type === "organic");
    const hits = WATCH.map((d) => {
      const h = organic.find((i) => i.domain?.endsWith(d));
      return `${d.split(".")[0]}=${h ? `#${h.rank_absolute} ${h.url?.replace(/^https:\/\/(www\.)?[^/]+/, "")}` : "-"}`;
    });
    const top = organic.slice(0, 5).map((i) => i.domain).join(", ");
    console.log(`${q}\n   ${hits.join("  |  ")}\n   top5: ${top}`);
  }
  console.log(`\nTotal actual API-reported cost: $${totalCost.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

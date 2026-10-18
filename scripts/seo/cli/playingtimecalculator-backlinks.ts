// Full backlink list for playingtimecalculator.com, the #1 result for
// "playing time calculator". The 6 Sept summary (94 referring domains, spam
// score 43) was read as "mostly junk", but the .org skew and the two real
// clubs in the 28 Sept homepage sample suggested genuine club coach-resource
// links. This pulls every live backlink (243 at last count) in one call to
// see how many are real clubs, which sports and countries, and whether any
// UK clubs already link to it (warm outreach leads for our own calculator).
//
// Usage (after explicit user approval in-session):
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/playingtimecalculator-backlinks.ts
import fs from "node:fs";
import { migrate } from "../database/migrate";
import { backlinksList } from "../dataforseo/endpoints/backlinks";

type Link = {
  domain_from?: string;
  url_from?: string;
  url_to?: string;
  page_from_title?: string;
  anchor?: string;
  dofollow?: boolean;
  domain_from_rank?: number;
  backlink_spam_score?: number;
  domain_from_country?: string;
  page_from_language?: string;
  first_seen?: string;
};

const TARGET = "playingtimecalculator.com";
const OUT = "seo-data/exports/playingtimecalculator-backlinks-2026-10-04.json";

async function main() {
  migrate();

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  // 591 live backlinks by 4 Oct (243 on 6 Sept), so page through in 300s.
  const items: Link[] = [];
  let total = 0;
  let cost = 0;
  for (let offset = 0; offset === 0 || offset < total; offset += 300) {
    const result = await backlinksList(TARGET, { workflow: "playingtimecalculator-backlinks", environment: "live", confirmLive: true, limit: 300, offset });
    if (result.error || !result.data) {
      console.log(`failed at offset ${offset}: ${result.error}`);
      return;
    }
    cost += result.cost ?? 0;
    const res = result.data.tasks?.[0]?.result?.[0] as { total_count?: number; items?: Link[] } | undefined;
    total = res?.total_count ?? 0;
    items.push(...(res?.items ?? []));
  }
  fs.writeFileSync(OUT, JSON.stringify(items, null, 2));
  console.log(`total_count=${total} returned=${items.length} cost=$${cost.toFixed(4)} -> ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

// Step 3 of the girls' football research (2026-10-06). Google Ads
// search_volume returned null for ~95% of girls' phrasings (including
// "girls football" itself) while GSC shows real impressions on them, so
// this cross-checks a core set against DataForSEO's clickstream-based
// volume, which does not depend on Google Ads' suppression.
// SAFETY: three-factor live gate; Graham approved in-session 2026-10-06.
// Run: LIVE_CONFIRM=yes npx tsx scripts/seo/cli/girls-football-clickstream-check.ts
import { writeFileSync } from "node:fs";
import { migrate } from "../database/migrate";
import { dataForSeoRequest } from "../dataforseo/client";
import { ensureEnvLoaded } from "../shared/env";
import { DEFAULT_LOCATION_CODE, DEFAULT_LANGUAGE_CODE } from "../shared/normalise";

ensureEnvLoaded();

const KEYWORDS = [
  "girls football", "girls football near me", "girls football club near me", "girls football teams near me", "girls football clubs",
  "girls football team", "football for girls", "girls football academy", "girls football academy near me", "girls football trials",
  "girls football trials near me", "football trials for girls", "girls football camps", "girls football camps near me",
  "girls football training", "girls football training near me", "girls football coaching", "girls football drills",
  "wildcats football", "wildcats football near me", "fa wildcats", "squad girls football", "girls football league",
  "girls football tournaments", "what age can girls play football", "can girls play on boys football teams", "mixed football rules",
  "how to get my daughter into football", "how to become a female footballer", "how to become a professional female footballer",
  "wsl academy", "women's football academy", "arsenal girls academy", "chelsea girls academy", "man city girls academy",
  "manchester united girls academy", "tottenham girls academy", "liverpool girls academy", "girls etc", "etc football",
  "emerging talent centre", "girls rtc", "girls football pathway", "england girls football", "girls football scholarships",
  "football scholarship girls uk", "girls football college", "football schools for girls", "girls football boots",
  "best football boots for girls", "girls shin pads", "girls football kit", "football gifts for girls", "girls goalkeeper gloves",
  "playing football on your period", "why do girls stop playing football", "benefits of football for girls",
  "how to coach girls football", "coaching girls football", "girls futsal", "acl injury girls football", "girls football uk",
  "female footballers", "women's football near me", "ladies football near me", "female footballer salary", "women's football jobs",
];

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }
  const body = { keywords: KEYWORDS, location_code: DEFAULT_LOCATION_CODE, language_code: DEFAULT_LANGUAGE_CODE };
  const r = await dataForSeoRequest({
    workflow: "girls-football-clickstream-check",
    apiFamily: "keywords_data",
    cacheFamily: "google_ads_volume",
    endpoint: "keywords_data/clickstream_data/dataforseo_search_volume/live",
    body,
    environment: "live",
    confirmLive: true,
    seedTerms: KEYWORDS,
    locationCode: body.location_code,
    languageCode: body.language_code,
  });
  console.log(`cost=${r.cost} error=${r.error ?? "none"} status=${r.data?.tasks?.[0]?.status_message}`);
  const items = ((r.data?.tasks?.[0]?.result?.[0] as { items?: { keyword: string; search_volume: number | null }[] } | undefined)?.items ?? []);
  writeFileSync("seo-data/exports/girls-football-clickstream-2026-10-06.json", JSON.stringify(items, null, 2));
  for (const i of [...items].sort((a, b) => (b.search_volume ?? -1) - (a.search_volume ?? -1))) console.log(String(i.search_volume).padStart(6), i.keyword);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

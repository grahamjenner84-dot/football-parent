// Apples-to-apples comparison: same 4-phrase methodology used in
// club-development-centre-research.ts, applied to the two clubs we've
// already published (Fulham, Tottenham/Spurs) so their search-volume
// potential can be compared fairly against the new candidate shortlist -
// the cached keywords for these two used different ad-hoc phrasings, not
// this standardised set. GSC has no real traffic yet (pages published
// 2026-08-09, only 2 days old), so volume is the only real comparison
// available right now.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/fulham-spurs-compare.ts
import { migrate } from "../database/migrate";
import { getDb, nowIso } from "../database/db";
import { googleAdsSearchVolume } from "../dataforseo/endpoints/keywords_data";
import { keywordIdentity } from "../shared/normalise";
import { ensureEnvLoaded } from "../shared/env";

const CLUBS = ["Fulham", "Tottenham", "Spurs"];
const PHRASINGS = ["development centre", "academy trials", "youth academy", "pre academy"];

async function main() {
  ensureEnvLoaded();
  migrate();
  const db = getDb();

  const keywords = CLUBS.flatMap((c) => PHRASINGS.map((p) => `${c} ${p}`));
  console.log(`Requesting ${keywords.length} keywords (one batched request).`);

  const liveReady = process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires LIVE_CONFIRM=yes for this invocation.");
    return;
  }

  const result = await googleAdsSearchVolume(keywords, { workflow: "fulham-spurs-compare", environment: "live", confirmLive: true });
  console.log(`cacheStatus=${result.cacheStatus} cost=${result.cost} error=${result.error ?? "none"}`);
  if (result.error || !result.data) {
    console.error("Failed:", result.error);
    process.exitCode = 1;
    return;
  }

  const items = (result.data.tasks?.[0]?.result ?? []) as Array<{ keyword: string; search_volume: number | null; cpc: number | null }>;

  const upsertKeyword = db.prepare(
    `INSERT INTO keywords (keyword, normalised_keyword, search_engine, location_code, language_code, volume, source, cluster, keyword_type, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(normalised_keyword, search_engine, location_code, language_code) DO UPDATE SET
       volume = excluded.volume, source = excluded.source, cluster = excluded.cluster, keyword_type = excluded.keyword_type, updated_at = excluded.updated_at`
  );
  const now = nowIso();

  const byClub = new Map<string, number>();
  console.log("\n--- Results ---");
  for (const item of items) {
    if (!item.keyword) continue;
    console.log(`${item.keyword}: ${item.search_volume ?? 0}/mo`);
    const identity = keywordIdentity(item.keyword);
    upsertKeyword.run(item.keyword, identity.normalisedKeyword, identity.searchEngine, identity.locationCode, identity.languageCode, item.search_volume ?? null, "dataforseo_live", "Fulham/Spurs comparison (published pages)", "published_club_baseline", now, now);
    const club = CLUBS.find((c) => item.keyword.toLowerCase().startsWith(c.toLowerCase()));
    if (club) byClub.set(club, (byClub.get(club) ?? 0) + (item.search_volume ?? 0));
  }

  console.log("\n--- Combined per brand ---");
  for (const [club, total] of byClub) console.log(`${club}: ${total}/mo`);
  console.log(`\nFulham page total: ${byClub.get("Fulham") ?? 0}/mo`);
  console.log(`Tottenham page total (Tottenham + Spurs phrasing combined): ${(byClub.get("Tottenham") ?? 0) + (byClub.get("Spurs") ?? 0)}/mo`);
  console.log(`\nCost: $${result.cost}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

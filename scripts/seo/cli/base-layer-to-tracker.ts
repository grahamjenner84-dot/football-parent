// Registers the planned kids' football base layer article (research
// 2026-10-12, seo-data/exports/base-layer-research-2026-10-12.md) in the
// article tracker as status='planned'. Local only, no API calls.
// Run: npx tsx scripts/seo/cli/base-layer-to-tracker.ts
import { migrate } from "../database/migrate";
import { getDb, nowIso } from "../database/db";
import { exportArticleTracker } from "../exports/article-tracker";

const URL = "https://www.footballparent.co.uk/football-gear/best-football-base-layers-for-kids";

async function main() {
  migrate();
  const db = getDb();
  const now = nowIso();
  db.prepare(
    `INSERT INTO pages (url, article, category, primary_keyword, secondary_keywords, cluster, status, total_target_sv, priority, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'planned', ?, ?, ?, ?, ?)
     ON CONFLICT(url) DO UPDATE SET
       article = excluded.article, category = excluded.category, primary_keyword = excluded.primary_keyword,
       secondary_keywords = excluded.secondary_keywords, cluster = excluded.cluster,
       total_target_sv = excluded.total_target_sv, priority = excluded.priority,
       notes = excluded.notes, updated_at = excluded.updated_at`
  ).run(
    URL,
    "Football Skins for Kids: The Best Base Layers for Winter Football",
    "football-gear",
    "childrens base layer football",
    "football skins; football skins for juniors; football base layer; football thermals; under armour for football",
    "Football gear: winter kit",
    4870,
    "High",
    "Research 2026-10-12 (seo-data/exports/base-layer-research-2026-10-12.md, $0.17). Football-specific terms only; 'kids base layer' (1,900) is generic thermals/ski and excluded. SV = football skins 2,400 + childrens base layer football 880 + football base layer 880 + football thermals 390 + football skins for juniors 320. Peak November (football skins 6,600 in Nov 2025), rises Sept, holds Dec-Jan at ~half, trough Jun-Jul. KD 0 everywhere but page one is retailers (Decathlon, Direct Soccer, Kitlocker, Sports Direct, Forza, Amazon) with AI Overviews; publisher slots exist on the junior phrasing (soccerwares.com #10 for 'football skins for juniors'). Win on PAA: are skins the same as thermals, why do footballers wear skins, what to buy for kids, FA kit rules. IFAB Law 4.3: undershirt must match the main sleeve colour, undershorts/tights the shorts colour, same colour across the team (verified theifab.com). Snood football 880/mo (Nov 2,900): fold in as a section/FAQ, verify current snood ruling before writing. No cannibalisation: gloves guide gets only glove queries. Cross-link with gloves and shin pads guides.",
    now,
    now
  );
  console.log(`Registered ${URL}. Tracker exported to ${exportArticleTracker("csv")}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

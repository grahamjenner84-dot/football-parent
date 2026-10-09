// Adds the "start a grassroots team and find players" article to the article
// roadmap (pages table, status='planned') at Low priority, from the
// 2026-10-09 sizing research (coach-recruit-players-research.ts), then
// re-exports seo-data/exports/article-tracker.csv. Local DB only.
//
// Run: npx tsx scripts/seo/cli/add-start-team-roadmap-page.ts
import { migrate } from "../database/migrate";
import { getDb, nowIso } from "../database/db";
import { exportArticleTracker } from "../exports/article-tracker";

const URL = "https://www.footballparent.co.uk/coaching/how-to-start-a-grassroots-football-team";

function main() {
  migrate();
  const db = getDb();
  const now = nowIso();
  db.prepare(
    `INSERT INTO pages (url, article, category, primary_keyword, secondary_keywords, cluster, status, total_target_sv, priority, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'planned', ?, ?, ?, ?, ?)
     ON CONFLICT(url) DO UPDATE SET
       article = excluded.article, category = excluded.category, primary_keyword = excluded.primary_keyword,
       secondary_keywords = excluded.secondary_keywords, cluster = excluded.cluster, status = 'planned',
       total_target_sv = excluded.total_target_sv, priority = excluded.priority, notes = excluded.notes,
       updated_at = excluded.updated_at`
  ).run(
    URL,
    "How to Start a Grassroots Football Team and Find Players",
    "coaching",
    "how to start a youth football team",
    [
      "how to set up a football team",
      "how to start a kids football team",
      "how to recruit players for grassroots football",
      "how to find players for my football team",
      "how to get more players for my football team",
    ].join("; "),
    "Coaching: running a team",
    60,
    "Low",
    "Sizing research 2026-10-09 (seo-data/exports/coach-recruit-players-research-2026-10-09.json). " +
      "Start-a-team terms 30/mo each, KD 0, weak page one (FA PDF, Facebook, Quora, Spond) with an AI Overview. " +
      "Recruit-players phrasings have no Ads volume; GSC shows ~15-20/mo for 'how to recruit players for grassroots football' landing on the parent recruitment page. " +
      "'players wanted football' (110) is noticeboard intent, do not target. Natural Coach App mention.",
    now,
    now
  );
  console.log(`Added: ${URL}  [Low]. Tracker: ${exportArticleTracker("csv")}`);
}

main();

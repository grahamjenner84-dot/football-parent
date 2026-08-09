// Splits "football drills for 7 year olds" / "football drills for 8 year
// olds" out of the broad "Football Drills for Kids by Age" article into
// their own dedicated article - these are the only two keywords in that
// whole cluster with real, measurable UK volume (140/mo, 210/mo) and KD 0
// (uncontested), so a focused page has a better shot than burying them as
// one H2 among many in a broad by-age piece. Retargets the two keywords so
// the two pages don't end up competing for the same terms (cannibalisation).
// Local only, no live API calls.
import { migrate } from "../database/migrate";
import { getDb, nowIso } from "../database/db";
import { linkPageKeyword } from "../dataforseo/persist-results";
import { keywordIdentity } from "../shared/normalise";
import { exportArticleTracker } from "../exports/article-tracker";

const SITE = "https://www.footballparent.co.uk";
const DRILLS_URL = `${SITE}/football-development/football-drills-for-kids-by-age`;
const NEW_URL = `${SITE}/football-development/football-drills-for-7-and-8-year-olds`;
const SPLIT_KEYWORDS = ["football drills for 7 year olds", "football drills for 8 year olds"];

async function main() {
  migrate();
  const db = getDb();
  const now = nowIso();

  // 1. Register the new dedicated article.
  db.prepare(
    `INSERT INTO pages (url, article, category, primary_keyword, secondary_keywords, cluster, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'planned', ?, ?, ?)
     ON CONFLICT(url) DO UPDATE SET
       article = excluded.article, category = excluded.category, primary_keyword = excluded.primary_keyword,
       secondary_keywords = excluded.secondary_keywords, cluster = excluded.cluster,
       notes = excluded.notes, updated_at = excluded.updated_at`
  ).run(
    NEW_URL,
    "Ball Mastery Drills for 7 and 8 Year Olds: A Parent's At-Home Guide",
    "football-development",
    "football drills for 7 year olds",
    "football drills for 8 year olds; ball mastery drills for kids; football skills for 7 year olds; football skills for 8 year olds",
    "Parent-coach: drills",
    "Full research brief: seo-data/exports/content-plan-fulham-spurs-drills-coaching.md. Split out of the broader 'Football Drills for Kids by Age' article - these two keywords are the only real, measured volume in that whole cluster (140/mo + 210/mo, KD 0, 8yo has notably high £5.29 CPC). Cross-link both ways with the by-age article rather than duplicating coverage.",
    now,
    now
  );

  // 2. Retarget the two keywords to the new article and mark them primary there.
  for (const kw of SPLIT_KEYWORDS) {
    const identity = keywordIdentity(kw);
    db.prepare("UPDATE keywords SET target_url = ?, mapped_article = ?, updated_at = ? WHERE normalised_keyword = ?").run(
      NEW_URL,
      "Ball Mastery Drills for 7 and 8 Year Olds: A Parent's At-Home Guide",
      now,
      identity.normalisedKeyword
    );
    const row = db.prepare("SELECT id FROM keywords WHERE normalised_keyword = ?").get(identity.normalisedKeyword) as { id: number } | undefined;
    if (row) {
      // Drop the old page_keywords link to the by-age article, add the new one.
      db.prepare("DELETE FROM page_keywords WHERE keyword_id = ?").run(row.id);
      linkPageKeyword(NEW_URL, row.id, "primary");
    }
  }

  // 3. Update article 4's secondary_keywords string to drop the two split terms.
  const drillsPage = db.prepare("SELECT secondary_keywords FROM pages WHERE url = ?").get(DRILLS_URL) as { secondary_keywords: string | null } | undefined;
  if (drillsPage?.secondary_keywords) {
    const remaining = drillsPage.secondary_keywords
      .split(";")
      .map((s) => s.trim())
      .filter((s) => !SPLIT_KEYWORDS.includes(s.toLowerCase()));
    db.prepare("UPDATE pages SET secondary_keywords = ?, notes = ?, updated_at = ? WHERE url = ?").run(
      remaining.join("; "),
      "Full research brief: seo-data/exports/content-plan-fulham-spurs-drills-coaching.md. Real vol on the generic primary is 0 (estimate of 1500-3000 was wrong). The two age-7/8 keywords that DID have real volume were split into their own dedicated article (/football-development/football-drills-for-7-and-8-year-olds) rather than competing here - cross-link both ways. 'passing drills football' (2900/mo) added as a live secondary opportunity.",
      now,
      DRILLS_URL
    );
  }

  // 4. Recompute total_target_sv for both pages from their current, non-'related' keyword rows.
  const sumVolume = db.prepare(
    `SELECT COALESCE(SUM(volume), 0) as total FROM keywords WHERE target_url = ? AND (keyword_type IS NULL OR keyword_type != 'related')`
  );
  for (const url of [DRILLS_URL, NEW_URL]) {
    const total = (sumVolume.get(url) as { total: number }).total;
    db.prepare("UPDATE pages SET total_target_sv = ?, updated_at = ? WHERE url = ?").run(total, nowIso(), url);
    const row = db.prepare("SELECT article, total_target_sv FROM pages WHERE url = ?").get(url) as { article: string; total_target_sv: number };
    console.log(`${row.article}: total_target_sv=${row.total_target_sv}`);
  }

  const outPath = exportArticleTracker("csv");
  console.log(`\nArticle tracker re-exported to: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

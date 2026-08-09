// Registers the 5 planned articles (Fulham/Tottenham dev centres, home
// practice, drills by age, coach your own child) in the pages/article
// tracker as status='planned', so they show up in seo-data/exports/article-tracker.csv
// and don't only exist as chat history. Real combined volume comes from the
// keywords already persisted by content-plan-fulham-spurs-drills-coaching.ts
// and content-plan-related-faqs.ts. No live API calls - local only.
import { migrate } from "../database/migrate";
import { getDb, nowIso } from "../database/db";
import { linkPageKeyword } from "../dataforseo/persist-results";
import { keywordIdentity } from "../shared/normalise";
import { exportArticleTracker } from "../exports/article-tracker";

const SITE = "https://www.footballparent.co.uk";

const ARTICLES: {
  url: string;
  title: string;
  category: string;
  primary: string;
  secondary: string[];
  cluster: string;
  notes: string;
}[] = [
  {
    url: `${SITE}/academy-pathway/fulham-fc-development-centre-guide`,
    title: "Fulham FC Development Centre: A Parent's Guide",
    category: "academy-pathway",
    primary: "fulham development centre",
    secondary: ["fulham player pathway", "fulham foundation football", "how to join fulham academy", "fulham academy trials", "fulham pre academy"],
    cluster: "London club development centres",
    notes:
      "Full research brief: seo-data/exports/content-plan-fulham-spurs-drills-coaching.md. Real combined vol ~250/mo, KD 0 on primary. Related searches surfaced 'Fulham Girls Development Centre' (not in original H2 plan - consider adding) and 'Brentford Development Centre' as a possible 6th club guide. PAA: 'Is Fulham a good academy?'",
  },
  {
    url: `${SITE}/academy-pathway/tottenham-development-centres-explained`,
    title: "Tottenham Hotspur Development Centres Explained",
    category: "academy-pathway",
    primary: "tottenham development centre",
    secondary: [
      "spurs academy trials",
      "how to join tottenham academy",
      "tottenham academy development centres",
      "spurs development centre",
      "tottenham player development programme",
    ],
    cluster: "London club development centres",
    notes:
      "Full research brief: seo-data/exports/content-plan-fulham-spurs-drills-coaching.md. Real combined vol ~90/mo (estimate of 600-1200 was well off), KD 0 on primary. Related searches use 'Tottenham Elite Development Centre' naming - verify against original plan's 'Academy Development Centres' framing before publishing. related keyword_ideas surfaced chelsea/west ham development centre as cross-link validation.",
  },
  {
    url: `${SITE}/football-development/practise-football-with-your-child-at-home`,
    title: "How to Practise Football With Your Child at Home",
    category: "football-development",
    primary: "how to practise football with your child at home",
    secondary: ["football practice at home for kids", "helping my child improve at football", "backyard football practice", "football skills to practise at home"],
    cluster: "Parent-coach: home practice",
    notes:
      "Full research brief: seo-data/exports/content-plan-fulham-spurs-drills-coaching.md. Google Ads volume null on every exact phrasing, but real PAA confirms genuine search intent ('How to get better at football as a kid at home?', 'How to practice football at home by yourself?'). Related searches show demand for video content - consider embedding/linking video.",
  },
  {
    url: `${SITE}/football-development/football-drills-for-kids-by-age`,
    title: "Football Drills for Kids by Age",
    category: "football-development",
    primary: "football drills for kids",
    secondary: [
      "football drills for 7 year olds",
      "football drills for 8 year olds",
      "football drills for u8s",
      "easy football drills at home",
      "football dribbling drills for kids",
      "football passing drills for kids",
    ],
    cluster: "Parent-coach: drills",
    notes:
      "Full research brief: seo-data/exports/content-plan-fulham-spurs-drills-coaching.md. Generic primary 'football drills for kids' has ZERO measured volume (estimate of 1500-3000 was wrong) - real demand is age-specific: 7yo 140/mo, 8yo 210/mo (both KD 0, 8yo has high £5.29 CPC). Related searches confirm 5-7yo age banding + PDF/printable demand + 'passing drills football' (2900/mo) as an extra secondary. Reframe article around age bands, not the generic term.",
  },
  {
    url: `${SITE}/coaching/should-you-coach-your-own-child`,
    title: "Should You Coach Your Own Child?",
    category: "coaching",
    primary: "coaching your own child football",
    secondary: ["should i coach my child's football team", "being a parent coach", "coaching your own kid", "treating your child fairly as a coach"],
    cluster: "Parent-coach: coaching your own kid",
    notes:
      "Full research brief: seo-data/exports/content-plan-fulham-spurs-drills-coaching.md. Google Ads volume null on every exact phrasing (consistent with prior research on this topic). Two strong real PAA hits with citable sources: 'Should parents coach their own children?' (appliedsportpsych.org) and 'What qualifications do you need to coach children football?' (FA Playmaker/Intro to Coaching).",
  },
];

async function main() {
  migrate();
  const db = getDb();

  const upsertPage = db.prepare(
    `INSERT INTO pages (url, article, category, primary_keyword, secondary_keywords, cluster, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'planned', ?, ?, ?)
     ON CONFLICT(url) DO UPDATE SET
       article = excluded.article, category = excluded.category, primary_keyword = excluded.primary_keyword,
       secondary_keywords = excluded.secondary_keywords, cluster = excluded.cluster,
       status = CASE WHEN pages.status IS NULL THEN 'planned' ELSE pages.status END,
       notes = excluded.notes, updated_at = excluded.updated_at`
  );
  const getKeywordId = db.prepare(
    "SELECT id FROM keywords WHERE normalised_keyword = ? AND search_engine = ? AND location_code = ? AND language_code = ?"
  );
  // Only sums the primary/secondary keywords actually being targeted -
  // excludes keyword_type='related' rows (the keyword_ideas discovery
  // output), which include broad-match junk with huge irrelevant volumes
  // (e.g. "trafford centre" at 673k/mo) that would otherwise swamp the total.
  const sumVolume = db.prepare(`
    SELECT COALESCE(SUM(volume), 0) as total
    FROM keywords
    WHERE target_url = ? AND (keyword_type IS NULL OR keyword_type != 'related')
  `);

  for (const a of ARTICLES) {
    const now = nowIso();
    upsertPage.run(a.url, a.title, a.category, a.primary, a.secondary.join("; "), a.cluster, a.notes, now, now);

    const primaryIdentity = keywordIdentity(a.primary);
    const primaryId = getKeywordId.get(
      primaryIdentity.normalisedKeyword,
      primaryIdentity.searchEngine,
      primaryIdentity.locationCode,
      primaryIdentity.languageCode
    ) as { id: number } | undefined;
    if (primaryId) linkPageKeyword(a.url, primaryId.id, "primary");

    for (const s of a.secondary) {
      const identity = keywordIdentity(s);
      const row = getKeywordId.get(identity.normalisedKeyword, identity.searchEngine, identity.locationCode, identity.languageCode) as
        | { id: number }
        | undefined;
      if (row) linkPageKeyword(a.url, row.id, "secondary");
    }

    const total = (sumVolume.get(a.url) as { total: number }).total;
    db.prepare("UPDATE pages SET total_target_sv = ?, updated_at = ? WHERE url = ?").run(total, nowIso(), a.url);
    console.log(`Registered: ${a.title} (${a.url}) - total_target_sv=${total}`);
  }

  const outPath = exportArticleTracker("csv");
  console.log(`\nArticle tracker exported to: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

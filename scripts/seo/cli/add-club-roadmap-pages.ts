// Adds the 11 club-development-centre opportunities from the 2026-08-11
// research session (club-development-centre-research.ts +
// club-development-centre-serp-check.ts + club-development-centre-kd-check.ts)
// to the article roadmap (pages table, status='planned' - same status the
// existing Fulham/Tottenham guides carry). No live API calls, local DB only.
//
// Run: npx tsx scripts/seo/cli/add-club-roadmap-pages.ts
import { migrate } from "../database/migrate";
import { getDb, nowIso } from "../database/db";

const SITE_URL = "https://www.footballparent.co.uk";
const RESEARCH_NOTE = "Club dev-centre opportunity scan 2026-08-11: real UK search volume + SERP/PAA intent check + KD, see chat log";

type Roadmap = {
  slug: string;
  club: string;
  league: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  totalTargetSv: number;
  priority: "Highest" | "High" | "Medium";
};

const ROADMAP: Roadmap[] = [
  { slug: "leeds-united-development-centre-guide", club: "Leeds United", league: "Premier League", primaryKeyword: "Leeds United youth academy", secondaryKeywords: ["Leeds United academy trials", "Leeds United development centre"], totalTargetSv: 1040, priority: "Highest" },
  { slug: "brentford-development-centre-guide", club: "Brentford", league: "Premier League", primaryKeyword: "Brentford academy trials", secondaryKeywords: ["Brentford youth academy", "Brentford development centre"], totalTargetSv: 330, priority: "High" },
  { slug: "aston-villa-development-centre-guide", club: "Aston Villa", league: "Premier League", primaryKeyword: "Aston Villa academy trials", secondaryKeywords: ["Aston Villa development centre", "Aston Villa youth academy"], totalTargetSv: 280, priority: "High" },
  { slug: "watford-development-centre-guide", club: "Watford", league: "Championship", primaryKeyword: "Watford academy trials", secondaryKeywords: ["Watford development centre", "Watford youth academy"], totalTargetSv: 220, priority: "High" },
  { slug: "manchester-united-development-centre-guide", club: "Manchester United", league: "Premier League", primaryKeyword: "Manchester United academy trials", secondaryKeywords: ["Manchester United youth academy", "Manchester United development centre"], totalTargetSv: 180, priority: "High" },
  { slug: "charlton-athletic-development-centre-guide", club: "Charlton Athletic", league: "Championship", primaryKeyword: "Charlton Athletic academy trials", secondaryKeywords: ["Charlton Athletic youth academy", "Charlton Athletic development centre"], totalTargetSv: 170, priority: "High" },
  { slug: "coventry-city-development-centre-guide", club: "Coventry City", league: "Premier League", primaryKeyword: "Coventry City academy trials", secondaryKeywords: ["Coventry City development centre", "Coventry City youth academy"], totalTargetSv: 160, priority: "High" },
  { slug: "millwall-development-centre-guide", club: "Millwall", league: "Championship", primaryKeyword: "Millwall academy trials", secondaryKeywords: ["Millwall youth academy", "Millwall development centre"], totalTargetSv: 160, priority: "High" },
  { slug: "southampton-development-centre-guide", club: "Southampton", league: "Championship", primaryKeyword: "Southampton academy trials", secondaryKeywords: ["Southampton youth academy", "Southampton development centre"], totalTargetSv: 150, priority: "Medium" },
  { slug: "manchester-city-development-centre-guide", club: "Manchester City", league: "Premier League", primaryKeyword: "Manchester City youth academy", secondaryKeywords: ["Manchester City academy trials", "Manchester City development centre"], totalTargetSv: 140, priority: "Medium" },
  { slug: "wrexham-development-centre-guide", club: "Wrexham", league: "Championship", primaryKeyword: "Wrexham academy trials", secondaryKeywords: ["Wrexham youth academy", "Wrexham development centre"], totalTargetSv: 140, priority: "Medium" },
];

function main() {
  migrate();
  const db = getDb();

  const upsert = db.prepare(
    `INSERT INTO pages (url, article, category, primary_keyword, secondary_keywords, cluster, status, total_target_sv, priority, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'planned', ?, ?, ?, ?, ?)
     ON CONFLICT(url) DO UPDATE SET
       article = excluded.article, category = excluded.category, primary_keyword = excluded.primary_keyword,
       secondary_keywords = excluded.secondary_keywords, cluster = excluded.cluster, status = 'planned',
       total_target_sv = excluded.total_target_sv, priority = excluded.priority, notes = excluded.notes,
       updated_at = excluded.updated_at`
  );

  const now = nowIso();
  for (const r of ROADMAP) {
    const url = `${SITE_URL}/academy-pathway/${r.slug}`;
    const article = `${r.club} Development Centre: A Parent's Guide`;
    upsert.run(
      url,
      article,
      "Academy Pathway",
      r.primaryKeyword,
      r.secondaryKeywords.join("; "),
      `${r.club} Development Centre`,
      r.totalTargetSv,
      r.priority,
      `${RESEARCH_NOTE}. ${r.league}.`,
      now,
      now
    );
    console.log(`Added: ${url}  [${r.priority}, ${r.totalTargetSv}/mo]`);
  }

  console.log(`\n${ROADMAP.length} roadmap rows upserted into pages (status='planned').`);
}

main();

// Registers the football-rebounder content gap found during the 2026-09-19
// live DataForSEO research (search volume, keyword difficulty, related
// keywords and a real SERP pull for both "kids football goals" and "football
// rebounder", run while researching the just-published best-football-goals-
// for-kids article and comparing it against rebounders as an easier niche).
// Title/angle revised same session after Graham questioned the original
// "QuickPlay vs Decathlon vs Forza" framing - a follow-up SERP check on
// "football rebounder wall" / "best football rebounder wall" showed boards
// vs nets is a real, distinct product split (QuickPlay's own REPLAY Station
// is sold as a "Rebound Board", Forza sells a "Rebound Wall"), and that
// "best football rebounder wall" has an even richer content SERP than "best
// football rebounder" alone (footballmastery.co.uk's ranked board list and
// Soccer Store's buyer's guide both already rank there, plus Soccer Store
// runs a *separate* "5 Best Football Rebounder Nets" listicle - confirming
// two genuine sub-categories, not one). The brand-suffix queries
// ("football rebounder decathlon"/"argos") were confirmed navigational
// dead ends (each SERP is dominated by that retailer's own domain), so
// dropped from the title entirely rather than kept as a framing device.
// Same pattern as content-plan-gear-trends.ts - upserts into the pages
// tracker as status='planned' so it shows up in
// seo-data/exports/article-tracker.csv.
import { migrate } from "../database/migrate";
import { getDb, nowIso } from "../database/db";
import { exportArticleTracker } from "../exports/article-tracker";

const SITE = "https://www.footballparent.co.uk";

const ARTICLES: {
  url: string;
  title: string;
  category: string;
  primary: string;
  secondary: string[];
  cluster: string;
  priority: string;
  notes: string;
}[] = [
  {
    url: `${SITE}/football-gear/best-football-rebounders-for-kids`,
    title: "Best Football Rebounders for Kids: Rebound Boards vs Net Rebounders",
    category: "football-gear",
    primary: "best football rebounder",
    secondary: ["football rebounder wall", "football rebound wall", "best football rebounder wall", "football rebounder"],
    cluster: "Football gear: rebounders",
    priority: "Medium",
    notes:
      "Live DataForSEO research 2026-09-19 (search volume, bulk_keyword_difficulty, related_keywords, and 4 real SERP pulls across two rounds, ~$0.45 total spend, approved in-session). Volumes: 'football rebounder' 5,400/mo (KD 0, HIGH ads competition), 'football rebounder wall' 320/mo (KD 0) and the close variant 'football rebound wall' independently confirmed at 320/mo (KD 0), 'best football rebounder' 170/mo (KD 0), 'football rebounder decathlon' 110/mo (KD 0), 'football rebounder argos' 110/mo (KD 0), 'football rebounder amazon' 50/mo, 'best football rebounder uk' 50/mo, 'football rebounder forza' 30/mo, 'football rebounder costco' 10/mo (KD 43, the one outlier). 'best football rebounder wall' and 'football rebounder wall for kids' returned null exact-match Ads volume, same 'kids X' / modifier-stacking null pattern seen elsewhere on this site (e.g. 'kids football goals'), not a sign the term is dead. "
      + "Originally considered as a possibly-easier niche than football goals, but the real SERP pull for the flat 'football rebounder' head term showed it is at least as retailer-dominated as goals, and more so: top 10 was Soccer Store, QuickPlay, Forza, Argos, Decathlon, pricespy, Samba, Amazon/Football Flick, Net World Sports - zero editorial/content sites at all, versus goals' SERP which had one (the Independent). The brand-suffix queries ('football rebounder decathlon'/'argos') are navigational dead ends, not review intent - their SERPs are each dominated by that retailer's own domain, same finding as 'football goals forza'/'football goals argos'. An initial title built around 'QuickPlay vs Decathlon vs Forza' was drafted on this basis but dropped after Graham questioned it (see file header) - it didn't actually target any researched keyword, since none of the brand-pair phrasings have real standalone volume. "
      + "Follow-up SERP check on 'football rebounder wall' and 'best football rebounder wall' found something better: rebound boards/panels (QuickPlay REPLAY Station family, Forza 'Rebound Wall', Soccer Store 'XL Football Rebound Board') are a genuine, distinct product type from net-frame rebounders (QuickPlay SPOT/TEKKERS) - both have their own 'best of' content already ranking (footballmastery.co.uk's 'Best Football Rebound Boards of 2025 Ranked', Soccer Store's 'Football Rebounders: A Comprehensive Buyer's Guide', and a *separate* Soccer Store 'The 5 Best Football Rebounder Nets' listicle on the plain wall SERP). This is a richer content SERP than 'best football rebounder' alone had, and a real board-vs-net structural split to write into the article (mirrors the Pop-Up vs Folding section structure that worked for the goals article). "
      + "Revised angle: a genuine boards-vs-nets buying guide, not a brand-narrative comparison and not a flat 'best X' listicle - covering both product types with real picks (QuickPlay REPLAY Station / REPLAY Station XL for boards - real, working affiliate links already in place via ?ref=footballparent, confirmed live 2026-09-19 - plus a genuine net-style pick). "
      + "Not seasonally researched yet (unlike the goals/Christmas-gifts/SG-boots pieces, no Google Trends seasonality pull has been run for 'football rebounder' terms) - do that before committing to a publish deadline. Priority set to Medium rather than High: real, modest, currently-untouched volume and a genuine content gap, but no seasonal urgency identified yet and meaningfully smaller total addressable volume than the goals cluster.",
  },
];

async function main() {
  migrate();
  const db = getDb();

  const upsertPage = db.prepare(
    `INSERT INTO pages (url, article, category, primary_keyword, secondary_keywords, cluster, status, priority, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'planned', ?, ?, ?, ?)
     ON CONFLICT(url) DO UPDATE SET
       article = excluded.article, category = excluded.category, primary_keyword = excluded.primary_keyword,
       secondary_keywords = excluded.secondary_keywords, cluster = excluded.cluster,
       status = CASE WHEN pages.status IS NULL THEN 'planned' ELSE pages.status END,
       priority = excluded.priority, notes = excluded.notes, updated_at = excluded.updated_at`
  );

  for (const a of ARTICLES) {
    const now = nowIso();
    upsertPage.run(a.url, a.title, a.category, a.primary, a.secondary.join("; "), a.cluster, a.priority, a.notes, now, now);
    console.log(`Registered: ${a.title} (${a.url}) - priority=${a.priority}`);
  }

  const outPath = exportArticleTracker("csv");
  console.log(`\nArticle tracker exported to: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

// Registers the gear-content gaps found by the 2026-09-12/13 Google Trends
// seasonality + related-queries research (kids shin pads, football boots by
// sole type, garden goals, Christmas gifts, training cones) in the
// pages/article tracker as status='planned', so they show up in
// seo-data/exports/article-tracker.csv alongside the existing planned pieces
// rather than only existing as chat history. best-football-boots-for-kids
// has since been written and its tracker row moved to status='published'
// separately - this script's ARTICLES list intentionally still describes it
// as originally planned, for a record of why it was prioritised.
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
    url: `${SITE}/football-gear/best-football-boots-for-kids`,
    title: "Best Football Boots for Kids (2026 Buying Guide)",
    category: "football-gear",
    primary: "best football boots for kids",
    secondary: ["kids football boots", "junior football boots", "best kids football"],
    cluster: "Football gear: boots",
    priority: "High",
    notes:
      "Google Trends research 2026-09-12: 'kids football boots' hit an all-time 12-month high (100/100) this September (new-season kit buying), with a secondary peak last November. Site has wide-feet and AG-vs-FG angles but no general boots roundup - real gap. Publish ASAP to still catch this year's tail and rank ahead of next year's Aug/Sep peak. No Google Ads volume pulled yet (Trends relative interest only) - check real volume before finalising scope. WRITTEN 2026-09-13, see its own tracker row (status=published) for the finished article's notes.",
  },
  {
    url: `${SITE}/football-gear/soft-ground-vs-firm-ground-football-boots`,
    title: "Soft Ground vs Firm Ground Football Boots for Kids",
    category: "football-gear",
    primary: "soft ground football boots",
    secondary: ["firm ground football boots", "best soft ground football boots", "best firm ground football boots"],
    cluster: "Football gear: boots",
    priority: "High",
    notes:
      "Google Trends research 2026-09-12: FG boots peak Aug-Sep (74/100), SG boots peak in NOVEMBER (49.2) not February as originally assumed - troughs Feb/summer instead. No related-queries panel available for either term (too low volume for Trends to report one), so this reads as genuinely long-tail. Needs to be live by early-mid Oct to catch the Nov SG peak (indexing lead time). DECISION NEEDED before writing: standalone new page (this URL) vs. adding an SG section to the existing ag-vs-fg-boots.mdx and retitling it AG/FG/SG - the latter avoids cannibalising that page's soleplate-comparison intent. Lean toward extending the existing article unless scoping shows the SG angle needs its own page. No Google Ads volume checked yet. Note: the new best-football-boots-for-kids hub article (2026-09-13) already gives SG a short factual mention (kids' sizes are genuinely stocked by major retailers, metal studs banned on artificial turf, FA Law 4 requires a referee danger-check but sets no explicit stud rule) - don't duplicate that explainer here, this piece's job is the FG-vs-SG surface decision in depth.",
  },
  {
    url: `${SITE}/football-gear/best-football-goals-for-kids`,
    title: "Best Football Goals for Kids (Garden Goals Buying Guide)",
    category: "football-gear",
    primary: "kids football goals",
    secondary: ["football goals for garden", "pop up football goals", "forza football goals"],
    cluster: "Football gear: garden goals",
    priority: "High",
    notes:
      "Google Trends research 2026-09-12/13: 'kids football goals' has two peaks - Nov-Dec (Christmas gift, 75-86/100) and Jun-Aug (summer garden play, 77-83/100) - currently past this year's summer peak and in the seasonal trough before the Christmas one (weekly data peaked 22 Aug at 100, down to 51 by 12 Sep - matches the same Sep dip seen in 2025 before the Nov rise, so this is NOT currently trending up despite looking that way from a same-day glance). Related-queries panel: genuine top co-searches are 'pop up football goals' (a real product-type distinction to cover explicitly) and 'forza football goals' (the recurring brand name people search alongside this term) - both worth naming in the article. Also surfaced 'goals football party' - a kids'-party gift angle worth a line. No page currently covers this at all - real gap. Must be live by early-mid Oct to have indexing lead time before the Nov peak. No Google Ads volume checked yet.",
  },
  {
    url: `${SITE}/football-gear/christmas-football-gifts-for-kids`,
    title: "Christmas Football Gifts for Kids: Stocking Fillers to Big-Ticket Ideas",
    category: "football-gear",
    primary: "football gifts for kids",
    secondary: ["football gifts", "christmas football gifts"],
    cluster: "Football gear: Christmas gifts",
    priority: "High",
    notes:
      "Google Trends research 2026-09-12: 'football gifts' peaks in November (67.4/100) and decays through December - narrow, time-boxed window. No dedicated gift-guide article exists. Must publish by early-mid Oct to get 3-4 weeks of full-strength ranking before the window closes; push via newsletter/social once live, this is the shortest seasonal window of the year so organic alone may not be enough. No Google Ads volume checked yet (both secondary terms too low-volume for Trends to report a related-queries panel).",
  },
  {
    url: `${SITE}/football-gear/best-football-training-cones-for-kids`,
    title: "Best Football Training Cones for Kids",
    category: "football-gear",
    primary: "football training cones",
    secondary: ["cones for football training", "agility cones"],
    cluster: "Football gear: training kit",
    priority: "Low",
    notes:
      "FUTURE / not urgent. Google Trends research 2026-09-12: 'football cones' stays fairly flat/present all year (57-86/100) with a gentle Jun-Jul pre-season-training bump, rather than a sharp seasonal spike - real but modest and un-timed demand. Related-queries confirms clean intent ('football cones', 'football training cones', no contamination) but 'cones for training'/'agility cones' individually are too low-volume for a related-queries panel. Not worth a rushed dedicated page now; revisit if training-kit content becomes a priority, or fold a short buying section into an existing coaching/training-kit article in the meantime rather than spinning up a standalone page for thin, non-seasonal volume.",
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

// Keyword research to firm up the 5-article content plan (Fulham + Tottenham
// development-centre guides, home-practice, drills-by-age, coaching your own
// child) with real DataForSEO numbers in place of the estimated ranges.
// "football drills for kids" already has a real live volume reading (null)
// from 2026-07-31 - not re-requested for volume, but included in the
// difficulty call since that's a different endpoint. Age-specific drill
// variants (7/8 year olds) added per user request as a possible separate
// ball-mastery-at-home angle.
//
// Usage (after explicit user approval in-session):
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/content-plan-fulham-spurs-drills-coaching.ts
import { migrate } from "../database/migrate";
import { getDb, nowIso } from "../database/db";
import { googleAdsSearchVolume } from "../dataforseo/endpoints/keywords_data";
import { bulkKeywordDifficulty } from "../dataforseo/endpoints/labs";
import { upsertKeywordWithMetrics } from "../dataforseo/persist-results";
import { keywordIdentity } from "../shared/normalise";

type SearchVolumeItem = { keyword: string; search_volume: number | null; cpc: number | null; competition: string | null };
type DifficultyItem = { keyword: string; keyword_difficulty: number | null };

const ARTICLES: { url: string; title: string; primary: string; secondary: string[] }[] = [
  {
    url: "/academy-pathway/fulham-fc-development-centre-guide",
    title: "Fulham FC Development Centre: A Parent's Guide",
    primary: "fulham development centre",
    secondary: ["fulham player pathway", "fulham foundation football", "how to join fulham academy", "fulham academy trials", "fulham pre academy"],
  },
  {
    url: "/academy-pathway/tottenham-development-centres-explained",
    title: "Tottenham Hotspur Development Centres Explained",
    primary: "tottenham development centre",
    secondary: [
      "spurs academy trials",
      "how to join tottenham academy",
      "tottenham academy development centres",
      "spurs development centre",
      "tottenham player development programme",
    ],
  },
  {
    url: "/football-development/practise-football-with-your-child-at-home",
    title: "How to Practise Football With Your Child at Home",
    primary: "how to practise football with your child at home",
    secondary: ["football practice at home for kids", "helping my child improve at football", "backyard football practice", "football skills to practise at home"],
  },
  {
    url: "/football-development/football-drills-for-kids-by-age",
    title: "Football Drills for Kids by Age",
    primary: "football drills for kids",
    secondary: [
      "football drills for 7 year olds",
      "football drills for 8 year olds",
      "football drills for u8s",
      "easy football drills at home",
      "football dribbling drills for kids",
      "football passing drills for kids",
    ],
  },
  {
    url: "/coaching/should-you-coach-your-own-child",
    title: "Should You Coach Your Own Child?",
    primary: "coaching your own child football",
    secondary: ["should i coach my child's football team", "being a parent coach", "coaching your own kid", "treating your child fairly as a coach"],
  },
];

const KNOWN_NULL_VOLUME = new Set(["football drills for kids"]);

const VOLUME_KEYWORDS = Array.from(
  new Set(ARTICLES.flatMap((a) => [a.primary, ...a.secondary]).filter((k) => !KNOWN_NULL_VOLUME.has(k)))
);

const DIFFICULTY_KEYWORDS = Array.from(
  new Set([...ARTICLES.map((a) => a.primary), "football drills for 7 year olds", "football drills for 8 year olds"])
);

async function main() {
  migrate();
  const db = getDb();

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(`Search volume keywords: ${VOLUME_KEYWORDS.length}. Difficulty keywords: ${DIFFICULTY_KEYWORDS.length}.`);
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  let totalCost = 0;

  const volResult = await googleAdsSearchVolume(VOLUME_KEYWORDS, {
    workflow: "content-plan-fulham-spurs-drills-coaching",
    environment: "live",
    confirmLive: true,
  });
  console.log(`\n[search_volume] cacheStatus=${volResult.cacheStatus} cost=${volResult.cost} error=${volResult.error ?? "none"}`);
  totalCost += volResult.cost ?? 0;
  if (volResult.error || !volResult.data) {
    console.error("search_volume failed, aborting:", volResult.error);
    process.exitCode = 1;
    return;
  }
  const volRawRow = db.prepare("SELECT id FROM raw_responses WHERE request_hash = ?").get(volResult.requestHash) as { id: number } | undefined;
  const volItems = (volResult.data.tasks?.[0]?.result ?? []) as SearchVolumeItem[];
  const volByKeyword = new Map(volItems.filter((i) => i.keyword).map((i) => [i.keyword.toLowerCase(), i]));

  for (const article of ARTICLES) {
    for (const k of [article.primary, ...article.secondary]) {
      if (KNOWN_NULL_VOLUME.has(k)) continue;
      const v = volByKeyword.get(k.toLowerCase());
      upsertKeywordWithMetrics({
        keyword: k,
        volume: v?.search_volume ?? null,
        cpc: v?.cpc ?? null,
        competition: v?.competition ?? null,
        source: "dataforseo_live",
        targetUrl: article.url,
        mappedArticle: article.title,
        isSandbox: false,
        rawResponseId: volRawRow?.id ?? null,
      });
    }
  }

  const kdResult = await bulkKeywordDifficulty(DIFFICULTY_KEYWORDS, {
    workflow: "content-plan-fulham-spurs-drills-coaching",
    environment: "live",
    confirmLive: true,
  });
  console.log(`[keyword_difficulty] cacheStatus=${kdResult.cacheStatus} cost=${kdResult.cost} error=${kdResult.error ?? "none"}`);
  totalCost += kdResult.cost ?? 0;

  const kdByKeyword = new Map<string, number | null>();
  if (!kdResult.error && kdResult.data) {
    const kdRawRow = db.prepare("SELECT id FROM raw_responses WHERE request_hash = ?").get(kdResult.requestHash) as { id: number } | undefined;
    const kdItems = (kdResult.data.tasks?.[0]?.result?.[0] as { items?: DifficultyItem[] } | undefined)?.items ?? [];
    const upsertKd = db.prepare("UPDATE keywords SET kd = ?, updated_at = ? WHERE normalised_keyword = ?");
    const getKeywordId = db.prepare("SELECT id FROM keywords WHERE normalised_keyword = ?");
    const insertKdMetric = db.prepare(
      "INSERT INTO keyword_metrics (keyword_id, retrieved_at, keyword_difficulty, is_sandbox, raw_response_id) VALUES (?, ?, ?, 0, ?)"
    );
    for (const item of kdItems) {
      if (!item.keyword) continue;
      kdByKeyword.set(item.keyword.toLowerCase(), item.keyword_difficulty);
      const normalised = keywordIdentity(item.keyword).normalisedKeyword;
      upsertKd.run(item.keyword_difficulty, nowIso(), normalised);
      const row = getKeywordId.get(normalised) as { id: number } | undefined;
      if (row) insertKdMetric.run(row.id, nowIso(), item.keyword_difficulty, kdRawRow?.id ?? null);
    }
  }

  console.log(`\n=== TOTAL ACTUAL COST THIS RUN: $${totalCost.toFixed(4)} ===\n`);

  for (const article of ARTICLES) {
    console.log(`\n--- ${article.title} (${article.url}) ---`);
    let clusterVolume = 0;
    for (const k of [article.primary, ...article.secondary]) {
      const v = volByKeyword.get(k.toLowerCase());
      const volume = KNOWN_NULL_VOLUME.has(k) ? 0 : v?.search_volume ?? null;
      const kd = kdByKeyword.get(k.toLowerCase());
      if (volume) clusterVolume += volume;
      console.log(
        `  vol ${String(volume ?? "null").padStart(6)}  kd ${String(kd ?? "-").padStart(4)}  cpc ${String(v?.cpc ?? "-").padStart(6)}  ${k}`
      );
    }
    console.log(`  Cluster combined volume: ~${clusterVolume}/mo`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

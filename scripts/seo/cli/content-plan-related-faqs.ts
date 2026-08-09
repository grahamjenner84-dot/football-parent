// Follow-up to content-plan-fulham-spurs-drills-coaching.ts: (1) re-run
// bulk_keyword_difficulty now the DataForSEO balance is topped up, (2) find
// related/adjacent terms per article via keyword_ideas (relatedKeywords
// returned 0 items for narrow branded seeds both prior times it was tried
// in this repo, so keyword_ideas - which has a consistent track record of
// populated results - is used instead), (3) pull real Google "People Also
// Ask" questions + "related searches" per primary keyword via one cheap
// SERP organic call each (depth 10, $0.002/call, confirmed against a real
// past response that both item types are present at that depth).
//
// Usage (after explicit user approval in-session):
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/content-plan-related-faqs.ts
import { migrate } from "../database/migrate";
import { getDb, nowIso } from "../database/db";
import { bulkKeywordDifficulty, keywordIdeas } from "../dataforseo/endpoints/labs";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { upsertKeywordWithMetrics } from "../dataforseo/persist-results";
import { keywordIdentity } from "../shared/normalise";
import { isSuppressedKeyword } from "../shared/keyword-suppressions";

type DifficultyItem = { keyword: string; keyword_difficulty: number | null };
type KeywordIdeaItem = { keyword: string; keyword_info?: { search_volume?: number | null; cpc?: number | null; competition?: number | null } };
type PaaExpandedElement = { type: string; title?: string | null; description?: string | null; url?: string | null };
type PaaElement = { type: string; title: string; expanded_element?: PaaExpandedElement[] | null };
type SerpItem = { type: string; items?: unknown[] };

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

const DIFFICULTY_KEYWORDS = Array.from(
  new Set([...ARTICLES.map((a) => a.primary), "football drills for 7 year olds", "football drills for 8 year olds"])
);

async function main() {
  migrate();
  const db = getDb();

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  let totalCost = 0;

  // 1. Retry keyword difficulty (declined last time with HTTP 402).
  const kdResult = await bulkKeywordDifficulty(DIFFICULTY_KEYWORDS, { workflow: "content-plan-related-faqs", environment: "live", confirmLive: true });
  console.log(`[keyword_difficulty] cacheStatus=${kdResult.cacheStatus} cost=${kdResult.cost} error=${kdResult.error ?? "none"}`);
  totalCost += kdResult.cost ?? 0;
  if (!kdResult.error && kdResult.data) {
    const kdRawRow = db.prepare("SELECT id FROM raw_responses WHERE request_hash = ?").get(kdResult.requestHash) as { id: number } | undefined;
    const kdItems = (kdResult.data.tasks?.[0]?.result?.[0] as { items?: DifficultyItem[] } | undefined)?.items ?? [];
    const upsertKd = db.prepare("UPDATE keywords SET kd = ?, updated_at = ? WHERE normalised_keyword = ?");
    const getKeywordId = db.prepare("SELECT id FROM keywords WHERE normalised_keyword = ?");
    const insertKdMetric = db.prepare(
      "INSERT INTO keyword_metrics (keyword_id, retrieved_at, keyword_difficulty, is_sandbox, raw_response_id) VALUES (?, ?, ?, 0, ?)"
    );
    console.log("\n--- Keyword difficulty ---");
    for (const item of kdItems) {
      if (!item.keyword) continue;
      const normalised = keywordIdentity(item.keyword).normalisedKeyword;
      upsertKd.run(item.keyword_difficulty, nowIso(), normalised);
      const row = getKeywordId.get(normalised) as { id: number } | undefined;
      if (row) insertKdMetric.run(row.id, nowIso(), item.keyword_difficulty, kdRawRow?.id ?? null);
      console.log(`  KD ${String(item.keyword_difficulty ?? "n/a").padStart(4)}  ${item.keyword}`);
    }
  } else {
    console.error("keyword_difficulty still failing:", kdResult.error);
  }

  // 2. Related/adjacent terms per article cluster via keyword_ideas.
  const seenKeywords = new Set(ARTICLES.flatMap((a) => [a.primary, ...a.secondary].map((k) => k.toLowerCase())));
  const relatedByArticle = new Map<string, { keyword: string; volume: number | null; cpc: number | null }[]>();

  for (const article of ARTICLES) {
    const seeds = [article.primary, ...article.secondary];
    const ideasResult = await keywordIdeas(seeds, { workflow: "content-plan-related-faqs", environment: "live", confirmLive: true, limit: 30 });
    console.log(`\n[keyword_ideas: ${article.title}] cacheStatus=${ideasResult.cacheStatus} cost=${ideasResult.cost} error=${ideasResult.error ?? "none"}`);
    totalCost += ideasResult.cost ?? 0;
    if (ideasResult.error || !ideasResult.data) {
      console.error(`  failed, skipping: ${ideasResult.error}`);
      continue;
    }
    const ideasRawRow = db.prepare("SELECT id FROM raw_responses WHERE request_hash = ?").get(ideasResult.requestHash) as { id: number } | undefined;
    const items = ((ideasResult.data.tasks?.[0]?.result as unknown[])?.[0] as { items?: KeywordIdeaItem[] } | undefined)?.items ?? [];
    const sorted = [...items].sort((a, b) => (b.keyword_info?.search_volume ?? 0) - (a.keyword_info?.search_volume ?? 0));

    const kept: { keyword: string; volume: number | null; cpc: number | null }[] = [];
    for (const item of sorted) {
      if (!item.keyword) continue;
      const key = item.keyword.toLowerCase();
      if (seenKeywords.has(key)) continue;
      if (isSuppressedKeyword(item.keyword)) continue;
      seenKeywords.add(key);
      kept.push({ keyword: item.keyword, volume: item.keyword_info?.search_volume ?? null, cpc: item.keyword_info?.cpc ?? null });
      upsertKeywordWithMetrics({
        keyword: item.keyword,
        volume: item.keyword_info?.search_volume ?? null,
        cpc: item.keyword_info?.cpc ?? null,
        competition: item.keyword_info?.competition ?? null,
        source: "dataforseo_live",
        targetUrl: article.url,
        mappedArticle: article.title,
        isSandbox: false,
        rawResponseId: ideasRawRow?.id ?? null,
      });
      const normalised = keywordIdentity(item.keyword).normalisedKeyword;
      db.prepare("UPDATE keywords SET keyword_type = 'related', cluster = ? WHERE normalised_keyword = ?").run(article.title, normalised);
    }
    relatedByArticle.set(article.title, kept.slice(0, 15));
  }

  // 3. Real Google People Also Ask + related searches per primary keyword.
  const faqsByArticle = new Map<string, { question: string; snippet: string | null; source: string | null }[]>();
  const relatedSearchesByArticle = new Map<string, string[]>();

  for (const article of ARTICLES) {
    const serpResult = await googleOrganicSerp(article.primary, { workflow: "content-plan-related-faqs", environment: "live", confirmLive: true, depth: 10 });
    console.log(`\n[serp: ${article.primary}] cacheStatus=${serpResult.cacheStatus} cost=${serpResult.cost} error=${serpResult.error ?? "none"}`);
    totalCost += serpResult.cost ?? 0;
    if (serpResult.error || !serpResult.data) {
      console.error(`  failed, skipping: ${serpResult.error}`);
      continue;
    }
    const items = ((serpResult.data.tasks?.[0]?.result as unknown[])?.[0] as { items?: SerpItem[] } | undefined)?.items ?? [];

    const paaItems = items.filter((i) => i.type === "people_also_ask").flatMap((i) => (i.items ?? []) as PaaElement[]);
    const faqs = paaItems
      .filter((p) => p.title)
      .map((p) => {
        const expanded = p.expanded_element?.[0];
        const hasSnippet = expanded?.type === "people_also_ask_expanded_element";
        return {
          question: p.title,
          snippet: hasSnippet ? expanded?.description ?? null : null,
          source: hasSnippet ? expanded?.url ?? null : null,
        };
      });
    faqsByArticle.set(article.title, faqs);

    const relatedSearchItems = items.filter((i) => i.type === "related_searches").flatMap((i) => (i.items ?? []) as string[]);
    relatedSearchesByArticle.set(article.title, relatedSearchItems);
  }

  console.log(`\n\n=== TOTAL ACTUAL COST THIS RUN: $${totalCost.toFixed(4)} ===\n`);

  for (const article of ARTICLES) {
    console.log(`\n\n########## ${article.title} (${article.url}) ##########`);

    console.log(`\n-- Related/adjacent keywords (keyword_ideas, real UK volume) --`);
    const related = relatedByArticle.get(article.title) ?? [];
    if (related.length === 0) console.log("  (none found)");
    for (const r of related) console.log(`  vol ${String(r.volume ?? "null").padStart(6)}  cpc ${String(r.cpc ?? "-").padStart(6)}  ${r.keyword}`);

    console.log(`\n-- Related searches (live SERP "related searches" box) --`);
    const rs = relatedSearchesByArticle.get(article.title) ?? [];
    if (rs.length === 0) console.log("  (none found)");
    for (const s of rs) console.log(`  - ${s}`);

    console.log(`\n-- Real Google "People Also Ask" questions --`);
    const faqs = faqsByArticle.get(article.title) ?? [];
    if (faqs.length === 0) console.log("  (none found)");
    for (const f of faqs) {
      console.log(`  Q: ${f.question}`);
      if (f.snippet) console.log(`     A (from ${f.source}): ${f.snippet}`);
      else console.log(`     (Google shows an AI Overview here, no static snippet available)`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

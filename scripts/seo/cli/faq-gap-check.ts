// For a set of articles (by slug), pulls PAA + related-search questions for
// each article's target keyword (scripts/seo/dataforseo/site-keywords.ts)
// and flags which ones the article doesn't obviously already answer -
// FAQ-candidate shortlist, not a final answer: a keyword-overlap heuristic
// only proves the topic is touched, not that it's actually answered well.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/faq-gap-check.ts <slug-fragment> [<slug-fragment> ...]
//   e.g. LIVE_CONFIRM=yes npx tsx scripts/seo/cli/faq-gap-check.ts football-development-centres-in-london football-scholarships-uk
import fs from "node:fs";
import { getSiteArticleKeywords } from "../dataforseo/site-keywords";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { extractSerpFeatures, citationSummary, type SerpItem } from "../dataforseo/serp-features";

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "do", "does", "did", "what", "when", "where",
  "who", "why", "how", "can", "could", "should", "will", "would", "to", "of", "for", "in", "on",
  "at", "and", "or", "but", "i", "you", "your", "my", "it", "this", "that", "with", "as", "be",
]);

function contentWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9' ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

// Rough "already covered?" check: what fraction of the question's content
// words appear anywhere in the article body. Not a real-comprehension
// check - just enough to sort "probably already touched on" from "genuinely
// looks unanswered", for a human/AI read to confirm either way.
function coverageRatio(question: string, articleBodyLower: string): number {
  const words = contentWords(question);
  if (words.length === 0) return 1;
  const hits = words.filter((w) => articleBodyLower.includes(w)).length;
  return hits / words.length;
}

async function main() {
  const slugFilters = process.argv.slice(2);
  if (slugFilters.length === 0) {
    console.error("Usage: npx tsx scripts/seo/cli/faq-gap-check.ts <slug-fragment> [<slug-fragment> ...]");
    process.exitCode = 1;
    return;
  }

  const allArticles = getSiteArticleKeywords();
  const targets = allArticles.filter((a) => slugFilters.some((f) => a.slug.includes(f)));
  if (targets.length === 0) {
    console.error("No articles matched those slug fragments.");
    process.exitCode = 1;
    return;
  }

  const liveReady = process.env.LIVE_CONFIRM === "yes";
  console.log(`${targets.length} article(s), estimated ~$${(targets.length * 0.01).toFixed(3)}`);
  targets.forEach((t) => console.log(`  ${t.slug}  ->  "${t.keyword}"`));
  if (!liveReady) {
    console.log("Not sending - requires LIVE_CONFIRM=yes for this invocation.");
    return;
  }

  let totalCost = 0;

  for (const article of targets) {
    const result = await googleOrganicSerp(article.keyword, {
      workflow: "faq-gap-check",
      environment: "live",
      confirmLive: true,
      depth: 20,
    });
    totalCost += result.cost ?? 0;

    console.log(`\n${"=".repeat(70)}`);
    console.log(`${article.slug}  (target keyword: "${article.keyword}")`);
    console.log(article.url);

    if (result.error || !result.data) {
      console.log(`ERROR: ${result.error}`);
      continue;
    }

    const items = ((result.data.tasks?.[0]?.result as unknown[])?.[0] as { items?: SerpItem[] } | undefined)?.items ?? [];
    const { aiOverview, paaQuestions, relatedSearches } = extractSerpFeatures(items);

    if (aiOverview) {
      const { cited, competitorDomains } = citationSummary(aiOverview.references);
      console.log(`AI Overview cited: ${cited ? "YES" : "no"}${competitorDomains.length ? ` (others: ${competitorDomains.slice(0, 3).join(", ")})` : ""}`);
    } else {
      console.log("No AI Overview on this SERP.");
    }

    if (relatedSearches.length) {
      console.log(`Related searches: ${relatedSearches.join(", ")}`);
    }

    if (paaQuestions.length === 0) {
      console.log("No People Also Ask questions on this SERP.");
      continue;
    }

    const articleBody = fs.readFileSync(article.mdxFile, "utf8").toLowerCase();

    console.log(`\nPeople Also Ask (${paaQuestions.length}) - coverage in article body:`);
    for (const q of paaQuestions) {
      const ratio = coverageRatio(q, articleBody);
      const verdict = ratio >= 0.7 ? "likely covered" : ratio >= 0.4 ? "partially touched" : "LIKELY GAP";
      console.log(`  [${verdict.padEnd(16)}] (${Math.round(ratio * 100)}%)  ${q}`);
    }
  }

  console.log(`\nTotal actual API-reported cost: $${totalCost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

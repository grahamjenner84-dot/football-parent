// Pulls Google's AI Overview + People Also Ask + Related Searches straight
// from the SERP for a set of keywords, via the same live/organic endpoint
// already used for rank checks (scripts/seo/dataforseo/endpoints/serp.ts) -
// that response already contains these as item types, existing scripts just
// filter them out down to type === "organic". This surfaces them instead:
// whether footballparent.co.uk is cited in the AI Overview, and the PAA/
// related-search lists as raw keyword and FAQ-candidate material.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/ai-overview-check.ts "keyword one" "keyword two"
import fs from "node:fs";
import path from "node:path";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { extractSerpFeatures, citationSummary, type SerpItem } from "../dataforseo/serp-features";
import { REPO_ROOT } from "../shared/env";

const LOG_PATH = path.join(REPO_ROOT, "ai-citation-log.csv");

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

async function main() {
  const keywords = process.argv.slice(2);
  if (keywords.length === 0) {
    console.error('Usage: npx tsx scripts/seo/cli/ai-overview-check.ts "keyword one" "keyword two"');
    process.exitCode = 1;
    return;
  }

  const liveReady = process.env.LIVE_CONFIRM === "yes";
  console.log(`${keywords.length} keyword(s), estimated ~$${(keywords.length * 0.01).toFixed(3)}`);
  if (!liveReady) {
    console.log("Not sending - requires LIVE_CONFIRM=yes for this invocation.");
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const csvRows: string[] = [];
  let totalCost = 0;

  for (const keyword of keywords) {
    const result = await googleOrganicSerp(keyword, {
      workflow: "ai-overview-check",
      environment: "live",
      confirmLive: true,
      depth: 20,
    });
    totalCost += result.cost ?? 0;

    if (result.error || !result.data) {
      console.log(`ERROR "${keyword}": ${result.error}`);
      continue;
    }

    const items = ((result.data.tasks?.[0]?.result as unknown[])?.[0] as { items?: SerpItem[] } | undefined)?.items ?? [];
    const { aiOverview, paaQuestions, paaExpandedOverviews, relatedSearches } = extractSerpFeatures(items);

    console.log(`\n=== "${keyword}" ===`);

    if (aiOverview) {
      const { cited, position, competitorDomains } = citationSummary(aiOverview.references);
      console.log(`AI Overview present. Cited: ${cited ? `YES (source #${position})` : "no"}`);
      if (competitorDomains.length) console.log(`  Other sources: ${competitorDomains.slice(0, 5).join(", ")}`);
      csvRows.push(
        [today, "Google AI Overview (DataForSEO)", keyword, cited ? "Y" : "N", position ?? "", competitorDomains.slice(0, 5).join("; "), "auto-pulled live SERP"]
          .map((v) => csvEscape(String(v)))
          .join(",")
      );
    } else {
      console.log("No AI Overview on this SERP.");
      csvRows.push(
        [today, "Google AI Overview (DataForSEO)", keyword, "N", "", "", "no AI Overview element on this SERP"]
          .map((v) => csvEscape(String(v)))
          .join(",")
      );
    }

    if (paaQuestions.length) {
      console.log(`People Also Ask (${paaQuestions.length}):`);
      paaQuestions.forEach((q) => console.log(`  - ${q}`));
    }

    if (relatedSearches.length) {
      console.log(`Related Searches (${relatedSearches.length}): ${relatedSearches.join(", ")}`);
    }

    for (const { question, item } of paaExpandedOverviews) {
      const { cited, position, competitorDomains } = citationSummary(item.references);
      csvRows.push(
        [today, "Google PAA AI Overview (DataForSEO)", question, cited ? "Y" : "N", position ?? "", competitorDomains.slice(0, 5).join("; "), "auto-pulled live SERP"]
          .map((v) => csvEscape(String(v)))
          .join(",")
      );
    }
  }

  fs.appendFileSync(LOG_PATH, csvRows.join("\n") + "\n");
  console.log(`\nAppended ${csvRows.length} row(s) to ${LOG_PATH}`);
  console.log(`Total actual API-reported cost: $${totalCost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

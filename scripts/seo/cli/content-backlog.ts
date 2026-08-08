// /seo-status companion: per-article content/EEAT status backlog.
// Run: npx tsx scripts/seo/cli/content-backlog.ts mark --url <path> [flags]
//      npx tsx scripts/seo/cli/content-backlog.ts report
import { migrate } from "../database/migrate";
import {
  markFactChecked,
  markSeoOptimised,
  setPersonalStoryCount,
  setExpertQuoteCount,
  setExpertQuotePending,
  setNotes,
  contentBacklogRows,
} from "../database/content-status";

function parseFlags(argv: string[]): Record<string, string | boolean> {
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      flags[key] = true;
    } else {
      flags[key] = next;
      i++;
    }
  }
  return flags;
}

function runMark(argv: string[]): void {
  const flags = parseFlags(argv);
  const url = flags.url;
  if (typeof url !== "string" || !url) {
    console.error("mark requires --url <path or full URL>");
    process.exitCode = 1;
    return;
  }

  if (flags["fact-checked"]) markFactChecked(url);
  if (flags["seo-optimised"]) markSeoOptimised(url);
  if (typeof flags["personal-story-count"] === "string") {
    setPersonalStoryCount(url, parseInt(flags["personal-story-count"], 10) || 0);
  }
  if (typeof flags["expert-quote-count"] === "string") {
    setExpertQuoteCount(url, parseInt(flags["expert-quote-count"], 10) || 0);
  }
  if ("expert-quote-pending" in flags) {
    setExpertQuotePending(url, flags["expert-quote-pending"] !== "false");
  }
  if (typeof flags["notes"] === "string") {
    setNotes(url, flags["notes"]);
  }

  console.log(`Updated tracker row for ${url}`);
}

function runReport(): void {
  const rows = contentBacklogRows();
  if (!rows.length) {
    console.log("No pages tracked yet.");
    return;
  }
  console.table(
    rows.map((r) => ({
      url: r.url,
      category: r.category ?? "",
      primary_keyword: r.primary_keyword ?? "",
      fact_checked_at: r.fact_checked_at ?? "",
      seo_optimised_at: r.seo_optimised_at ?? "",
      personal_stories: r.personal_story_count,
      expert_quotes: r.expert_quote_count,
      quote_pending: r.expert_quote_pending ? "yes" : "",
      inbound_links: r.inbound_internal_links ?? "",
      notes: r.notes ?? "",
    }))
  );
}

function main(): void {
  migrate();
  const [subcommand, ...rest] = process.argv.slice(2);

  if (subcommand === "mark") {
    runMark(rest);
  } else if (subcommand === "report") {
    runReport();
  } else {
    console.error("Usage: content-backlog.ts <mark|report> [...flags]");
    console.error("  mark --url <path> [--fact-checked] [--seo-optimised]");
    console.error("       [--personal-story-count N] [--expert-quote-count N]");
    console.error("       [--expert-quote-pending | --expert-quote-pending false]");
    console.error("       [--notes \"free text\"]");
    console.error("  report");
    process.exitCode = 1;
  }
}

main();

// /seo-status companion: per-article content/EEAT status backlog.
// Run: npx tsx scripts/seo/cli/content-backlog.ts mark --url <path> [flags]
//      npx tsx scripts/seo/cli/content-backlog.ts report
//      npx tsx scripts/seo/cli/content-backlog.ts export
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { migrate } from "../database/migrate";
import { getDb } from "../database/db";
import { REPO_ROOT } from "../shared/env";
import { routes } from "../../../app/sitemap";
import {
  markFactChecked,
  markSeoOptimised,
  markAiSlopChecked,
  setPersonalStoryCount,
  setExpertQuoteCount,
  setExpertQuotePending,
  setNotes,
  setConfirmedVoice,
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

  // --date backdates fact-checked/seo-optimised/ai-slop-checked together -
  // for backfilling historical work (e.g. Phase 5A commits that predated
  // the --fact-checked flag existing in this skill's workflow), not for
  // routine use, where the default (now) is correct.
  const backdate = typeof flags["date"] === "string" ? flags["date"] : undefined;
  if (flags["fact-checked"]) markFactChecked(url, backdate);
  if (flags["seo-optimised"]) markSeoOptimised(url, backdate);
  if (flags["ai-slop-checked"]) markAiSlopChecked(url, backdate);
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
  if (typeof flags["confirmed-voice-text"] === "string") {
    setConfirmedVoice(url, flags["confirmed-voice-text"]);
  }

  console.log(`Updated tracker row for ${url}`);
}

// The metric to actually track against the ~10% target: tagged voice plus
// confirmed-genuine unmarked prose (deliberately left woven into the body
// rather than extracted - see the schema.sql comment on confirmed_voice_*).
// Falls back to voice_pct alone when body_word_count is missing.
function realVoicePct(r: {
  body_word_count: number | null;
  voice_word_count: number | null;
  confirmed_voice_word_count: number | null;
  voice_pct: number | null;
}): string {
  if (!r.body_word_count) return r.voice_pct !== null ? `${r.voice_pct}%` : "";
  const combined = (r.voice_word_count ?? 0) + (r.confirmed_voice_word_count ?? 0);
  return `${Math.round((combined / r.body_word_count) * 1000) / 10}%`;
}

function runReport(argv: string[]): void {
  const flags = parseFlags(argv);
  let rows = contentBacklogRows();
  if (flags["touched"]) {
    rows = rows.filter(
      (r) =>
        r.personal_story_count > 0 ||
        r.expert_quote_count > 0 ||
        r.expert_quote_pending ||
        r.fact_checked_at ||
        r.notes
    );
  }
  if (!rows.length) {
    console.log("No pages tracked yet.");
    return;
  }
  console.table(
    rows.map((r) => ({
      url: r.url,
      category: r.category ?? "",
      primary_keyword: r.primary_keyword ?? "",
      secondary_keywords: r.secondary_keywords ?? "",
      ai_slop_checked_at: r.ai_slop_checked_at ?? "",
      fact_checked_at: r.fact_checked_at ?? "",
      seo_optimised_at: r.seo_optimised_at ?? "",
      personal_stories: r.personal_story_count,
      expert_quotes: r.expert_quote_count,
      quote_pending: r.expert_quote_pending ? "yes" : "",
      voice_pct: r.voice_pct !== null ? `${r.voice_pct}%` : "",
      real_voice_pct: realVoicePct(r),
      confirmed_voice_words: r.confirmed_voice_word_count ?? "",
      unmarked_voice_words: r.unmarked_voice_word_count ?? "",
      unmarked_voice_sentences: r.unmarked_voice_sentence_count ?? "",
      inbound_links: r.inbound_internal_links ?? "",
      notes: r.notes ?? "",
      last_reviewed_at: r.last_reviewed_at ?? "",
      last_updated: r.updated_at,
    }))
  );
}

// One row per real article page (from app/sitemap.ts's route list, matched
// to its content/<category>/<slug>.mdx), joined against the tracker. Writes
// seo-data/reports/content-status.csv + .json (both committed, unlike
// seo-data/database/*.db) and backfills ai_slop_checked_at from the Phase
// 0-4 site-wide sweep date for any article that's never had a slop check
// recorded - see the column comment in schema.sql for why that's a shallower
// signal than a full football-parent-review pass.
const KNOWN_CATEGORIES = new Set([
  "academy-pathway",
  "academy-trials",
  "football-development",
  "football-gear",
  "girls-football",
  "parent-guides",
  "coaching",
]);
const SITE_URL = "https://www.footballparent.co.uk";
const PHASE_0_4_SWEEP_DATE = "2026-08-07";

function runExport(argv: string[]): void {
  const flags = parseFlags(argv);
  const backfillDate =
    typeof flags["backfill-date"] === "string" ? flags["backfill-date"] : PHASE_0_4_SWEEP_DATE;
  const db = getDb();

  type ExportRow = {
    slug: string;
    category: string;
    title: string;
    primary_keyword: string;
    secondary_keywords: string;
    ai_slop_checked_at: string;
    fact_checked_at: string;
    personal_stories: number;
    expert_quotes: number;
    voice_pct: string;
    real_voice_pct: string;
    confirmed_voice_word_count: number;
    confirmed_voice_sentences: string[];
    confirmed_voice_reviewed_at: string;
    unmarked_voice_word_count: number;
    unmarked_voice_sentence_count: number;
    unmarked_voice_candidates: string[];
    seo_optimised_at: string;
    last_reviewed_at: string;
  };
  const rows: ExportRow[] = [];

  for (const route of routes) {
    if (!route) continue;
    const parts = route.split("/").filter(Boolean);
    if (parts.length < 2 || parts.length > 3) continue; // skip category index pages and root
    const category = parts[0];
    const slug = parts[parts.length - 1];
    if (!KNOWN_CATEGORIES.has(category)) continue;

    let mdxPath = path.join(REPO_ROOT, "content", category, `${slug}.mdx`);
    if (!fs.existsSync(mdxPath)) {
      const dir = path.join(REPO_ROOT, "content", category);
      if (fs.existsSync(dir)) {
        const found = (fs.readdirSync(dir, { withFileTypes: true, recursive: true } as any) as any[]).find(
          (f) => f.name === `${slug}.mdx`
        );
        if (found) mdxPath = path.join(found.path ?? dir, found.name);
      }
    }
    if (!fs.existsSync(mdxPath)) continue;

    const { data } = matter(fs.readFileSync(mdxPath, "utf8"));
    const url = `${SITE_URL}${route}`;
    let dbRow = db
      .prepare(
        `SELECT primary_keyword, secondary_keywords, ai_slop_checked_at, fact_checked_at,
                personal_story_count, expert_quote_count, voice_pct, body_word_count, voice_word_count,
                unmarked_voice_word_count, unmarked_voice_sentence_count, unmarked_voice_candidates,
                confirmed_voice_word_count, confirmed_voice_sentences, confirmed_voice_reviewed_at,
                seo_optimised_at, last_reviewed_at
         FROM pages WHERE url = ?`
      )
      .get(url) as any;

    if (!dbRow) {
      db.prepare(
        `INSERT INTO pages (url, article, category, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))`
      ).run(url, data.title ?? slug, data.category ?? category);
      dbRow = {};
    }

    if (!dbRow.ai_slop_checked_at) {
      db.prepare(`UPDATE pages SET ai_slop_checked_at = ? WHERE url = ?`).run(backfillDate, url);
      dbRow.ai_slop_checked_at = backfillDate;
    }
    if (!dbRow.last_reviewed_at) {
      const latest = [dbRow.ai_slop_checked_at, dbRow.fact_checked_at, dbRow.seo_optimised_at]
        .filter(Boolean)
        .sort()
        .pop();
      if (latest) {
        db.prepare(`UPDATE pages SET last_reviewed_at = ? WHERE url = ?`).run(latest, url);
        dbRow.last_reviewed_at = latest;
      }
    }

    rows.push({
      slug,
      category: data.category ?? category,
      title: data.title ?? slug,
      primary_keyword: dbRow.primary_keyword ?? "",
      secondary_keywords: dbRow.secondary_keywords ?? "",
      ai_slop_checked_at: dbRow.ai_slop_checked_at ?? "",
      fact_checked_at: dbRow.fact_checked_at ?? "",
      personal_stories: dbRow.personal_story_count ?? 0,
      expert_quotes: dbRow.expert_quote_count ?? 0,
      voice_pct:
        dbRow.voice_pct !== null && dbRow.voice_pct !== undefined ? `${dbRow.voice_pct}%` : "",
      real_voice_pct: realVoicePct(dbRow),
      confirmed_voice_word_count: dbRow.confirmed_voice_word_count ?? 0,
      confirmed_voice_sentences: dbRow.confirmed_voice_sentences
        ? JSON.parse(dbRow.confirmed_voice_sentences)
        : [],
      confirmed_voice_reviewed_at: dbRow.confirmed_voice_reviewed_at ?? "",
      unmarked_voice_word_count: dbRow.unmarked_voice_word_count ?? 0,
      unmarked_voice_sentence_count: dbRow.unmarked_voice_sentence_count ?? 0,
      unmarked_voice_candidates: dbRow.unmarked_voice_candidates
        ? JSON.parse(dbRow.unmarked_voice_candidates)
        : [],
      seo_optimised_at: dbRow.seo_optimised_at ?? "",
      last_reviewed_at: dbRow.last_reviewed_at ?? "",
    });
  }

  const reportsDir = path.join(REPO_ROOT, "seo-data", "reports");
  fs.mkdirSync(reportsDir, { recursive: true });

  // CSV can't hold the candidate/confirmed sentence arrays sensibly - drop
  // them there, keep counts only; the JSON export keeps the full lists.
  const ARRAY_FIELDS = new Set(["unmarked_voice_candidates", "confirmed_voice_sentences"]);
  const csvHeader = Object.keys(rows[0])
    .filter((k) => !ARRAY_FIELDS.has(k))
    .join(",");
  const csvLines = rows.map((r) =>
    Object.entries(r)
      .filter(([k]) => !ARRAY_FIELDS.has(k))
      .map(([, v]) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  fs.writeFileSync(path.join(reportsDir, "content-status.csv"), [csvHeader, ...csvLines].join("\n"), "utf8");
  fs.writeFileSync(path.join(reportsDir, "content-status.json"), JSON.stringify(rows, null, 2), "utf8");

  console.log(`Exported ${rows.length} article rows to seo-data/reports/content-status.csv/.json`);
}

function main(): void {
  migrate();
  const [subcommand, ...rest] = process.argv.slice(2);

  if (subcommand === "mark") {
    runMark(rest);
  } else if (subcommand === "report") {
    runReport(rest);
  } else if (subcommand === "export") {
    runExport(rest);
  } else {
    console.error("Usage: content-backlog.ts <mark|report|export> [...flags]");
    console.error("  mark --url <path> [--fact-checked] [--seo-optimised] [--ai-slop-checked]");
    console.error("       [--date ISO8601]  (backdates the 3 checked-at flags above; omit for now)");
    console.error("       [--personal-story-count N] [--expert-quote-count N]");
    console.error("       [--expert-quote-pending | --expert-quote-pending false]");
    console.error("       [--notes \"free text\"]");
    console.error("       [--confirmed-voice-text \"verbatim genuine passage(s), reviewed and left as prose\"]");
    console.error("  report [--touched]  (--touched limits to rows with any Phase 5 activity)");
    console.error("  export [--backfill-date YYYY-MM-DD]  (writes seo-data/reports/content-status.csv/.json,");
    console.error("         one row per real article page from app/sitemap.ts)");
    process.exitCode = 1;
  }
}

main();

// Content-status backlog helpers for the `pages` table (schema v2 columns).
// Written by the football-parent-articles/football-parent-review skills via
// scripts/seo/cli/content-backlog.ts - separate from the article-tracker
// import/export path (scripts/seo/imports|exports/article-tracker.ts),
// which only round-trips the spreadsheet-sourced columns.
import { getDb, nowIso } from "./db";

// Must match `siteUrl` in lib/seo.ts - duplicated here rather than imported
// because scripts/seo runs under tsx outside the Next.js path-alias setup
// (same hardcoded-in-two-places tradeoff CLAUDE.md already notes for the
// author/site identity in lib/seo.ts and lib/ArticleLayout.tsx).
const SITE_URL = "https://www.footballparent.co.uk";

export function normalizeUrl(input: string): string {
  if (/^https?:\/\//i.test(input)) return input.replace(/\/$/, "");
  const withSlash = input.startsWith("/") ? input : `/${input}`;
  return `${SITE_URL}${withSlash}`.replace(/\/$/, "") || SITE_URL;
}

function ensurePage(url: string): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO pages (url, created_at, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(url) DO NOTHING`
  ).run(url, nowIso(), nowIso());
}

export function markFactChecked(url: string, date: string = nowIso()): void {
  const normalized = normalizeUrl(url);
  ensurePage(normalized);
  getDb()
    .prepare(`UPDATE pages SET fact_checked_at = ?, updated_at = ? WHERE url = ?`)
    .run(date, nowIso(), normalized);
}

export function markSeoOptimised(url: string, date: string = nowIso()): void {
  const normalized = normalizeUrl(url);
  ensurePage(normalized);
  getDb()
    .prepare(`UPDATE pages SET seo_optimised_at = ?, updated_at = ? WHERE url = ?`)
    .run(date, nowIso(), normalized);
}

export function setPersonalStoryCount(url: string, count: number): void {
  const normalized = normalizeUrl(url);
  ensurePage(normalized);
  getDb()
    .prepare(`UPDATE pages SET personal_story_count = ?, updated_at = ? WHERE url = ?`)
    .run(count, nowIso(), normalized);
}

export function setExpertQuoteCount(url: string, count: number): void {
  const normalized = normalizeUrl(url);
  ensurePage(normalized);
  getDb()
    .prepare(`UPDATE pages SET expert_quote_count = ?, updated_at = ? WHERE url = ?`)
    .run(count, nowIso(), normalized);
}

export function setExpertQuotePending(url: string, pending: boolean): void {
  const normalized = normalizeUrl(url);
  ensurePage(normalized);
  getDb()
    .prepare(`UPDATE pages SET expert_quote_pending = ?, updated_at = ? WHERE url = ?`)
    .run(pending ? 1 : 0, nowIso(), normalized);
}

export function setNotes(url: string, notes: string): void {
  const normalized = normalizeUrl(url);
  ensurePage(normalized);
  getDb()
    .prepare(`UPDATE pages SET notes = ?, updated_at = ? WHERE url = ?`)
    .run(notes, nowIso(), normalized);
}

export function setInboundLinks(url: string, count: number, checkedAt: string = nowIso()): void {
  const normalized = normalizeUrl(url);
  ensurePage(normalized);
  getDb()
    .prepare(
      `UPDATE pages SET inbound_internal_links = ?, inbound_links_checked_at = ?, updated_at = ? WHERE url = ?`
    )
    .run(count, checkedAt, nowIso(), normalized);
}

export type ContentBacklogRow = {
  url: string;
  article: string | null;
  category: string | null;
  primary_keyword: string | null;
  secondary_keywords: string | null;
  fact_checked_at: string | null;
  seo_optimised_at: string | null;
  personal_story_count: number;
  expert_quote_count: number;
  expert_quote_pending: number;
  inbound_internal_links: number | null;
  inbound_links_checked_at: string | null;
  notes: string | null;
};

export function contentBacklogRows(): ContentBacklogRow[] {
  return getDb()
    .prepare(
      `SELECT url, article, category, primary_keyword, secondary_keywords,
              fact_checked_at, seo_optimised_at, personal_story_count,
              expert_quote_count, expert_quote_pending, inbound_internal_links,
              inbound_links_checked_at, notes
       FROM pages
       ORDER BY url`
    )
    .all() as ContentBacklogRow[];
}

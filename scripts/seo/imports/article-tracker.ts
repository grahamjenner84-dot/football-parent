import { getDb, nowIso } from "../database/db";
import { loadTableFile, headerIndex, cell, toIntOrNull, toRealOrNull, recordImport, type ImportSummary } from "./shared";

// Exact tracker column order - also the export column order (see
// exports/article-tracker.ts) so a round-trip import -> export is
// column-identical.
export const ARTICLE_TRACKER_COLUMNS = [
  "URL",
  "Article",
  "Category",
  "Primary Keyword",
  "Secondary Keywords",
  "Cluster",
  "Status",
  "Total Target SV",
  "GSC Impressions",
  "GSC Clicks",
  "GSC CTR",
  "Avg Position",
  "Opportunity Score",
  "Priority",
  "Notes",
] as const;

type PageDbRow = {
  id: number;
  article: string | null;
  category: string | null;
  primary_keyword: string | null;
  secondary_keywords: string | null;
  cluster: string | null;
  status: string | null;
  total_target_sv: number | null;
  gsc_impressions: number | null;
  gsc_clicks: number | null;
  gsc_ctr: number | null;
  avg_position: number | null;
  opportunity_score: number | null;
  priority: string | null;
  notes: string | null;
};

export function importArticleTracker(filePath: string): ImportSummary {
  const { headers, rows } = loadTableFile(filePath);
  const idx = {
    url: headerIndex(headers, "URL"),
    article: headerIndex(headers, "Article"),
    category: headerIndex(headers, "Category"),
    primaryKeyword: headerIndex(headers, "Primary Keyword"),
    secondaryKeywords: headerIndex(headers, "Secondary Keywords"),
    cluster: headerIndex(headers, "Cluster"),
    status: headerIndex(headers, "Status"),
    totalTargetSv: headerIndex(headers, "Total Target SV"),
    gscImpressions: headerIndex(headers, "GSC Impressions"),
    gscClicks: headerIndex(headers, "GSC Clicks"),
    gscCtr: headerIndex(headers, "GSC CTR"),
    avgPosition: headerIndex(headers, "Avg Position"),
    opportunityScore: headerIndex(headers, "Opportunity Score"),
    priority: headerIndex(headers, "Priority"),
    notes: headerIndex(headers, "Notes"),
  };
  if (idx.url === -1) throw new Error(`"${filePath}" is missing a "URL" column - required as the article tracker's identity key`);

  const db = getDb();
  const seenInFile = new Set<string>();
  const summary: ImportSummary = { rowsRead: rows.length, inserted: 0, updated: 0, unchanged: 0, duplicatesIgnored: 0, invalidRows: 0 };

  const selectStmt = db.prepare("SELECT * FROM pages WHERE url = ?");
  const insertStmt = db.prepare(
    `INSERT INTO pages
      (url, article, category, primary_keyword, secondary_keywords, cluster, status, total_target_sv,
       gsc_impressions, gsc_clicks, gsc_ctr, avg_position, opportunity_score, priority, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const row of rows) {
    const url = cell(row, idx.url);
    if (!url) {
      summary.invalidRows++;
      continue;
    }
    if (seenInFile.has(url)) {
      summary.duplicatesIgnored++;
      continue;
    }
    seenInFile.add(url);

    const incoming = {
      article: cell(row, idx.article) || null,
      category: cell(row, idx.category) || null,
      primary_keyword: cell(row, idx.primaryKeyword) || null,
      secondary_keywords: cell(row, idx.secondaryKeywords) || null,
      cluster: cell(row, idx.cluster) || null,
      status: cell(row, idx.status) || null,
      total_target_sv: toIntOrNull(cell(row, idx.totalTargetSv)),
      gsc_impressions: toIntOrNull(cell(row, idx.gscImpressions)),
      gsc_clicks: toIntOrNull(cell(row, idx.gscClicks)),
      gsc_ctr: toRealOrNull(cell(row, idx.gscCtr)),
      avg_position: toRealOrNull(cell(row, idx.avgPosition)),
      opportunity_score: toRealOrNull(cell(row, idx.opportunityScore)),
      priority: cell(row, idx.priority) || null,
      notes: cell(row, idx.notes) || null,
    };

    const existing = selectStmt.get(url) as PageDbRow | undefined;

    if (!existing) {
      insertStmt.run(
        url,
        incoming.article,
        incoming.category,
        incoming.primary_keyword,
        incoming.secondary_keywords,
        incoming.cluster,
        incoming.status,
        incoming.total_target_sv,
        incoming.gsc_impressions,
        incoming.gsc_clicks,
        incoming.gsc_ctr,
        incoming.avg_position,
        incoming.opportunity_score,
        incoming.priority,
        incoming.notes,
        nowIso(),
        nowIso()
      );
      summary.inserted++;
      continue;
    }

    // Preserve existing values unless the incoming value is non-empty and
    // different - never let a blank cell in a re-imported file wipe out
    // data this system (or a previous import) already has.
    const merged: Record<string, unknown> = {};
    let changed = false;
    for (const [key, value] of Object.entries(incoming)) {
      const existingValue = (existing as unknown as Record<string, unknown>)[key];
      if (value !== null && value !== existingValue) {
        merged[key] = value;
        changed = true;
      } else {
        merged[key] = existingValue;
      }
    }

    if (changed) {
      db.prepare(
        `UPDATE pages SET article=?, category=?, primary_keyword=?, secondary_keywords=?, cluster=?, status=?,
          total_target_sv=?, gsc_impressions=?, gsc_clicks=?, gsc_ctr=?, avg_position=?, opportunity_score=?,
          priority=?, notes=?, updated_at=? WHERE url=?`
      ).run(
        merged.article,
        merged.category,
        merged.primary_keyword,
        merged.secondary_keywords,
        merged.cluster,
        merged.status,
        merged.total_target_sv,
        merged.gsc_impressions,
        merged.gsc_clicks,
        merged.gsc_ctr,
        merged.avg_position,
        merged.opportunity_score,
        merged.priority,
        merged.notes,
        nowIso(),
        url
      );
      summary.updated++;
    } else {
      summary.unchanged++;
    }
  }

  recordImport({ filePath, fileType: "article_tracker", summary });
  return summary;
}

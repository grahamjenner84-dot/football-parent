import fs from "node:fs";
import path from "node:path";
import { getDb } from "../database/db";
import { REPO_ROOT } from "../shared/env";
import { writeCsv } from "../shared/csv";
import { writeXlsx } from "../shared/xlsx-lite";
import { ARTICLE_TRACKER_COLUMNS } from "../imports/article-tracker";

type PageRow = {
  url: string;
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

export function articleTrackerRows(): (string | number | null)[][] {
  const db = getDb();
  const pages = db.prepare("SELECT * FROM pages ORDER BY url").all() as PageRow[];
  return pages.map((p) => [
    p.url,
    p.article,
    p.category,
    p.primary_keyword,
    p.secondary_keywords,
    p.cluster,
    p.status,
    p.total_target_sv,
    p.gsc_impressions,
    p.gsc_clicks,
    p.gsc_ctr,
    p.avg_position,
    p.opportunity_score,
    p.priority,
    p.notes,
  ]);
}

export function exportArticleTracker(format: "csv" | "xlsx" = "csv"): string {
  const rows = [Array.from(ARTICLE_TRACKER_COLUMNS), ...articleTrackerRows()];
  const outDir = path.join(REPO_ROOT, "seo-data", "exports");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `article-tracker.${format}`);

  if (format === "csv") {
    fs.writeFileSync(outPath, writeCsv(rows));
  } else {
    fs.writeFileSync(outPath, writeXlsx(rows, "Article Tracker"));
  }
  return outPath;
}

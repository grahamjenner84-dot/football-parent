import fs from "node:fs";
import path from "node:path";
import { getDb } from "../database/db";
import { REPO_ROOT } from "../shared/env";
import { writeCsv } from "../shared/csv";
import { writeXlsx } from "../shared/xlsx-lite";
import { KEYWORD_TRACKER_COLUMNS } from "../imports/keyword-tracker";

type KeywordRow = {
  keyword: string;
  volume: number | null;
  kd: number | null;
  source: string | null;
  target_url: string | null;
  mapped_article: string | null;
  keyword_type: string | null;
  cluster: string | null;
  notes: string | null;
  low_fruits_volume: number | null;
};

export function keywordTrackerRows(): (string | number | null)[][] {
  const db = getDb();
  const keywords = db.prepare("SELECT * FROM keywords ORDER BY keyword").all() as KeywordRow[];
  return keywords.map((k) => [
    k.keyword,
    k.volume,
    k.kd,
    k.source,
    k.target_url,
    k.mapped_article,
    k.keyword_type,
    k.cluster,
    k.notes,
    k.low_fruits_volume,
  ]);
}

export function exportKeywordTracker(format: "csv" | "xlsx" = "csv"): string {
  const rows = [Array.from(KEYWORD_TRACKER_COLUMNS), ...keywordTrackerRows()];
  const outDir = path.join(REPO_ROOT, "seo-data", "exports");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `keyword-tracker.${format}`);

  if (format === "csv") {
    fs.writeFileSync(outPath, writeCsv(rows));
  } else {
    fs.writeFileSync(outPath, writeXlsx(rows, "Keyword Tracker"));
  }
  return outPath;
}

import { getDb, nowIso } from "../database/db";
import { keywordIdentity } from "../shared/normalise";
import { loadTableFile, headerIndex, cell, toIntOrNull, toRealOrNull, recordImport, type ImportSummary } from "./shared";

export const KEYWORD_TRACKER_COLUMNS = [
  "Keyword",
  "Volume",
  "KD",
  "Source",
  "Target URL",
  "Mapped Article",
  "Keyword Type",
  "Cluster",
  "Notes",
  "Low fruits volume",
] as const;

type KeywordDbRow = {
  id: number;
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

export function importKeywordTracker(filePath: string): ImportSummary {
  const { headers, rows } = loadTableFile(filePath);
  const idx = {
    keyword: headerIndex(headers, "Keyword"),
    volume: headerIndex(headers, "Volume"),
    kd: headerIndex(headers, "KD"),
    source: headerIndex(headers, "Source"),
    targetUrl: headerIndex(headers, "Target URL"),
    mappedArticle: headerIndex(headers, "Mapped Article"),
    keywordType: headerIndex(headers, "Keyword Type"),
    cluster: headerIndex(headers, "Cluster"),
    notes: headerIndex(headers, "Notes"),
    lowFruitsVolume: headerIndex(headers, "Low fruits volume"),
  };
  if (idx.keyword === -1) throw new Error(`"${filePath}" is missing a "Keyword" column - required as the keyword tracker's identity key`);

  const db = getDb();
  const seenInFile = new Set<string>();
  const summary: ImportSummary = { rowsRead: rows.length, inserted: 0, updated: 0, unchanged: 0, duplicatesIgnored: 0, invalidRows: 0 };

  const selectStmt = db.prepare(
    "SELECT * FROM keywords WHERE normalised_keyword = ? AND search_engine = ? AND location_code = ? AND language_code = ?"
  );
  const insertStmt = db.prepare(
    `INSERT INTO keywords
      (keyword, normalised_keyword, search_engine, location_code, language_code, volume, kd, source,
       target_url, mapped_article, keyword_type, cluster, notes, low_fruits_volume, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const row of rows) {
    const rawKeyword = cell(row, idx.keyword);
    if (!rawKeyword) {
      summary.invalidRows++;
      continue;
    }
    const identity = keywordIdentity(rawKeyword);
    const dedupeKey = `${identity.normalisedKeyword}|${identity.searchEngine}|${identity.locationCode}|${identity.languageCode}`;
    if (seenInFile.has(dedupeKey)) {
      summary.duplicatesIgnored++;
      continue;
    }
    seenInFile.add(dedupeKey);

    const incoming = {
      volume: toIntOrNull(cell(row, idx.volume)),
      kd: toRealOrNull(cell(row, idx.kd)),
      source: cell(row, idx.source) || null,
      target_url: cell(row, idx.targetUrl) || null,
      mapped_article: cell(row, idx.mappedArticle) || null,
      keyword_type: cell(row, idx.keywordType) || null,
      cluster: cell(row, idx.cluster) || null,
      notes: cell(row, idx.notes) || null,
      low_fruits_volume: toIntOrNull(cell(row, idx.lowFruitsVolume)),
    };

    const existing = selectStmt.get(
      identity.normalisedKeyword,
      identity.searchEngine,
      identity.locationCode,
      identity.languageCode
    ) as KeywordDbRow | undefined;

    if (!existing) {
      insertStmt.run(
        rawKeyword,
        identity.normalisedKeyword,
        identity.searchEngine,
        identity.locationCode,
        identity.languageCode,
        incoming.volume,
        incoming.kd,
        incoming.source,
        incoming.target_url,
        incoming.mapped_article,
        incoming.keyword_type,
        incoming.cluster,
        incoming.notes,
        incoming.low_fruits_volume,
        nowIso(),
        nowIso()
      );
      summary.inserted++;
      continue;
    }

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
        `UPDATE keywords SET volume=?, kd=?, source=?, target_url=?, mapped_article=?, keyword_type=?, cluster=?,
          notes=?, low_fruits_volume=?, updated_at=? WHERE id=?`
      ).run(
        merged.volume,
        merged.kd,
        merged.source,
        merged.target_url,
        merged.mapped_article,
        merged.keyword_type,
        merged.cluster,
        merged.notes,
        merged.low_fruits_volume,
        nowIso(),
        existing.id
      );
      summary.updated++;
    } else {
      summary.unchanged++;
    }
  }

  recordImport({ filePath, fileType: "keyword_tracker", summary });
  return summary;
}

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { parseCsv } from "../shared/csv";
import { readXlsx } from "../shared/xlsx-lite";
import { getDb, nowIso } from "../database/db";

export function loadTableFile(filePath: string): { headers: string[]; rows: string[][] } {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = fs.readFileSync(filePath);

  let rows: string[][];
  if (ext === ".csv") {
    rows = parseCsv(buffer.toString("utf8"));
  } else if (ext === ".xlsx") {
    rows = readXlsx(buffer);
  } else {
    throw new Error(`Unsupported tracker file extension "${ext}" - expected .csv or .xlsx`);
  }

  const [headerRow, ...dataRows] = rows;
  if (!headerRow) throw new Error(`"${filePath}" has no header row`);
  return { headers: headerRow.map((h) => h.trim()), rows: dataRows.filter((r) => r.some((c) => c.trim() !== "")) };
}

export function fileHash(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

// Case/whitespace-insensitive header lookup, since real-world tracker
// exports don't always match casing exactly.
export function headerIndex(headers: string[], name: string): number {
  const target = name.trim().toLowerCase();
  return headers.findIndex((h) => h.trim().toLowerCase() === target);
}

export function cell(row: string[], index: number): string {
  return index >= 0 && index < row.length ? row[index].trim() : "";
}

export function toIntOrNull(value: string): number | null {
  if (value === "") return null;
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n) : null;
}

export function toRealOrNull(value: string): number | null {
  if (value === "") return null;
  const n = Number(value.replace(/[%,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export type ImportSummary = {
  rowsRead: number;
  inserted: number;
  updated: number;
  unchanged: number;
  duplicatesIgnored: number;
  invalidRows: number;
};

export function recordImport(params: {
  filePath: string;
  fileType: "article_tracker" | "keyword_tracker" | "gsc_csv" | "gsc_xlsx";
  summary: ImportSummary;
  notes?: string;
}): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO imports
      (file_path, file_hash, file_type, imported_at, rows_read, inserted, updated, unchanged, duplicates_ignored, invalid_rows, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    params.filePath,
    fileHash(params.filePath),
    params.fileType,
    nowIso(),
    params.summary.rowsRead,
    params.summary.inserted,
    params.summary.updated,
    params.summary.unchanged,
    params.summary.duplicatesIgnored,
    params.summary.invalidRows,
    params.notes ?? null
  );
}

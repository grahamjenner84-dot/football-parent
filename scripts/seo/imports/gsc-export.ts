import path from "node:path";
import { upsertObservation } from "../gsc/persist";
import { loadTableFile, headerIndex, cell, toIntOrNull, toRealOrNull, recordImport, type ImportSummary } from "./shared";

// Historical GSC UI exports (Search Console -> Performance -> Export).
// Column names vary by which tab was exported ("Queries" vs "Pages") and
// whether it's a single combined table - so this looks for whichever of
// Query/Page/Clicks/Impressions/CTR/Position columns are present rather
// than requiring an exact shape. periodStart/periodEnd must be supplied by
// the caller since the file itself doesn't state its date range.
export function importGscExport(
  filePath: string,
  periodStart: string,
  periodEnd: string
): ImportSummary {
  const { headers, rows } = loadTableFile(filePath);
  const idx = {
    query: headerIndex(headers, "Top queries") !== -1 ? headerIndex(headers, "Top queries") : headerIndex(headers, "Query"),
    page: headerIndex(headers, "Top pages") !== -1 ? headerIndex(headers, "Top pages") : headerIndex(headers, "Page"),
    clicks: headerIndex(headers, "Clicks"),
    impressions: headerIndex(headers, "Impressions"),
    ctr: headerIndex(headers, "CTR"),
    position: headerIndex(headers, "Position"),
  };
  if (idx.query === -1 && idx.page === -1) {
    throw new Error(`"${filePath}" has neither a Query/"Top queries" nor a Page/"Top pages" column - not a recognised GSC export`);
  }
  if (idx.clicks === -1 || idx.impressions === -1) {
    throw new Error(`"${filePath}" is missing Clicks and/or Impressions columns - not a recognised GSC export`);
  }

  const summary: ImportSummary = { rowsRead: rows.length, inserted: 0, updated: 0, unchanged: 0, duplicatesIgnored: 0, invalidRows: 0 };
  const ext = path.extname(filePath).toLowerCase();
  const source = ext === ".xlsx" ? "xlsx_import" : "csv_import";
  const seen = new Set<string>();

  for (const row of rows) {
    const query = idx.query !== -1 ? cell(row, idx.query) || null : null;
    const page = idx.page !== -1 ? cell(row, idx.page) || null : null;
    if (!query && !page) {
      summary.invalidRows++;
      continue;
    }
    // A GSC query-only export has no page dimension - use a sentinel so it
    // still satisfies the (page_url, query, ...) identity instead of
    // colliding across every query row.
    const pageUrl = page ?? "(all pages)";
    const key = `${pageUrl}||${query ?? ""}`;
    if (seen.has(key)) {
      summary.duplicatesIgnored++;
      continue;
    }
    seen.add(key);

    const clicks = toIntOrNull(cell(row, idx.clicks)) ?? 0;
    const impressions = toIntOrNull(cell(row, idx.impressions)) ?? 0;
    const ctrRaw = idx.ctr !== -1 ? cell(row, idx.ctr) : "";
    const ctr = ctrRaw ? (toRealOrNull(ctrRaw) ?? 0) / (ctrRaw.includes("%") ? 100 : 1) : impressions ? clicks / impressions : 0;
    const position = idx.position !== -1 ? toRealOrNull(cell(row, idx.position)) : null;

    upsertObservation({
      pageUrl,
      query,
      date: null,
      periodStart,
      periodEnd,
      clicks,
      impressions,
      ctr,
      position,
      source,
    });
    summary.inserted++;
  }

  recordImport({ filePath, fileType: source === "xlsx_import" ? "gsc_xlsx" : "gsc_csv", summary });
  return summary;
}

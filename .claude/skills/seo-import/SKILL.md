---
name: seo-import
description: "Imports a Football Parent article tracker, keyword tracker, or historical GSC export (CSV/XLSX) into the local SQLite SEO database, deduping and preserving existing values. Use when the user gives a tracker/export file path to import."
---

# SEO Import

Imports a tracker or GSC export file into `seo-data/database/seo.db`.
Existing values are preserved unless the incoming file has a different,
non-empty value for that cell - a re-import of the same file should report
everything as unchanged, not silently duplicate or wipe data.

## Workflow

1. Ask for (or use the given) file path if not already provided. It must be
   `.csv` or `.xlsx`.
2. Identify which of the three file types it is:
   - **Article tracker**: has a `URL` column (identity key) plus columns
     among `Article, Category, Primary Keyword, Secondary Keywords, Cluster,
     Status, Total Target SV, GSC Impressions, GSC Clicks, GSC CTR,
     Avg Position, Opportunity Score, Priority, Notes`.
   - **Keyword tracker**: has a `Keyword` column (identity key) plus columns
     among `Volume, KD, Source, Target URL, Mapped Article, Keyword Type,
     Cluster, Notes, Low fruits volume`.
   - **GSC export**: has `Clicks`/`Impressions` plus `Query`/`Top queries`
     and/or `Page`/`Top pages`. If ambiguous, open the file's header row
     (`node -e` a quick peek, or just ask the user) before deciding.
3. Run the matching import:
   ```
   npx tsx scripts/seo/imports/cli.ts article <path>
   npx tsx scripts/seo/imports/cli.ts keyword <path>
   npx tsx scripts/seo/imports/cli.ts gsc <path> <periodStart YYYY-MM-DD> <periodEnd YYYY-MM-DD>
   ```
   The `gsc` import needs an explicit date range from the user - GSC's own
   UI export files don't state their date range internally.
4. Report exactly what the script returns: rows read, inserted, updated,
   unchanged, duplicates ignored, invalid rows. If `invalid_rows > 0`,
   explain why (missing identity column value) rather than just the count.

## Notes

- Article tracker rows are keyed on exact `URL` match. Keyword tracker rows
  are keyed on the normalised `(keyword, search_engine=google,
  location_code=2826, language_code=en)` identity - see
  `scripts/seo/shared/normalise.ts`.
- In-file duplicate rows (same identity twice in one import) are counted as
  `duplicates_ignored`, not inserted/updated twice.
- Every import is logged in the `imports` table (file path, hash, type,
  counts, timestamp) so `/seo-status` can show latest imports.

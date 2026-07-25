import "./helpers/env-setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { useTestDb } from "./helpers/test-db";
import { writeCsv } from "../../scripts/seo/shared/csv";
import { importArticleTracker, ARTICLE_TRACKER_COLUMNS } from "../../scripts/seo/imports/article-tracker";
import { importKeywordTracker, KEYWORD_TRACKER_COLUMNS } from "../../scripts/seo/imports/keyword-tracker";
import { importGscExport } from "../../scripts/seo/imports/gsc-export";
import { getDb } from "../../scripts/seo/database/db";

function tmpFile(name: string, contents: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "seo-import-test-"));
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, contents);
  return filePath;
}

test("importing an article tracker inserts a new row", () => {
  const ctx = useTestDb();
  try {
    const file = tmpFile(
      "article-tracker.csv",
      writeCsv([
        Array.from(ARTICLE_TRACKER_COLUMNS),
        ["https://www.footballparent.co.uk/a", "Article A", "cat", "kw", "", "", "live", 100, 50, 5, 0.1, 8, 40, "high", ""],
      ])
    );
    const summary = importArticleTracker(file);
    assert.equal(summary.inserted, 1);
    assert.equal(summary.rowsRead, 1);
  } finally {
    ctx.close();
  }
});

test("re-importing the exact same article tracker file reports everything as unchanged", () => {
  const ctx = useTestDb();
  try {
    const file = tmpFile(
      "article-tracker.csv",
      writeCsv([
        Array.from(ARTICLE_TRACKER_COLUMNS),
        ["https://www.footballparent.co.uk/a", "Article A", "cat", "kw", "", "", "live", 100, 50, 5, 0.1, 8, 40, "high", ""],
      ])
    );
    importArticleTracker(file);
    const second = importArticleTracker(file);
    assert.equal(second.inserted, 0);
    assert.equal(second.updated, 0);
    assert.equal(second.unchanged, 1);
  } finally {
    ctx.close();
  }
});

test("a blank cell in a re-imported row never overwrites an existing non-blank value", () => {
  const ctx = useTestDb();
  try {
    const withNotes = tmpFile(
      "a1.csv",
      writeCsv([Array.from(ARTICLE_TRACKER_COLUMNS), ["https://www.footballparent.co.uk/a", "", "", "", "", "", "", "", "", "", "", "", "", "", "important notes"]])
    );
    importArticleTracker(withNotes);

    const withoutNotes = tmpFile(
      "a2.csv",
      writeCsv([Array.from(ARTICLE_TRACKER_COLUMNS), ["https://www.footballparent.co.uk/a", "New Title", "", "", "", "", "", "", "", "", "", "", "", "", ""]])
    );
    importArticleTracker(withoutNotes);

    const db = getDb();
    const row = db.prepare("SELECT article, notes FROM pages WHERE url = ?").get("https://www.footballparent.co.uk/a") as {
      article: string;
      notes: string;
    };
    assert.equal(row.article, "New Title", "the non-blank incoming value should update");
    assert.equal(row.notes, "important notes", "the blank incoming value must not wipe the existing note");
  } finally {
    ctx.close();
  }
});

test("duplicate rows within a single article tracker file are ignored, not double-inserted", () => {
  const ctx = useTestDb();
  try {
    const file = tmpFile(
      "dupes.csv",
      writeCsv([
        Array.from(ARTICLE_TRACKER_COLUMNS),
        ["https://www.footballparent.co.uk/a", "First", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["https://www.footballparent.co.uk/a", "Second", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ])
    );
    const summary = importArticleTracker(file);
    assert.equal(summary.inserted, 1);
    assert.equal(summary.duplicatesIgnored, 1);
  } finally {
    ctx.close();
  }
});

test("a row missing the identity column (URL) is counted as invalid, not inserted", () => {
  const ctx = useTestDb();
  try {
    const file = tmpFile(
      "invalid.csv",
      writeCsv([Array.from(ARTICLE_TRACKER_COLUMNS), ["", "No URL", "", "", "", "", "", "", "", "", "", "", "", "", ""]])
    );
    const summary = importArticleTracker(file);
    assert.equal(summary.inserted, 0);
    assert.equal(summary.invalidRows, 1);
  } finally {
    ctx.close();
  }
});

test("keyword tracker import keys on normalised keyword identity, not exact casing", () => {
  const ctx = useTestDb();
  try {
    const first = tmpFile(
      "k1.csv",
      writeCsv([Array.from(KEYWORD_TRACKER_COLUMNS), ["Football Academy Trials", 1000, 40, "manual", "", "", "", "", "", ""]])
    );
    importKeywordTracker(first);

    const second = tmpFile(
      "k2.csv",
      writeCsv([Array.from(KEYWORD_TRACKER_COLUMNS), ["  football   academy trials  ", 1200, 40, "manual", "", "", "", "", "", ""]])
    );
    const summary = importKeywordTracker(second);

    assert.equal(summary.inserted, 0, "should match the existing keyword by normalised identity");
    assert.equal(summary.updated, 1, "volume changed from 1000 to 1200");

    const db = getDb();
    const count = db.prepare("SELECT COUNT(*) as c FROM keywords").get() as { c: number };
    assert.equal(count.c, 1);
  } finally {
    ctx.close();
  }
});

test("GSC export import persists period-aggregate observations with the given date range", () => {
  const ctx = useTestDb();
  try {
    const file = tmpFile(
      "gsc-export.csv",
      writeCsv([
        ["Query", "Clicks", "Impressions", "CTR", "Position"],
        ["football academy trials", 12, 300, "4%", 8.5],
      ])
    );
    const summary = importGscExport(file, "2026-06-01", "2026-06-28");
    assert.equal(summary.inserted, 1);

    const db = getDb();
    const row = db.prepare("SELECT * FROM gsc_observations WHERE query = ?").get("football academy trials") as {
      clicks: number;
      impressions: number;
      period_start: string;
      period_end: string;
      source: string;
    };
    assert.equal(row.clicks, 12);
    assert.equal(row.impressions, 300);
    assert.equal(row.period_start, "2026-06-01");
    assert.equal(row.period_end, "2026-06-28");
    assert.equal(row.source, "csv_import");
  } finally {
    ctx.close();
  }
});

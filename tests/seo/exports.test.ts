import "./helpers/env-setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import { useTestDb } from "./helpers/test-db";
import { parseCsv } from "../../scripts/seo/shared/csv";
import { importArticleTracker, ARTICLE_TRACKER_COLUMNS } from "../../scripts/seo/imports/article-tracker";
import { importKeywordTracker, KEYWORD_TRACKER_COLUMNS } from "../../scripts/seo/imports/keyword-tracker";
import { articleTrackerRows } from "../../scripts/seo/exports/article-tracker";
import { keywordTrackerRows } from "../../scripts/seo/exports/keyword-tracker";
import { writeCsv } from "../../scripts/seo/shared/csv";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function tmpFile(name: string, contents: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "seo-export-test-"));
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, contents);
  return filePath;
}

test("article tracker export column order exactly matches the documented tracker columns", () => {
  assert.deepEqual(Array.from(ARTICLE_TRACKER_COLUMNS), [
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
  ]);
});

test("keyword tracker export column order exactly matches the documented tracker columns", () => {
  assert.deepEqual(Array.from(KEYWORD_TRACKER_COLUMNS), [
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
  ]);
});

test("import -> export round trip preserves values and column order for the article tracker", () => {
  const ctx = useTestDb();
  try {
    const file = tmpFile(
      "rt.csv",
      writeCsv([
        Array.from(ARTICLE_TRACKER_COLUMNS),
        ["https://www.footballparent.co.uk/a", "Article A", "cat", "kw", "sec1; sec2", "cluster-1", "live", 500, 200, 20, 0.1, 7.5, 55, "high", "note"],
      ])
    );
    importArticleTracker(file);

    const rows = articleTrackerRows();
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0], [
      "https://www.footballparent.co.uk/a",
      "Article A",
      "cat",
      "kw",
      "sec1; sec2",
      "cluster-1",
      "live",
      500,
      200,
      20,
      0.1,
      7.5,
      55,
      "high",
      "note",
    ]);
  } finally {
    ctx.close();
  }
});

test("import -> export round trip preserves values for the keyword tracker", () => {
  const ctx = useTestDb();
  try {
    const file = tmpFile(
      "kt.csv",
      writeCsv([Array.from(KEYWORD_TRACKER_COLUMNS), ["football academy trials", 1300, 42, "dataforseo", "", "", "informational", "trials", "n", 1]])
    );
    importKeywordTracker(file);

    const rows = keywordTrackerRows();
    assert.equal(rows.length, 1);
    assert.equal(rows[0][0], "football academy trials");
    assert.equal(rows[0][1], 1300);
    assert.equal(rows[0][2], 42);
  } finally {
    ctx.close();
  }
});

test("writeCsv output is re-parseable with parseCsv (round trip)", () => {
  const rows = [["a", "b,c", 'd "quote"'], ["1", "2", "3"]];
  const csv = writeCsv(rows);
  const back = parseCsv(csv);
  assert.deepEqual(
    back.map((r) => r.map(String)),
    rows.map((r) => r.map(String))
  );
});

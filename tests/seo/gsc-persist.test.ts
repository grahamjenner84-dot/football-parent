import "./helpers/env-setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import { useTestDb } from "./helpers/test-db";
import { upsertObservation } from "../../scripts/seo/gsc/persist";
import { getDb } from "../../scripts/seo/database/db";

test("upsertObservation inserts a new row and creates the parent page", () => {
  const ctx = useTestDb();
  try {
    upsertObservation({
      pageUrl: "https://www.footballparent.co.uk/a",
      query: "football academy trials",
      date: null,
      periodStart: "2026-06-01",
      periodEnd: "2026-06-28",
      clicks: 10,
      impressions: 200,
      ctr: 0.05,
      position: 8.2,
      source: "live_service_account",
    });

    const db = getDb();
    const obs = db.prepare("SELECT * FROM gsc_observations").all();
    assert.equal(obs.length, 1);
    const page = db.prepare("SELECT * FROM pages WHERE url = ?").get("https://www.footballparent.co.uk/a");
    assert.ok(page, "GSC persistence must also ensure a pages row exists for the URL");
  } finally {
    ctx.close();
  }
});

test("upsertObservation is idempotent - re-persisting the same identity refreshes values, never duplicates", () => {
  const ctx = useTestDb();
  try {
    const base = {
      pageUrl: "https://www.footballparent.co.uk/a",
      query: "football academy trials",
      date: null,
      periodStart: "2026-06-01",
      periodEnd: "2026-06-28",
      source: "live_service_account" as const,
    };
    upsertObservation({ ...base, clicks: 10, impressions: 200, ctr: 0.05, position: 8.2 });
    upsertObservation({ ...base, clicks: 15, impressions: 250, ctr: 0.06, position: 7.9 });

    const db = getDb();
    const rows = db.prepare("SELECT * FROM gsc_observations WHERE page_url = ? AND query = ?").all(base.pageUrl, base.query) as {
      clicks: number;
      impressions: number;
    }[];
    assert.equal(rows.length, 1, "re-persisting the same (page, query, date, period, source) identity must update in place");
    assert.equal(rows[0].clicks, 15);
    assert.equal(rows[0].impressions, 250);
  } finally {
    ctx.close();
  }
});

test("daily rows and period-aggregate rows for the same page do not collide", () => {
  const ctx = useTestDb();
  try {
    upsertObservation({
      pageUrl: "https://www.footballparent.co.uk/a",
      query: "x",
      date: null,
      periodStart: "2026-06-01",
      periodEnd: "2026-06-28",
      clicks: 1,
      impressions: 1,
      ctr: 1,
      position: 1,
      source: "live_service_account",
    });
    upsertObservation({
      pageUrl: "https://www.footballparent.co.uk/a",
      query: "x",
      date: "2026-06-15",
      periodStart: "2026-06-15",
      periodEnd: "2026-06-15",
      clicks: 1,
      impressions: 1,
      ctr: 1,
      position: 1,
      source: "live_service_account",
    });

    const db = getDb();
    const count = db.prepare("SELECT COUNT(*) as c FROM gsc_observations").get() as { c: number };
    assert.equal(count.c, 2);
  } finally {
    ctx.close();
  }
});

test("different sources (live vs csv import) for the same page/query/date do not overwrite each other", () => {
  const ctx = useTestDb();
  try {
    const shared = { pageUrl: "https://www.footballparent.co.uk/a", query: "x", date: null, periodStart: "2026-06-01", periodEnd: "2026-06-28" };
    upsertObservation({ ...shared, clicks: 1, impressions: 1, ctr: 1, position: 1, source: "live_service_account" });
    upsertObservation({ ...shared, clicks: 2, impressions: 2, ctr: 1, position: 1, source: "csv_import" });

    const db = getDb();
    const count = db.prepare("SELECT COUNT(*) as c FROM gsc_observations").get() as { c: number };
    assert.equal(count.c, 2, "source is part of the identity - a historical CSV import must not overwrite a live pull");
  } finally {
    ctx.close();
  }
});

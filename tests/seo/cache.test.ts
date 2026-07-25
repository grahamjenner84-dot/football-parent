import "./helpers/env-setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import { useTestDb } from "./helpers/test-db";
import { getDb } from "../../scripts/seo/database/db";
import { lookupCache, writeCache, planRequests, freshnessDaysFor } from "../../scripts/seo/dataforseo/cache";
import { CACHE_FRESHNESS_DAYS } from "../../scripts/seo/shared/types";

function insertFakeRawResponse(): number {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO raw_responses (api_family, endpoint, request_hash, environment, is_sandbox, file_path, status, result_count, cost)
       VALUES ('dataforseo_labs', 'x', 'x', 'sandbox', 1, 'seo-data/raw/x.json', 'ok', 1, 0)`
    )
    .run();
  return Number(result.lastInsertRowid);
}

test("cache freshness days match the documented table", () => {
  assert.equal(freshnessDaysFor("gsc"), 7);
  assert.equal(freshnessDaysFor("google_ads_volume"), 90);
  assert.equal(freshnessDaysFor("keyword_difficulty"), 90);
  assert.equal(freshnessDaysFor("search_intent"), 180);
  assert.equal(freshnessDaysFor("keyword_discovery"), 90);
  assert.equal(freshnessDaysFor("monthly_search_history"), 90);
  assert.equal(freshnessDaysFor("trends"), 30);
  assert.equal(freshnessDaysFor("competitor_rankings"), 30);
  assert.equal(freshnessDaysFor("backlinks"), 30);
  assert.equal(freshnessDaysFor("app_data"), 30);
  assert.equal(Object.keys(CACHE_FRESHNESS_DAYS).length, 10);
});

test("lookupCache reports missing when no record exists", () => {
  const ctx = useTestDb();
  try {
    const result = lookupCache({
      apiFamily: "dataforseo_labs",
      endpoint: "e",
      environment: "sandbox",
      cacheFamily: "keyword_discovery",
      params: { a: 1 },
    });
    assert.equal(result.status, "missing");
  } finally {
    ctx.close();
  }
});

test("lookupCache reports fresh immediately after writeCache", () => {
  const ctx = useTestDb();
  try {
    const rawId = insertFakeRawResponse();
    const params = { apiFamily: "dataforseo_labs", endpoint: "e", environment: "sandbox" as const, cacheFamily: "keyword_discovery" as const, params: { a: 1 } };
    const hash = lookupCache(params).hash;
    writeCache({ ...params, hash, rawResponseId: rawId });
    const result = lookupCache(params);
    assert.equal(result.status, "fresh");
  } finally {
    ctx.close();
  }
});

test("lookupCache reports stale once expires_at has passed", () => {
  const ctx = useTestDb();
  try {
    const rawId = insertFakeRawResponse();
    const params = { apiFamily: "dataforseo_labs", endpoint: "e", environment: "sandbox" as const, cacheFamily: "trends" as const, params: { a: 1 } };
    const hash = lookupCache(params).hash;
    writeCache({ ...params, hash, rawResponseId: rawId });

    // Force expiry into the past directly - simulates 30+ days passing.
    const db = getDb();
    db.prepare("UPDATE cache_records SET expires_at = datetime('now', '-1 day') WHERE request_hash = ?").run(hash);

    const result = lookupCache(params);
    assert.equal(result.status, "stale");
  } finally {
    ctx.close();
  }
});

test("planRequests buckets rows into cached/missing/stale", () => {
  const ctx = useTestDb();
  try {
    const rawId = insertFakeRawResponse();
    const freshParams = { apiFamily: "dataforseo_labs", endpoint: "e", environment: "sandbox" as const, cacheFamily: "keyword_discovery" as const, params: { a: "fresh" } };
    const freshHash = lookupCache(freshParams).hash;
    writeCache({ ...freshParams, hash: freshHash, rawResponseId: rawId });

    const missingParams = { apiFamily: "dataforseo_labs", endpoint: "e", environment: "sandbox" as const, cacheFamily: "keyword_discovery" as const, params: { a: "missing" } };

    const plan = planRequests([
      { ...freshParams, label: "fresh-one" },
      { ...missingParams, label: "missing-one" },
    ]);

    assert.equal(plan.cached.length, 1);
    assert.equal(plan.cached[0].label, "fresh-one");
    assert.equal(plan.missing.length, 1);
    assert.equal(plan.missing[0].label, "missing-one");
    assert.equal(plan.stale.length, 0);
  } finally {
    ctx.close();
  }
});

test("sandbox and live requests with identical params never collide in the cache", () => {
  const ctx = useTestDb();
  try {
    const rawId = insertFakeRawResponse();
    const sandboxParams = { apiFamily: "dataforseo_labs", endpoint: "e", environment: "sandbox" as const, cacheFamily: "keyword_discovery" as const, params: { a: 1 } };
    const liveParams = { ...sandboxParams, environment: "live" as const };

    const sandboxHash = lookupCache(sandboxParams).hash;
    writeCache({ ...sandboxParams, hash: sandboxHash, rawResponseId: rawId });

    const liveLookup = lookupCache(liveParams);
    assert.equal(liveLookup.status, "missing");
    assert.notEqual(liveLookup.hash, sandboxHash);
  } finally {
    ctx.close();
  }
});

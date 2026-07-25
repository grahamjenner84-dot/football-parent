import "./helpers/env-setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { useTestDb } from "./helpers/test-db";
import { installMockFetch } from "./helpers/mock-fetch";
import { dataForSeoRequest, LiveCallRefused } from "../../scripts/seo/dataforseo/client";
import { getDb } from "../../scripts/seo/database/db";
import { REPO_ROOT } from "../../scripts/seo/shared/env";

const okEnvelope = {
  status_code: 20000,
  status_message: "Ok.",
  cost: 0,
  tasks: [{ id: "t1", status_code: 20000, status_message: "Ok.", cost: 0, result_count: 2, result: [{ a: 1 }, { a: 2 }] }],
};

function cleanupRaw(relPath: string | null) {
  if (!relPath) return;
  const abs = path.join(REPO_ROOT, relPath);
  if (fs.existsSync(abs)) fs.rmSync(abs);
}

test("a successful sandbox request stores the raw response, writes cache, and logs api_usage as a miss", async () => {
  const ctx = useTestDb();
  const mock = installMockFetch([{ status: 200, body: okEnvelope }]);
  let rawPath: string | null = null;
  try {
    const result = await dataForSeoRequest({
      workflow: "test",
      apiFamily: "dataforseo_labs",
      cacheFamily: "keyword_discovery",
      endpoint: "dataforseo_labs/google/keyword_ideas/live",
      body: { keywords: ["football academy trials"], location_code: 2826, language_code: "en" },
    });
    rawPath = result.rawResponsePath;

    assert.equal(result.cacheStatus, "miss");
    assert.equal(result.environment, "sandbox");
    assert.equal(result.isSandbox, true);
    assert.equal(result.resultCount, 2);
    assert.equal(result.cost, 0);
    assert.equal(mock.calls.length, 1);
    assert.match(mock.calls[0].url, /^https:\/\/sandbox\.dataforseo\.com\/v3\//);

    assert.ok(result.rawResponsePath);
    assert.ok(fs.existsSync(path.join(REPO_ROOT, result.rawResponsePath!)));
    const stored = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, result.rawResponsePath!), "utf8"));
    assert.equal(stored.status_code, 20000);

    const db = getDb();
    const usage = db.prepare("SELECT * FROM api_usage WHERE request_hash = ?").get(result.requestHash) as { cache_status: string; is_sandbox: number };
    assert.equal(usage.cache_status, "miss");
    assert.equal(usage.is_sandbox, 1);

    const rawRow = db.prepare("SELECT * FROM raw_responses WHERE request_hash = ?").get(result.requestHash) as { status: string };
    assert.equal(rawRow.status, "ok");
  } finally {
    cleanupRaw(rawPath);
    mock.restore();
    ctx.close();
  }
});

test("an identical second request is served from cache with no second network call", async () => {
  const ctx = useTestDb();
  const mock = installMockFetch([{ status: 200, body: okEnvelope }]); // only one step queued
  let rawPath: string | null = null;
  try {
    const opts = {
      workflow: "test",
      apiFamily: "dataforseo_labs" as const,
      cacheFamily: "keyword_discovery" as const,
      endpoint: "dataforseo_labs/google/keyword_ideas/live",
      body: { keywords: ["football academy trials"], location_code: 2826, language_code: "en" },
    };
    const first = await dataForSeoRequest(opts);
    rawPath = first.rawResponsePath;
    const second = await dataForSeoRequest(opts);

    assert.equal(first.cacheStatus, "miss");
    assert.equal(second.cacheStatus, "hit");
    assert.equal(second.requestHash, first.requestHash);
    assert.equal(mock.calls.length, 1, "the second call must not hit the network");
  } finally {
    cleanupRaw(rawPath);
    mock.restore();
    ctx.close();
  }
});

test("a malformed JSON response is recorded as an error and not cached", async () => {
  const ctx = useTestDb();
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response("{not valid json", { status: 200 })) as typeof fetch;
  let rawPath: string | null = null;
  try {
    const result = await dataForSeoRequest({
      workflow: "test",
      apiFamily: "dataforseo_labs",
      cacheFamily: "keyword_discovery",
      endpoint: "dataforseo_labs/google/keyword_ideas/live",
      body: { keywords: ["x"], location_code: 2826, language_code: "en" },
    });
    rawPath = result.rawResponsePath;
    assert.equal(result.error, "malformed_json_response");

    const db = getDb();
    const cached = db.prepare("SELECT COUNT(*) as c FROM cache_records").get() as { c: number };
    assert.equal(cached.c, 0, "an error response must never be cached");
  } finally {
    cleanupRaw(rawPath);
    globalThis.fetch = original;
    ctx.close();
  }
});

test("an HTTP error response is recorded with status and not cached", async () => {
  const ctx = useTestDb();
  const mock = installMockFetch([{ status: 500, body: { status_message: "server error" } }]);
  let rawPath: string | null = null;
  try {
    const result = await dataForSeoRequest({
      workflow: "test",
      apiFamily: "dataforseo_labs",
      cacheFamily: "keyword_discovery",
      endpoint: "dataforseo_labs/google/keyword_ideas/live",
      body: { keywords: ["x"], location_code: 2826, language_code: "en" },
    });
    rawPath = result.rawResponsePath;
    assert.match(result.error ?? "", /HTTP 500/);
  } finally {
    cleanupRaw(rawPath);
    mock.restore();
    ctx.close();
  }
});

test("a rate-limited (429) response is identified distinctly", async () => {
  const ctx = useTestDb();
  const mock = installMockFetch([{ status: 429, body: {} }]);
  let rawPath: string | null = null;
  try {
    const result = await dataForSeoRequest({
      workflow: "test",
      apiFamily: "dataforseo_labs",
      cacheFamily: "keyword_discovery",
      endpoint: "dataforseo_labs/google/keyword_ideas/live",
      body: { keywords: ["x"], location_code: 2826, language_code: "en" },
    });
    rawPath = result.rawResponsePath;
    assert.match(result.error ?? "", /rate_limited/);
  } finally {
    cleanupRaw(rawPath);
    mock.restore();
    ctx.close();
  }
});

test("a task-level error in an otherwise-ok envelope is recorded as partial", async () => {
  const ctx = useTestDb();
  const partialEnvelope = {
    status_code: 20000,
    status_message: "Ok.",
    cost: 0,
    tasks: [{ id: "t1", status_code: 40501, status_message: "Invalid field", cost: 0, result: [] }],
  };
  const mock = installMockFetch([{ status: 200, body: partialEnvelope }]);
  let rawPath: string | null = null;
  try {
    const result = await dataForSeoRequest({
      workflow: "test",
      apiFamily: "dataforseo_labs",
      cacheFamily: "keyword_discovery",
      endpoint: "dataforseo_labs/google/keyword_ideas/live",
      body: { keywords: ["x"], location_code: 2826, language_code: "en" },
    });
    rawPath = result.rawResponsePath;
    const db = getDb();
    const rawRow = db.prepare("SELECT status FROM raw_responses WHERE request_hash = ?").get(result.requestHash) as { status: string };
    assert.equal(rawRow.status, "partial");
    assert.match(result.error ?? "", /40501/);
  } finally {
    cleanupRaw(rawPath);
    mock.restore();
    ctx.close();
  }
});

test("a live request is refused when DATAFORSEO_ALLOW_LIVE is not true, even with confirmLive:true", async () => {
  const ctx = useTestDb();
  const originalAllow = process.env.DATAFORSEO_ALLOW_LIVE;
  process.env.DATAFORSEO_ALLOW_LIVE = "false";
  try {
    await assert.rejects(
      () =>
        dataForSeoRequest({
          workflow: "test",
          apiFamily: "dataforseo_labs",
          cacheFamily: "keyword_discovery",
          endpoint: "dataforseo_labs/google/keyword_ideas/live",
          body: { keywords: ["x"], location_code: 2826, language_code: "en" },
          environment: "live",
          confirmLive: true,
        }),
      LiveCallRefused
    );
  } finally {
    process.env.DATAFORSEO_ALLOW_LIVE = originalAllow;
    ctx.close();
  }
});

test("a live request is refused when confirmLive is not explicitly true, even if env flags allow it", async () => {
  const ctx = useTestDb();
  const originalEnv = process.env.DATAFORSEO_ENV;
  const originalAllow = process.env.DATAFORSEO_ALLOW_LIVE;
  process.env.DATAFORSEO_ENV = "live";
  process.env.DATAFORSEO_ALLOW_LIVE = "true";
  try {
    await assert.rejects(
      () =>
        dataForSeoRequest({
          workflow: "test",
          apiFamily: "dataforseo_labs",
          cacheFamily: "keyword_discovery",
          endpoint: "dataforseo_labs/google/keyword_ideas/live",
          body: { keywords: ["x"], location_code: 2826, language_code: "en" },
          environment: "live",
          // confirmLive intentionally omitted
        }),
      LiveCallRefused
    );
  } finally {
    process.env.DATAFORSEO_ENV = originalEnv;
    process.env.DATAFORSEO_ALLOW_LIVE = originalAllow;
    ctx.close();
  }
});

test("credentials never leak into a stored error message", async () => {
  const ctx = useTestDb();
  const secretPassword = process.env.DATAFORSEO_PASSWORD!;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error(`connection failed for user with password ${secretPassword}`);
  }) as typeof fetch;
  let rawPath: string | null = null;
  try {
    const result = await dataForSeoRequest({
      workflow: "test",
      apiFamily: "dataforseo_labs",
      cacheFamily: "keyword_discovery",
      endpoint: "dataforseo_labs/google/keyword_ideas/live",
      body: { keywords: ["x"], location_code: 2826, language_code: "en" },
    });
    rawPath = result.rawResponsePath;
    assert.ok(result.error);
    assert.ok(!result.error!.includes(secretPassword), "the raw password must never appear in a stored error");
    assert.match(result.error!, /<redacted:DATAFORSEO_PASSWORD>/);

    const db = getDb();
    const rawRow = db.prepare("SELECT error FROM raw_responses WHERE request_hash = ?").get(result.requestHash) as { error: string };
    assert.ok(!rawRow.error.includes(secretPassword));
  } finally {
    cleanupRaw(rawPath);
    globalThis.fetch = original;
    ctx.close();
  }
});

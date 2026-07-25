import "./helpers/env-setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { useTestDb } from "./helpers/test-db";
import { installMockFetch } from "./helpers/mock-fetch";
import { dataForSeoRequest } from "../../scripts/seo/dataforseo/client";
import { getDb } from "../../scripts/seo/database/db";
import { REPO_ROOT } from "../../scripts/seo/shared/env";

// Guard suite: fails the whole run if sandbox/live separation, the live
// safety gate, or credential redaction ever regress. This is the test the
// task brief explicitly calls for - it must never call api.dataforseo.com.

const okEnvelope = { status_code: 20000, status_message: "Ok.", cost: 0, tasks: [{ status_code: 20000, result_count: 0, result: [] }] };

function cleanupRaw(relPath: string | null) {
  if (!relPath) return;
  const abs = path.join(REPO_ROOT, relPath);
  if (fs.existsSync(abs)) fs.rmSync(abs);
}

test("GUARD: sandbox and live responses are always correctly is_sandbox-tagged and never mixed", async () => {
  const ctx = useTestDb();
  const mock = installMockFetch([{ status: 200, body: okEnvelope }, { status: 200, body: okEnvelope }]);
  const originalEnv = process.env.DATAFORSEO_ENV;
  const originalAllow = process.env.DATAFORSEO_ALLOW_LIVE;
  const rawPaths: (string | null)[] = [];
  try {
    const sandboxResult = await dataForSeoRequest({
      workflow: "guard-test",
      apiFamily: "dataforseo_labs",
      cacheFamily: "keyword_discovery",
      endpoint: "dataforseo_labs/google/keyword_ideas/live",
      body: { keywords: ["a"], location_code: 2826, language_code: "en" },
    });
    rawPaths.push(sandboxResult.rawResponsePath);

    process.env.DATAFORSEO_ENV = "live";
    process.env.DATAFORSEO_ALLOW_LIVE = "true";
    const liveResult = await dataForSeoRequest({
      workflow: "guard-test",
      apiFamily: "dataforseo_labs",
      cacheFamily: "keyword_discovery",
      endpoint: "dataforseo_labs/google/keyword_ideas/live",
      body: { keywords: ["b"], location_code: 2826, language_code: "en" }, // different body -> different hash, avoids a cache hit
      environment: "live",
      confirmLive: true,
    });
    rawPaths.push(liveResult.rawResponsePath);

    const db = getDb();
    const rows = db.prepare("SELECT request_hash, environment, is_sandbox FROM raw_responses ORDER BY id").all() as {
      environment: string;
      is_sandbox: number;
    }[];
    assert.equal(rows.length, 2);
    assert.equal(rows[0].environment, "sandbox");
    assert.equal(rows[0].is_sandbox, 1);
    assert.equal(rows[1].environment, "live");
    assert.equal(rows[1].is_sandbox, 0);

    const cacheRows = db.prepare("SELECT environment, is_sandbox FROM cache_records ORDER BY id").all() as { environment: string; is_sandbox: number }[];
    assert.deepEqual(
      cacheRows.map((r) => r.environment),
      ["sandbox", "live"]
    );
    // A report scoped to environment='live' must be able to exclude sandbox
    // rows by this flag alone.
    const liveOnly = db.prepare("SELECT COUNT(*) as c FROM raw_responses WHERE environment = 'live' AND is_sandbox = 1").get() as { c: number };
    assert.equal(liveOnly.c, 0, "no row may claim both environment=live and is_sandbox=1");
  } finally {
    for (const p of rawPaths) cleanupRaw(p);
    process.env.DATAFORSEO_ENV = originalEnv;
    process.env.DATAFORSEO_ALLOW_LIVE = originalAllow;
    mock.restore();
    ctx.close();
  }
});

test("GUARD: a live call is refused (and no network reached) while DATAFORSEO_ALLOW_LIVE=false", async () => {
  const ctx = useTestDb();
  const mock = installMockFetch([]); // zero steps queued - any fetch call throws
  const originalAllow = process.env.DATAFORSEO_ALLOW_LIVE;
  process.env.DATAFORSEO_ALLOW_LIVE = "false";
  try {
    await assert.rejects(() =>
      dataForSeoRequest({
        workflow: "guard-test",
        apiFamily: "dataforseo_labs",
        cacheFamily: "keyword_discovery",
        endpoint: "dataforseo_labs/google/keyword_ideas/live",
        body: { keywords: ["c"], location_code: 2826, language_code: "en" },
        environment: "live",
        confirmLive: true,
      })
    );
    assert.equal(mock.calls.length, 0, "the live hostname must never be contacted while DATAFORSEO_ALLOW_LIVE=false");
  } finally {
    process.env.DATAFORSEO_ALLOW_LIVE = originalAllow;
    mock.restore();
    ctx.close();
  }
});

test("GUARD: no scripts/seo source file logs a raw credential env var", () => {
  const scriptsDir = path.join(REPO_ROOT, "scripts", "seo");
  const credentialVars = ["DATAFORSEO_PASSWORD", "DATAFORSEO_LOGIN", "DATAFORSEO_USERNAME", "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"];
  const offenders: string[] = [];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts")) {
        const content = fs.readFileSync(full, "utf8");
        for (const line of content.split("\n")) {
          const hasLogCall = /console\.(log|error|warn|info)/.test(line);
          const hasCredentialVar = credentialVars.some((v) => line.includes(`process.env.${v}`));
          if (hasLogCall && hasCredentialVar) offenders.push(`${path.relative(REPO_ROOT, full)}: ${line.trim()}`);
        }
      }
    }
  }
  walk(scriptsDir);

  assert.deepEqual(offenders, [], `found credential env vars passed directly to a console.* call:\n${offenders.join("\n")}`);
});

test("GUARD: credentials never survive into a raw_responses.error value after a failed request", async () => {
  const ctx = useTestDb();
  const secretPassword = process.env.DATAFORSEO_PASSWORD!;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error(`auth failed: ${secretPassword}`);
  }) as typeof fetch;
  let rawPath: string | null = null;
  try {
    const result = await dataForSeoRequest({
      workflow: "guard-test",
      apiFamily: "dataforseo_labs",
      cacheFamily: "keyword_discovery",
      endpoint: "dataforseo_labs/google/keyword_ideas/live",
      body: { keywords: ["d"], location_code: 2826, language_code: "en" },
    });
    rawPath = result.rawResponsePath;
    const db = getDb();
    const row = db.prepare("SELECT error FROM raw_responses WHERE request_hash = ?").get(result.requestHash) as { error: string };
    assert.ok(!row.error.includes(secretPassword));

    if (result.rawResponsePath) {
      const fileContent = fs.readFileSync(path.join(REPO_ROOT, result.rawResponsePath), "utf8");
      assert.ok(!fileContent.includes(secretPassword), "the raw response file on disk must never contain the credential");
    }
  } finally {
    cleanupRaw(rawPath);
    globalThis.fetch = original;
    ctx.close();
  }
});

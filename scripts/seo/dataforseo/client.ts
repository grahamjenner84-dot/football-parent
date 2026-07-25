import fs from "node:fs";
import path from "node:path";
import {
  REPO_ROOT,
  getDataForSeoCredentials,
  getDataForSeoEnvironment,
  isLiveAllowedByEnv,
  dataForSeoBaseUrl,
  redactSecrets,
  type DataForSeoEnvironment,
} from "../shared/env";
import { getDb, nowIso } from "../database/db";
import { lookupCache, writeCache, type CacheLookupParams } from "./cache";
import type { CacheFamily } from "../shared/types";

const RAW_DIR = path.join(REPO_ROOT, "seo-data", "raw");

export class LiveCallRefused extends Error {
  constructor(reason: string) {
    super(`Live DataForSEO call refused: ${reason}`);
    this.name = "LiveCallRefused";
  }
}

// The three-factor live gate. All three must independently be true:
//  1. DATAFORSEO_ENV=live in .env.local (an explicit, durable file edit)
//  2. DATAFORSEO_ALLOW_LIVE=true in .env.local (a second explicit file edit)
//  3. confirmLive=true passed in code by the caller - this can only be set
//     by whoever is writing/running the calling script in this session,
//     immediately after the user has explicitly approved that specific
//     request. It must never be derived from raw CLI argv/env at the
//     boundary (a stray `--live` flag or inherited env var is not consent).
function assertLiveAllowed(confirmLive: boolean | undefined): void {
  if (!isLiveAllowedByEnv()) {
    throw new LiveCallRefused(
      "DATAFORSEO_ENV must be 'live' and DATAFORSEO_ALLOW_LIVE must be 'true' in .env.local"
    );
  }
  if (confirmLive !== true) {
    throw new LiveCallRefused(
      "caller did not pass confirmLive: true - this must only be set after explicit user approval in the current session"
    );
  }
}

export function environmentBanner(env: DataForSeoEnvironment): string {
  return env === "sandbox"
    ? "SANDBOX — DUMMY DATA — NO SEO CONCLUSIONS"
    : "LIVE — POTENTIALLY CHARGEABLE";
}

function resolveEnvironment(requested: DataForSeoEnvironment | undefined): DataForSeoEnvironment {
  // Default to sandbox when unspecified. A caller can only ever *attempt*
  // live by explicitly requesting it - resolveEnvironment never upgrades
  // sandbox to live on its own, and assertLiveAllowed still has to pass.
  if (requested === "live") return "live";
  return getDataForSeoEnvironment() === "live" && requested === undefined ? "live" : requested ?? "sandbox";
}

type DataForSeoResponseEnvelope = {
  status_code?: number;
  status_message?: string;
  cost?: number;
  tasks_count?: number;
  tasks_error?: number;
  tasks?: Array<{
    id?: string;
    status_code?: number;
    status_message?: string;
    cost?: number;
    result_count?: number;
    result?: unknown[];
  }>;
};

export type DataForSeoRequestOptions = {
  workflow: string;
  apiFamily: string;
  cacheFamily: CacheFamily;
  endpoint: string; // e.g. "dataforseo_labs/google/keyword_ideas/live"
  body: Record<string, unknown>;
  environment?: DataForSeoEnvironment;
  confirmLive?: boolean;
  forceRefresh?: boolean;
  // cache identity metadata, stored alongside the cache record for
  // human-readable cache-status reporting
  seedTerms?: string[];
  locationCode?: number;
  languageCode?: string;
  filters?: unknown;
  limit?: number;
  dateRangeStart?: string;
  dateRangeEnd?: string;
};

export type DataForSeoResult = {
  cacheStatus: "hit" | "miss" | "stale-refreshed" | "refused";
  environment: DataForSeoEnvironment;
  isSandbox: boolean;
  requestHash: string;
  cost: number | null;
  resultCount: number | null;
  data: DataForSeoResponseEnvelope | null;
  rawResponsePath: string | null;
  error: string | null;
};

function ensureRawDir(apiFamily: string): string {
  const dir = path.join(RAW_DIR, apiFamily);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function insertRawResponse(row: {
  apiFamily: string;
  endpoint: string;
  requestHash: string;
  environment: DataForSeoEnvironment;
  filePath: string;
  status: "ok" | "partial" | "error";
  resultCount: number | null;
  cost: number | null;
  error: string | null;
}): number {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO raw_responses
        (api_family, endpoint, request_hash, environment, is_sandbox, retrieved_at, file_path, status, result_count, cost, error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      row.apiFamily,
      row.endpoint,
      row.requestHash,
      row.environment,
      row.environment === "sandbox" ? 1 : 0,
      nowIso(),
      row.filePath,
      row.status,
      row.resultCount,
      row.cost,
      row.error
    );
  return Number(result.lastInsertRowid);
}

function logUsage(row: {
  workflow: string;
  apiFamily: string;
  endpoint: string;
  environment: DataForSeoEnvironment;
  requestHash: string;
  resultCount: number | null;
  cost: number | null;
  cacheStatus: "hit" | "miss" | "stale-refreshed" | "refused";
  error: string | null;
}): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO api_usage
      (occurred_at, workflow, api_family, endpoint, environment, is_sandbox, request_hash, result_count, cost, cache_status, error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    nowIso(),
    row.workflow,
    row.apiFamily,
    row.endpoint,
    row.environment,
    row.environment === "sandbox" ? 1 : 0,
    row.requestHash,
    row.resultCount,
    row.cost,
    row.cacheStatus,
    row.error
  );
}

function extractCostAndCount(data: DataForSeoResponseEnvelope): { cost: number | null; resultCount: number | null } {
  const cost = typeof data.cost === "number" ? data.cost : null;
  const task = data.tasks?.[0];
  const resultCount =
    typeof task?.result_count === "number"
      ? task.result_count
      : Array.isArray(task?.result)
        ? task!.result!.length
        : null;
  return { cost, resultCount };
}

// Core request function. Cache-first: a fresh cache_records hit never
// touches the network, regardless of environment. A miss/stale record
// performs exactly one HTTP call (sandbox by default; live only past
// assertLiveAllowed) and persists the raw response before any analysis
// happens, per the task brief's "save the response before analysing it".
export async function dataForSeoRequest(opts: DataForSeoRequestOptions): Promise<DataForSeoResult> {
  const environment = resolveEnvironment(opts.environment);
  const isSandbox = environment === "sandbox";

  const cacheParams: CacheLookupParams = {
    apiFamily: opts.apiFamily,
    endpoint: opts.endpoint,
    environment,
    cacheFamily: opts.cacheFamily,
    params: opts.body,
  };

  if (!opts.forceRefresh) {
    const lookup = lookupCache(cacheParams);
    if (lookup.status === "fresh") {
      const db = getDb();
      const raw = db.prepare("SELECT * FROM raw_responses WHERE id = ?").get(lookup.record.raw_response_id) as
        | { file_path: string; cost: number | null; result_count: number | null }
        | undefined;
      const data = raw ? (JSON.parse(fs.readFileSync(path.join(REPO_ROOT, raw.file_path), "utf8")) as DataForSeoResponseEnvelope) : null;
      logUsage({
        workflow: opts.workflow,
        apiFamily: opts.apiFamily,
        endpoint: opts.endpoint,
        environment,
        requestHash: lookup.hash,
        resultCount: raw?.result_count ?? null,
        cost: raw?.cost ?? null,
        cacheStatus: "hit",
        error: null,
      });
      return {
        cacheStatus: "hit",
        environment,
        isSandbox,
        requestHash: lookup.hash,
        cost: raw?.cost ?? null,
        resultCount: raw?.result_count ?? null,
        data,
        rawResponsePath: raw?.file_path ?? null,
        error: null,
      };
    }
  }

  console.log(environmentBanner(environment));

  if (environment === "live") {
    try {
      assertLiveAllowed(opts.confirmLive);
    } catch (err) {
      const hash = lookupCache(cacheParams).hash;
      logUsage({
        workflow: opts.workflow,
        apiFamily: opts.apiFamily,
        endpoint: opts.endpoint,
        environment,
        requestHash: hash,
        resultCount: null,
        cost: null,
        cacheStatus: "refused",
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  const { username, password } = getDataForSeoCredentials();
  const baseUrl = dataForSeoBaseUrl(environment);
  const url = `${baseUrl}/${opts.endpoint}`.replace(/([^:])\/\/+/g, "$1/");
  const auth = Buffer.from(`${username}:${password}`).toString("base64");

  const hashResult = lookupCache(cacheParams);
  const requestHash = hashResult.hash;

  let status: "ok" | "partial" | "error" = "ok";
  let errorMessage: string | null = null;
  let data: DataForSeoResponseEnvelope | null = null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify([opts.body]),
    });

    if (res.status === 429) {
      status = "error";
      errorMessage = "rate_limited (HTTP 429)";
    } else if (!res.ok) {
      status = "error";
      errorMessage = `HTTP ${res.status}: ${redactSecrets(await res.text().catch(() => ""))}`;
    } else {
      const text = await res.text();
      try {
        data = JSON.parse(text) as DataForSeoResponseEnvelope;
      } catch {
        status = "error";
        errorMessage = "malformed_json_response";
      }
      if (data) {
        if (data.status_code !== 20000) {
          status = "partial";
          errorMessage = `${data.status_code}: ${data.status_message ?? "unknown envelope error"}`;
        }
        const task = data.tasks?.[0];
        if (task && task.status_code !== undefined && task.status_code !== 20000) {
          status = "partial";
          errorMessage = `task ${task.status_code}: ${task.status_message ?? "unknown task error"}`;
        }
      }
    }
  } catch (err) {
    status = "error";
    errorMessage = redactSecrets(err instanceof Error ? err.message : String(err));
  }

  const dir = ensureRawDir(opts.apiFamily);
  const fileName = `${requestHash}.json`;
  const absPath = path.join(dir, fileName);
  fs.writeFileSync(absPath, data ? JSON.stringify(data, null, 2) : JSON.stringify({ error: errorMessage }, null, 2));
  const relPath = path.relative(REPO_ROOT, absPath).replace(/\\/g, "/");

  const { cost, resultCount } = data ? extractCostAndCount(data) : { cost: null, resultCount: null };

  const rawResponseId = insertRawResponse({
    apiFamily: opts.apiFamily,
    endpoint: opts.endpoint,
    requestHash,
    environment,
    filePath: relPath,
    status,
    resultCount,
    cost,
    error: errorMessage,
  });

  if (status !== "error") {
    writeCache({
      ...cacheParams,
      hash: requestHash,
      rawResponseId,
      seedTerms: opts.seedTerms,
      locationCode: opts.locationCode,
      languageCode: opts.languageCode,
      filters: opts.filters,
      limit: opts.limit,
      dateRangeStart: opts.dateRangeStart,
      dateRangeEnd: opts.dateRangeEnd,
    });
  }

  logUsage({
    workflow: opts.workflow,
    apiFamily: opts.apiFamily,
    endpoint: opts.endpoint,
    environment,
    requestHash,
    resultCount,
    cost,
    cacheStatus: hashResult.status === "stale" ? "stale-refreshed" : "miss",
    error: errorMessage,
  });

  return {
    cacheStatus: hashResult.status === "stale" ? "stale-refreshed" : "miss",
    environment,
    isSandbox,
    requestHash,
    cost,
    resultCount,
    data,
    rawResponsePath: relPath,
    error: errorMessage,
  };
}

// --- task_post / task_get endpoints -------------------------------------
// A few API families (google_trends explore, app_data) are task-based
// rather than /live: POST creates a task, GET (after a short delay) returns
// the result. Cached and stored the same way as dataForSeoRequest - one
// cache_records row keyed on the task_post body, one raw_responses row
// holding the final task_get envelope - so callers don't need to know the
// difference.
export type DataForSeoTaskRequestOptions = DataForSeoRequestOptions & {
  postEndpoint: string; // e.g. "keywords_data/google_trends/explore/task_post"
  getEndpointFor: (taskId: string) => string; // e.g. id => `keywords_data/google_trends/explore/task_get/${id}`
  pollAttempts?: number;
  pollDelayMs?: number;
};

async function fetchDataForSeo(
  endpoint: string,
  environment: DataForSeoEnvironment,
  body: unknown,
  method: "GET" | "POST" = "POST"
): Promise<{ data: DataForSeoResponseEnvelope | null; error: string | null }> {
  const { username, password } = getDataForSeoCredentials();
  const baseUrl = dataForSeoBaseUrl(environment);
  const url = `${baseUrl}/${endpoint}`.replace(/([^:])\/\/+/g, "$1/");
  const auth = Buffer.from(`${username}:${password}`).toString("base64");

  // task_get is a GET request with no body - DataForSEO returns its own
  // "POST Data Is Empty"/routing error if it's POSTed instead, confirmed
  // against the real sandbox while wiring this up.
  const res = await fetch(url, {
    method,
    headers:
      method === "GET"
        ? { Authorization: `Basic ${auth}` }
        : { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    ...(method === "POST" ? { body: JSON.stringify(Array.isArray(body) ? body : [body]) } : {}),
  });

  if (res.status === 429) return { data: null, error: "rate_limited (HTTP 429)" };
  if (!res.ok) return { data: null, error: `HTTP ${res.status}: ${redactSecrets(await res.text().catch(() => ""))}` };

  const text = await res.text();
  try {
    return { data: JSON.parse(text) as DataForSeoResponseEnvelope, error: null };
  } catch {
    return { data: null, error: "malformed_json_response" };
  }
}

export async function dataForSeoTaskRequest(opts: DataForSeoTaskRequestOptions): Promise<DataForSeoResult> {
  const environment = resolveEnvironment(opts.environment);
  const isSandbox = environment === "sandbox";

  const cacheParams: CacheLookupParams = {
    apiFamily: opts.apiFamily,
    endpoint: opts.endpoint,
    environment,
    cacheFamily: opts.cacheFamily,
    params: opts.body,
  };

  if (!opts.forceRefresh) {
    const lookup = lookupCache(cacheParams);
    if (lookup.status === "fresh") {
      const db = getDb();
      const raw = db.prepare("SELECT * FROM raw_responses WHERE id = ?").get(lookup.record.raw_response_id) as
        | { file_path: string; cost: number | null; result_count: number | null }
        | undefined;
      const data = raw ? (JSON.parse(fs.readFileSync(path.join(REPO_ROOT, raw.file_path), "utf8")) as DataForSeoResponseEnvelope) : null;
      logUsage({
        workflow: opts.workflow,
        apiFamily: opts.apiFamily,
        endpoint: opts.endpoint,
        environment,
        requestHash: lookup.hash,
        resultCount: raw?.result_count ?? null,
        cost: raw?.cost ?? null,
        cacheStatus: "hit",
        error: null,
      });
      return {
        cacheStatus: "hit",
        environment,
        isSandbox,
        requestHash: lookup.hash,
        cost: raw?.cost ?? null,
        resultCount: raw?.result_count ?? null,
        data,
        rawResponsePath: raw?.file_path ?? null,
        error: null,
      };
    }
  }

  console.log(environmentBanner(environment));

  if (environment === "live") {
    assertLiveAllowed(opts.confirmLive);
  }

  const requestHash = lookupCache(cacheParams).hash;
  const hashResult = lookupCache(cacheParams);
  const pollAttempts = opts.pollAttempts ?? 5;
  const pollDelayMs = opts.pollDelayMs ?? 1500;

  let status: "ok" | "partial" | "error" = "ok";
  let errorMessage: string | null = null;
  let data: DataForSeoResponseEnvelope | null = null;

  try {
    const posted = await fetchDataForSeo(opts.postEndpoint, environment, opts.body);
    if (posted.error || !posted.data) {
      status = "error";
      errorMessage = posted.error ?? "task_post returned no data";
    } else {
      const taskId = posted.data.tasks?.[0]?.id;
      if (!taskId) {
        status = "error";
        errorMessage = `task_post response had no task id: ${posted.data.status_message ?? "unknown"}`;
      } else {
        let getResult: { data: DataForSeoResponseEnvelope | null; error: string | null } | null = null;
        for (let attempt = 0; attempt < pollAttempts; attempt++) {
          await new Promise((r) => setTimeout(r, pollDelayMs));
          getResult = await fetchDataForSeo(opts.getEndpointFor(taskId), environment, undefined, "GET");
          const task = getResult.data?.tasks?.[0];
          if (task?.result && task.result.length > 0) break;
        }
        if (!getResult || getResult.error || !getResult.data) {
          status = "error";
          errorMessage = getResult?.error ?? "task_get returned no data";
        } else {
          data = getResult.data;
          const task = data.tasks?.[0];
          if (!task?.result || task.result.length === 0) {
            status = "partial";
            errorMessage = "task not ready after poll attempts exhausted";
          } else if (task.status_code !== undefined && task.status_code !== 20000) {
            status = "partial";
            errorMessage = `task ${task.status_code}: ${task.status_message ?? "unknown task error"}`;
          }
        }
      }
    }
  } catch (err) {
    status = "error";
    errorMessage = redactSecrets(err instanceof Error ? err.message : String(err));
  }

  const dir = ensureRawDir(opts.apiFamily);
  const absPath = path.join(dir, `${requestHash}.json`);
  fs.writeFileSync(absPath, data ? JSON.stringify(data, null, 2) : JSON.stringify({ error: errorMessage }, null, 2));
  const relPath = path.relative(REPO_ROOT, absPath).replace(/\\/g, "/");

  const { cost, resultCount } = data ? extractCostAndCount(data) : { cost: null, resultCount: null };

  const rawResponseId = insertRawResponse({
    apiFamily: opts.apiFamily,
    endpoint: opts.endpoint,
    requestHash,
    environment,
    filePath: relPath,
    status,
    resultCount,
    cost,
    error: errorMessage,
  });

  if (status !== "error") {
    writeCache({
      ...cacheParams,
      hash: requestHash,
      rawResponseId,
      seedTerms: opts.seedTerms,
      locationCode: opts.locationCode,
      languageCode: opts.languageCode,
      filters: opts.filters,
      limit: opts.limit,
      dateRangeStart: opts.dateRangeStart,
      dateRangeEnd: opts.dateRangeEnd,
    });
  }

  logUsage({
    workflow: opts.workflow,
    apiFamily: opts.apiFamily,
    endpoint: opts.endpoint,
    environment,
    requestHash,
    resultCount,
    cost,
    cacheStatus: hashResult.status === "stale" ? "stale-refreshed" : "miss",
    error: errorMessage,
  });

  return {
    cacheStatus: hashResult.status === "stale" ? "stale-refreshed" : "miss",
    environment,
    isSandbox,
    requestHash,
    cost,
    resultCount,
    data,
    rawResponsePath: relPath,
    error: errorMessage,
  };
}

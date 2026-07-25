import { getDb, nowIso } from "../database/db";
import { CACHE_FRESHNESS_DAYS, type CacheFamily, type DataForSeoEnvironment } from "../shared/types";
import { requestHash, type HashableRequest } from "../shared/hash";

export type CacheLookupParams = {
  apiFamily: string;
  endpoint: string;
  environment: DataForSeoEnvironment;
  cacheFamily: CacheFamily;
  params: Record<string, unknown>;
};

export type CacheRecordRow = {
  id: number;
  request_hash: string;
  raw_response_id: number;
  created_at: string;
  expires_at: string;
};

export type CacheLookupResult =
  | { status: "fresh"; hash: string; record: CacheRecordRow }
  | { status: "stale"; hash: string; record: CacheRecordRow }
  | { status: "missing"; hash: string };

export function computeHash(p: CacheLookupParams): string {
  const req: HashableRequest = {
    apiFamily: p.apiFamily,
    endpoint: p.endpoint,
    environment: p.environment,
    params: p.params,
  };
  return requestHash(req);
}

// Sandbox and live never share a cache record - the hash includes
// `environment`, and sandbox rows are additionally flagged is_sandbox=1 so
// they can never be mistaken for genuine keyword evidence downstream (see
// dataforseo/client.ts and the sandbox/live-separation guard test).
export function lookupCache(p: CacheLookupParams): CacheLookupResult {
  const db = getDb();
  const hash = computeHash(p);
  const row = db
    .prepare("SELECT id, request_hash, raw_response_id, created_at, expires_at FROM cache_records WHERE request_hash = ?")
    .get(hash) as CacheRecordRow | undefined;

  if (!row) return { status: "missing", hash };

  const fresh = new Date(row.expires_at).getTime() > Date.now();
  return fresh ? { status: "fresh", hash, record: row } : { status: "stale", hash, record: row };
}

export function freshnessDaysFor(cacheFamily: CacheFamily): number {
  return CACHE_FRESHNESS_DAYS[cacheFamily];
}

export type WriteCacheParams = CacheLookupParams & {
  hash: string;
  rawResponseId: number;
  seedTerms?: string[];
  locationCode?: number;
  languageCode?: string;
  filters?: unknown;
  limit?: number;
  dateRangeStart?: string;
  dateRangeEnd?: string;
};

export function writeCache(p: WriteCacheParams): void {
  const db = getDb();
  const days = freshnessDaysFor(p.cacheFamily);
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(
    `INSERT INTO cache_records
      (request_hash, api_family, endpoint, environment, is_sandbox, cache_family, params_json,
       seed_terms, location_code, language_code, filters_json, result_limit,
       date_range_start, date_range_end, raw_response_id, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(request_hash) DO UPDATE SET
       raw_response_id = excluded.raw_response_id,
       created_at = excluded.created_at,
       expires_at = excluded.expires_at`
  ).run(
    p.hash,
    p.apiFamily,
    p.endpoint,
    p.environment,
    p.environment === "sandbox" ? 1 : 0,
    p.cacheFamily,
    JSON.stringify(p.params),
    p.seedTerms ? JSON.stringify(p.seedTerms) : null,
    p.locationCode ?? null,
    p.languageCode ?? null,
    p.filters !== undefined ? JSON.stringify(p.filters) : null,
    p.limit ?? null,
    p.dateRangeStart ?? null,
    p.dateRangeEnd ?? null,
    p.rawResponseId,
    createdAt,
    expiresAt
  );
}

export type CachePlanRow = CacheLookupParams & { label: string };

export type CachePlan = {
  cached: { label: string; hash: string }[];
  missing: { label: string; hash: string }[];
  stale: { label: string; hash: string }[];
};

// Before every live request: show cached vs missing vs stale so the caller
// (a skill, ultimately a human) can see exactly what will actually hit the
// network before approving it.
export function planRequests(rows: CachePlanRow[]): CachePlan {
  const plan: CachePlan = { cached: [], missing: [], stale: [] };
  for (const row of rows) {
    const result = lookupCache(row);
    if (result.status === "fresh") plan.cached.push({ label: row.label, hash: result.hash });
    else if (result.status === "stale") plan.stale.push({ label: row.label, hash: result.hash });
    else plan.missing.push({ label: row.label, hash: result.hash });
  }
  return plan;
}

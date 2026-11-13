import { createHash } from "node:crypto";
import { seoAdminClient } from "./supabase";

// Live DataForSEO calls for the SEO connector (/api/mcp), behind a daily
// spend cap. Server only: the credentials are Vercel env vars and must never
// be returned, logged or put in an error message.
//
// How the cap works:
//  1. Every paid call first writes a 'pending' row to seo_mcp_usage at its
//     worst-case cost (RESERVE_USD), so two calls at once can't both slip
//     under the cap.
//  2. Before that, the last 24 hours of seo_mcp_usage are summed; at or over
//     the cap the call is refused and DataForSEO is never contacted.
//  3. After the call the row is corrected to the cost DataForSEO reports.
//  4. Results go in seo_mcp_cache; a fresh cached answer costs nothing.
//
// The cap is MCP_DATAFORSEO_BUDGET_USD (default 3), clamped to
// HARD_CEILING_USD so a typo in Vercel can't open the account up. Only the
// connector's own spend counts: PC research is capped separately.

const BASE_URL = "https://api.dataforseo.com/v3/";
const DEFAULT_BUDGET_USD = 3;
const HARD_CEILING_USD = 25;

export const UK_LOCATION_CODE = 2826;
export const ENGLISH = "en";

export type PaidEndpoint =
  | "serp/google/organic/live/advanced"
  | "keywords_data/google_trends/explore/live"
  | "dataforseo_labs/google/keyword_suggestions/live"
  | "dataforseo_labs/google/related_keywords/live"
  | "dataforseo_labs/google/ranked_keywords/live"
  | "backlinks/summary/live";

// Worst-case cost reserved before each call. Typical costs from the local
// api_usage ledger: SERP depth 20 ~$0.004 (more with async AI Overview and
// PAA expansion), trends ~$0.0055, suggestions/related ~$0.01-0.03 at 100
// results, ranked keywords ~$0.03, backlink summary ~$0.024.
const RESERVE_USD: Record<PaidEndpoint, number> = {
  "serp/google/organic/live/advanced": 0.02,
  "keywords_data/google_trends/explore/live": 0.01,
  "dataforseo_labs/google/keyword_suggestions/live": 0.05,
  "dataforseo_labs/google/related_keywords/live": 0.05,
  "dataforseo_labs/google/ranked_keywords/live": 0.06,
  "backlinks/summary/live": 0.04,
};

export class SpendCapReached extends Error {
  constructor(spent: number, budget: number) {
    super(
      `Spend cap reached: $${spent.toFixed(3)} of $${budget.toFixed(2)} used by the connector in the last 24 hours. ` +
        "No call was made. Cached results still work; the cap is MCP_DATAFORSEO_BUDGET_USD in Vercel and only Graham can change it."
    );
    this.name = "SpendCapReached";
  }
}

export class DataForSeoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataForSeoError";
  }
}

export function budgetUsd(): number {
  const raw = process.env.MCP_DATAFORSEO_BUDGET_USD;
  const parsed = raw === undefined || raw.trim() === "" ? DEFAULT_BUDGET_USD : Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, HARD_CEILING_USD);
}

export async function connectorSpend(sinceMs: number): Promise<number> {
  const supabase = seoAdminClient();
  const since = new Date(Date.now() - sinceMs).toISOString();
  const { data, error } = await supabase.from("seo_mcp_usage").select("cost").gte("occurred_at", since);
  if (error) throw new Error(`Could not read the spend ledger: ${error.message}`);
  return (data ?? []).reduce((sum, row) => sum + Number(row.cost ?? 0), 0);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function credentials(): string {
  const login = process.env.DATAFORSEO_LOGIN || process.env.DATAFORSEO_USERNAME;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    throw new DataForSeoError("DataForSEO is not set up on the server (DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD missing in Vercel).");
  }
  return Buffer.from(`${login}:${password}`).toString("base64");
}

type Envelope = {
  status_code?: number;
  status_message?: string;
  cost?: number;
  tasks?: Array<{ status_code?: number; status_message?: string; cost?: number; result?: unknown[] | null }>;
};

export type PaidResult = {
  result: unknown;
  costUsd: number;
  fromCache: boolean;
  fetchedAt: string;
  spentLast24hUsd: number;
  budgetUsd: number;
};

// One paid DataForSEO call, through the cache and the cap. Returns the
// task's result[0] as DataForSEO sent it; callers shape it.
export async function paidCall(opts: {
  tool: string;
  endpoint: PaidEndpoint;
  body: Record<string, unknown>;
  maxAgeHours: number;
  refresh?: boolean;
}): Promise<PaidResult> {
  const supabase = seoAdminClient();
  const requestHash = createHash("sha256").update(`${opts.endpoint}|${stableStringify(opts.body)}`).digest("hex");
  const budget = budgetUsd();

  if (!opts.refresh) {
    const { data: cached, error } = await supabase
      .from("seo_mcp_cache")
      .select("result, fetched_at")
      .eq("request_hash", requestHash)
      .maybeSingle();
    if (error) throw new Error(`Could not read the cache: ${error.message}`);
    if (cached && Date.now() - new Date(cached.fetched_at).getTime() < opts.maxAgeHours * 3_600_000) {
      await supabase.from("seo_mcp_usage").insert({
        tool: opts.tool,
        endpoint: opts.endpoint,
        request_hash: requestHash,
        cost: 0,
        status: "cache_hit",
      });
      return {
        result: cached.result,
        costUsd: 0,
        fromCache: true,
        fetchedAt: cached.fetched_at,
        spentLast24hUsd: await connectorSpend(86_400_000),
        budgetUsd: budget,
      };
    }
  }

  const auth = credentials();
  const reserve = RESERVE_USD[opts.endpoint];
  const spent = await connectorSpend(86_400_000);
  if (spent + reserve > budget) {
    await supabase.from("seo_mcp_usage").insert({
      tool: opts.tool,
      endpoint: opts.endpoint,
      request_hash: requestHash,
      cost: 0,
      status: "refused",
      error: "spend cap",
    });
    throw new SpendCapReached(spent, budget);
  }

  const { data: ledgerRow, error: ledgerError } = await supabase
    .from("seo_mcp_usage")
    .insert({ tool: opts.tool, endpoint: opts.endpoint, request_hash: requestHash, cost: reserve, status: "pending" })
    .select("id")
    .single();
  if (ledgerError || !ledgerRow) throw new Error(`Could not write the spend ledger, so no call was made: ${ledgerError?.message}`);

  let envelope: Envelope | null = null;
  let failure: string | null = null;
  try {
    const res = await fetch(BASE_URL + opts.endpoint, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify([opts.body]),
    });
    if (!res.ok) {
      // The body of a non-200 is DataForSEO's own message; it never echoes
      // the Authorization header, but keep it short anyway.
      failure = `DataForSEO HTTP ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`;
    } else {
      envelope = (await res.json()) as Envelope;
      const task = envelope.tasks?.[0];
      if (envelope.status_code !== 20000) failure = `DataForSEO ${envelope.status_code}: ${envelope.status_message}`;
      else if (!task || task.status_code !== 20000) failure = `DataForSEO task ${task?.status_code}: ${task?.status_message}`;
    }
  } catch (err) {
    failure = `DataForSEO request failed: ${err instanceof Error ? err.message : String(err)}`;
  }

  // A failed request can still be charged; trust the reported cost when
  // there is one, otherwise keep the reserve on the books.
  const reported = envelope?.tasks?.[0]?.cost ?? envelope?.cost;
  const cost = typeof reported === "number" ? reported : failure ? reserve : 0;
  await supabase
    .from("seo_mcp_usage")
    .update({ cost, status: failure ? "error" : "ok", error: failure })
    .eq("id", ledgerRow.id);

  if (failure) throw new DataForSeoError(failure);

  const result = envelope?.tasks?.[0]?.result?.[0] ?? null;
  const fetchedAt = new Date().toISOString();
  await supabase.from("seo_mcp_cache").upsert({
    request_hash: requestHash,
    endpoint: opts.endpoint,
    request: opts.body,
    result,
    cost,
    fetched_at: fetchedAt,
  });

  return {
    result,
    costUsd: cost,
    fromCache: false,
    fetchedAt,
    spentLast24hUsd: await connectorSpend(86_400_000),
    budgetUsd: budget,
  };
}

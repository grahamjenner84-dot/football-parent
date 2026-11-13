// Pushes the PC's SEO research data up to the football-parent-social
// Supabase project, so the SEO connector (/api/mcp) can read it from the
// Claude app on a phone. One way only: PC -> Supabase. The PC stays the
// source of truth; the seo_* tables are replaced from it each run.
//
//   npm run seo:sync                 # push everything
//   npm run seo:sync -- --dry-run    # count what would be pushed, write nothing
//   npm run seo:sync -- --root <dir> # read seo.db / csv / jsonl / .env.local from another checkout
//
// What goes up:
//   seo-data/database/seo.db  -> seo_pages, seo_keywords, seo_keyword_metrics,
//                                seo_monthly_search_history, seo_page_keywords,
//                                seo_discovery_runs, seo_discovery_results,
//                                seo_api_usage_local (live, non-cache-hit calls)
//   ai-citation-log.csv       -> seo_ai_citations (source = 'csv' rows only;
//                                the connector's own 'mcp' rows are kept)
//   seo-data/exports/geo-watchlist-history.jsonl -> seo_geo_watchlist_history
//
// Sandbox rows are left out: they are dummy data. Raw DataForSEO responses,
// the cache and GSC observations stay on the PC.
//
// Targets SUPABASE_URL from .env.local and refuses to run unless it is the
// football-parent-social project (jwlwzoklgrzharqvazeg).
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "../../lib/load-env";
import { REPO_ROOT } from "../shared/env";

const SOCIAL_PROJECT_REF = "jwlwzoklgrzharqvazeg";
const CHUNK = 500;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const rootArg = args.indexOf("--root");
const root = rootArg !== -1 && args[rootArg + 1] ? path.resolve(args[rootArg + 1]) : REPO_ROOT;

loadEnvLocal(root);

const DB_PATH = path.join(root, "seo-data", "database", "seo.db");
const CSV_PATH = path.join(root, "ai-citation-log.csv");
const JSONL_PATH = path.join(root, "seo-data", "exports", "geo-watchlist-history.jsonl");

type Row = Record<string, unknown>;

// One mirror: the SQLite query that feeds it.
const MIRRORS: Array<{ table: string; sql: string }> = [
  {
    table: "seo_pages",
    sql: `SELECT id, url, article, category, primary_keyword, secondary_keywords, cluster, status, total_target_sv,
            gsc_impressions, gsc_clicks, gsc_ctr, avg_position, opportunity_score, priority, notes, fact_checked_at,
            seo_optimised_at, last_reviewed_at, personal_story_count, expert_quote_count, inbound_internal_links,
            voice_pct, updated_at
          FROM pages`,
  },
  {
    table: "seo_keywords",
    sql: `SELECT id, keyword, normalised_keyword, volume, kd, source, target_url, mapped_article, keyword_type, cluster, notes, updated_at
          FROM keywords`,
  },
  {
    table: "seo_keyword_metrics",
    // competition is sometimes a level ("LOW") rather than 0-1 in SQLite; only numbers go up.
    sql: `SELECT id, keyword_id, retrieved_at, search_volume, cpc,
            CASE WHEN typeof(competition) IN ('real', 'integer') THEN competition END AS competition,
            keyword_difficulty, search_intent
          FROM keyword_metrics WHERE is_sandbox = 0`,
  },
  {
    table: "seo_monthly_search_history",
    sql: `SELECT id, keyword_id, year, month, search_volume FROM monthly_search_history WHERE is_sandbox = 0`,
  },
  { table: "seo_page_keywords", sql: `SELECT id, page_id, keyword_id, relationship FROM page_keywords` },
  {
    table: "seo_discovery_runs",
    sql: `SELECT id, run_type, page_id, endpoint, seed_terms, created_at FROM discovery_runs WHERE is_sandbox = 0`,
  },
  {
    table: "seo_discovery_results",
    sql: `SELECT r.id, r.discovery_run_id, r.keyword_id, r.relevance_flag, r.classification, r.rationale
          FROM discovery_results r JOIN discovery_runs d ON d.id = r.discovery_run_id WHERE d.is_sandbox = 0`,
  },
  {
    table: "seo_api_usage_local",
    sql: `SELECT id, occurred_at, workflow, endpoint, cost FROM api_usage
          WHERE environment = 'live' AND cache_status != 'hit' AND COALESCE(cost, 0) > 0`,
  },
];

// Minimal CSV parser: quoted fields, doubled quotes, commas and newlines in
// quotes. The citation log is written by csvEscape in the PC scripts.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

function citationRows(): Row[] {
  if (!fs.existsSync(CSV_PATH)) return [];
  const [header, ...lines] = parseCsv(fs.readFileSync(CSV_PATH, "utf8"));
  const col = (name: string) => header.indexOf(name);
  const out: Row[] = [];
  for (const l of lines) {
    const date = l[col("date")]?.trim();
    const prompt = l[col("prompt")]?.trim();
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !prompt) continue;
    const citedRaw = (l[col("cited")] ?? "").trim().toUpperCase();
    const pos = Number((l[col("citation_position")] ?? "").trim());
    out.push({
      checked_on: date,
      platform: (l[col("platform")] ?? "").trim() || "unknown",
      prompt,
      cited: citedRaw === "Y" || citedRaw === "YES" ? true : citedRaw === "N" || citedRaw === "NO" ? false : null,
      citation_position: Number.isFinite(pos) && pos > 0 ? pos : null,
      competitor_domains: (l[col("competitor_domains_cited")] ?? "").trim() || null,
      notes: (l[col("notes")] ?? "").trim() || null,
      source: "csv",
    });
  }
  return out;
}

function watchlistRows(): Row[] {
  if (!fs.existsSync(JSONL_PATH)) return [];
  return fs
    .readFileSync(JSONL_PATH, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .flatMap((l) => {
      try {
        const d = JSON.parse(l) as { date?: string; keyword?: string };
        return d.date && d.keyword ? [{ checked_on: d.date, keyword: d.keyword, data: d }] : [];
      } catch {
        return [];
      }
    });
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error(`SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not found in ${path.join(root, ".env.local")}`);
  if (!url.includes(SOCIAL_PROJECT_REF)) {
    throw new Error("SUPABASE_URL is not the football-parent-social project. Refusing to push SEO data anywhere else.");
  }
  if (!fs.existsSync(DB_PATH)) throw new Error(`No SEO database at ${DB_PATH}`);

  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  const plan: Array<{ table: string; rows: Row[]; keepWhere?: [string, string] }> = MIRRORS.map((m) => ({
    table: m.table,
    rows: db.prepare(m.sql).all() as Row[],
  }));
  db.close();
  plan.push({ table: "seo_ai_citations", rows: citationRows(), keepWhere: ["source", "mcp"] });
  plan.push({ table: "seo_geo_watchlist_history", rows: watchlistRows() });

  for (const p of plan) console.log(`${p.table.padEnd(28)} ${String(p.rows.length).padStart(6)} rows`);
  if (dryRun) {
    console.log("\nDry run: nothing written.");
    return;
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  for (const p of plan) {
    // Replace: clear the PC's rows, then insert the current set. Mirrors with
    // a keepWhere keep the connector's own rows (seo_ai_citations source='mcp').
    let del = supabase.from(p.table).delete();
    del = p.keepWhere ? del.neq(p.keepWhere[0], p.keepWhere[1]) : del.not("id", "is", null);
    const { error: delError } = await del;
    if (delError) throw new Error(`Clearing ${p.table} failed: ${delError.message}`);
    for (let i = 0; i < p.rows.length; i += CHUNK) {
      const { error } = await supabase.from(p.table).insert(p.rows.slice(i, i + CHUNK));
      if (error) throw new Error(`Inserting into ${p.table} failed at row ${i}: ${error.message}`);
    }
  }

  const now = new Date().toISOString();
  const { error: metaError } = await supabase.from("seo_sync_meta").upsert([
    { key: "sqlite", value: now, updated_at: now },
    { key: "citations", value: now, updated_at: now },
  ]);
  if (metaError) throw new Error(`Writing the sync time failed: ${metaError.message}`);
  console.log(`\nSynced to football-parent-social at ${now}.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});

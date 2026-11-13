-- SEO research data for the Football Parent SEO connector (/api/mcp), so the
-- Claude app on a phone can read what the local SEO system knows and run a
-- few capped DataForSEO checks.
--
-- Two kinds of table:
--
-- 1. seo_* mirrors of the local SQLite database (seo-data/database/seo.db)
--    and of two committed files (ai-citation-log.csv,
--    seo-data/exports/geo-watchlist-history.jsonl). Written only by
--    `npm run seo:sync` (scripts/seo/cli/sync-to-supabase.ts), which replaces
--    their contents from the PC. The PC stays the source of truth; these are
--    read-only copies for the connector. Ids are the SQLite ids, kept so the
--    joins work, which is why they are plain bigint keys, not identities.
--
-- 2. seo_mcp_usage / seo_mcp_cache, written by the connector itself
--    (lib/seo-research/). seo_mcp_usage is the spend ledger behind the daily
--    cap (MCP_DATAFORSEO_BUDGET_USD), seo_mcp_cache keeps paid results so a
--    repeat question costs nothing. Rows in seo_ai_citations with
--    source = 'mcp' are checks made from the connector; the sync never
--    deletes those.
--
-- Public research data only: keywords, our own pages, Google results. Lives
-- in the football-parent-social project (ref jwlwzoklgrzharqvazeg), never
-- the Coach App or Progress projects. See CLAUDE.md "Supabase projects".

create table if not exists seo_pages (
  id bigint primary key,
  url text not null,
  article text,
  category text,
  primary_keyword text,
  secondary_keywords text,
  cluster text,
  status text,
  total_target_sv integer,
  gsc_impressions integer,
  gsc_clicks integer,
  gsc_ctr double precision,
  avg_position double precision,
  opportunity_score double precision,
  priority text,
  notes text,
  fact_checked_at text,
  seo_optimised_at text,
  last_reviewed_at text,
  personal_story_count integer,
  expert_quote_count integer,
  inbound_internal_links integer,
  voice_pct double precision,
  updated_at text
);

create table if not exists seo_keywords (
  id bigint primary key,
  keyword text not null,
  normalised_keyword text not null,
  volume integer,
  kd double precision,
  source text,
  target_url text,
  mapped_article text,
  keyword_type text,
  cluster text,
  notes text,
  updated_at text
);
create index if not exists seo_keywords_normalised on seo_keywords (normalised_keyword);

create table if not exists seo_keyword_metrics (
  id bigint primary key,
  keyword_id bigint not null,
  retrieved_at text not null,
  search_volume integer,
  cpc double precision,
  competition double precision,
  keyword_difficulty double precision,
  search_intent text
);
create index if not exists seo_keyword_metrics_keyword on seo_keyword_metrics (keyword_id, retrieved_at);

create table if not exists seo_monthly_search_history (
  id bigint primary key,
  keyword_id bigint not null,
  year integer not null,
  month integer not null,
  search_volume integer
);
create index if not exists seo_monthly_search_history_keyword on seo_monthly_search_history (keyword_id);

create table if not exists seo_page_keywords (
  id bigint primary key,
  page_id bigint not null,
  keyword_id bigint not null,
  relationship text not null
);
create index if not exists seo_page_keywords_keyword on seo_page_keywords (keyword_id);
create index if not exists seo_page_keywords_page on seo_page_keywords (page_id);

create table if not exists seo_discovery_runs (
  id bigint primary key,
  run_type text not null,
  page_id bigint,
  endpoint text not null,
  seed_terms text not null,
  created_at text not null
);

create table if not exists seo_discovery_results (
  id bigint primary key,
  discovery_run_id bigint not null,
  keyword_id bigint not null,
  relevance_flag text,
  classification text,
  rationale text
);
create index if not exists seo_discovery_results_run on seo_discovery_results (discovery_run_id);

-- Live, chargeable DataForSEO calls made from the PC (api_usage in SQLite,
-- cache hits and sandbox calls left out).
create table if not exists seo_api_usage_local (
  id bigint primary key,
  occurred_at text not null,
  workflow text not null,
  endpoint text not null,
  cost double precision
);
create index if not exists seo_api_usage_local_date on seo_api_usage_local (occurred_at);

create table if not exists seo_ai_citations (
  id bigint generated always as identity primary key,
  checked_on date not null,
  platform text not null,
  prompt text not null,
  -- null when the row says nothing either way (some early manual rows)
  cited boolean,
  citation_position integer,
  competitor_domains text,
  notes text,
  -- 'csv' rows are replaced by the sync; 'mcp' rows are the connector's own
  source text not null default 'csv' check (source in ('csv', 'mcp')),
  created_at timestamptz not null default now()
);
create index if not exists seo_ai_citations_prompt on seo_ai_citations (prompt);
create index if not exists seo_ai_citations_date on seo_ai_citations (checked_on);

create table if not exists seo_geo_watchlist_history (
  id bigint generated always as identity primary key,
  checked_on date not null,
  keyword text not null,
  data jsonb not null
);

-- When each mirror was last pushed from the PC, so the connector can say how
-- fresh its copy is.
create table if not exists seo_sync_meta (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

-- Spend ledger for the connector's DataForSEO calls. A row is written with
-- the worst-case cost before the call goes out (status 'pending'), then
-- corrected to the cost DataForSEO reports, so two calls at once cannot both
-- slip under the cap.
create table if not exists seo_mcp_usage (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  tool text not null,
  endpoint text not null,
  request_hash text not null,
  cost numeric(10, 5) not null default 0,
  status text not null check (status in ('pending', 'ok', 'error', 'cache_hit', 'refused')),
  error text
);
create index if not exists seo_mcp_usage_date on seo_mcp_usage (occurred_at);

create table if not exists seo_mcp_cache (
  request_hash text primary key,
  endpoint text not null,
  request jsonb not null,
  result jsonb not null,
  cost numeric(10, 5),
  fetched_at timestamptz not null default now()
);

alter table seo_pages enable row level security;
alter table seo_keywords enable row level security;
alter table seo_keyword_metrics enable row level security;
alter table seo_monthly_search_history enable row level security;
alter table seo_page_keywords enable row level security;
alter table seo_discovery_runs enable row level security;
alter table seo_discovery_results enable row level security;
alter table seo_api_usage_local enable row level security;
alter table seo_ai_citations enable row level security;
alter table seo_geo_watchlist_history enable row level security;
alter table seo_mcp_usage enable row level security;
alter table seo_mcp_cache enable row level security;
alter table seo_sync_meta enable row level security;

-- Grants-only lockdown, same as every other table in this project.
grant select, insert, update, delete on
  seo_pages, seo_keywords, seo_keyword_metrics, seo_monthly_search_history,
  seo_page_keywords, seo_discovery_runs, seo_discovery_results,
  seo_api_usage_local, seo_ai_citations, seo_geo_watchlist_history,
  seo_mcp_usage, seo_mcp_cache, seo_sync_meta
to service_role;

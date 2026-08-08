-- Football Parent local SEO research database.
-- Engine: SQLite via Node's built-in node:sqlite (DatabaseSync) - see db.ts
-- for why better-sqlite3 isn't used on this machine.
--
-- All CREATE statements are idempotent (IF NOT EXISTS) so this file can be
-- re-run safely by migrate.ts on every /seo-setup invocation.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ---------------------------------------------------------------------
-- Keywords
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL,                 -- original wording, as first seen
  normalised_keyword TEXT NOT NULL,
  search_engine TEXT NOT NULL DEFAULT 'google',
  location_code INTEGER NOT NULL DEFAULT 2826,
  language_code TEXT NOT NULL DEFAULT 'en',
  volume INTEGER,                        -- latest known search volume (tracker "Volume")
  kd REAL,                               -- latest known keyword difficulty (tracker "KD")
  source TEXT,                           -- tracker "Source"
  target_url TEXT,                       -- tracker "Target URL"
  mapped_article TEXT,                   -- tracker "Mapped Article"
  keyword_type TEXT,                     -- tracker "Keyword Type"
  cluster TEXT,                          -- tracker "Cluster"
  notes TEXT,                            -- tracker "Notes"
  low_fruits_volume INTEGER,             -- tracker "Low fruits volume"
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (normalised_keyword, search_engine, location_code, language_code)
);

CREATE INDEX IF NOT EXISTS idx_keywords_cluster ON keywords(cluster);
CREATE INDEX IF NOT EXISTS idx_keywords_target_url ON keywords(target_url);

-- Time-stamped DataForSEO enrichment per keyword. Separate from keywords.volume/kd
-- (which hold the latest snapshot for tracker export) so history is retained
-- and sandbox rows never overwrite a genuine live measurement.
CREATE TABLE IF NOT EXISTS keyword_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword_id INTEGER NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  retrieved_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  search_volume INTEGER,
  cpc REAL,
  competition REAL,
  keyword_difficulty REAL,
  search_intent TEXT,
  is_sandbox INTEGER NOT NULL DEFAULT 0,
  raw_response_id INTEGER REFERENCES raw_responses(id)
);

CREATE INDEX IF NOT EXISTS idx_keyword_metrics_keyword ON keyword_metrics(keyword_id, retrieved_at);

CREATE TABLE IF NOT EXISTS monthly_search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword_id INTEGER NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  search_volume INTEGER,
  is_sandbox INTEGER NOT NULL DEFAULT 0,
  raw_response_id INTEGER REFERENCES raw_responses(id),
  retrieved_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (keyword_id, year, month, is_sandbox)
);

-- ---------------------------------------------------------------------
-- Pages (article tracker)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL UNIQUE,
  article TEXT,                    -- tracker "Article"
  category TEXT,                   -- tracker "Category"
  primary_keyword TEXT,            -- tracker "Primary Keyword"
  secondary_keywords TEXT,         -- tracker "Secondary Keywords" (semicolon-joined)
  cluster TEXT,                    -- tracker "Cluster"
  status TEXT,                     -- tracker "Status"
  total_target_sv INTEGER,         -- tracker "Total Target SV"
  gsc_impressions INTEGER,         -- tracker "GSC Impressions"
  gsc_clicks INTEGER,              -- tracker "GSC Clicks"
  gsc_ctr REAL,                    -- tracker "GSC CTR"
  avg_position REAL,               -- tracker "Avg Position"
  opportunity_score REAL,          -- tracker "Opportunity Score"
  priority TEXT,                   -- tracker "Priority"
  notes TEXT,                      -- tracker "Notes"
  page_file TEXT,                  -- matched app/<category>/<slug>/page.tsx (repo-relative)
  mdx_file TEXT,                   -- matched content/<category>/<slug>.mdx (repo-relative)
  -- Content-status backlog columns (schema v2) - written by the
  -- football-parent-articles/football-parent-review skills via
  -- scripts/seo/cli/content-backlog.ts, not by the article-tracker import.
  fact_checked_at TEXT,                             -- last fact-check pass date (ISO)
  seo_optimised_at TEXT,                             -- last SEO-lever change date (ISO)
  personal_story_count INTEGER NOT NULL DEFAULT 0,   -- <ParentNote> blocks in the MDX
  expert_quote_count INTEGER NOT NULL DEFAULT 0,      -- <ExpertOpinion> blocks in the MDX
  expert_quote_pending INTEGER NOT NULL DEFAULT 0,    -- 1 if questions drafted/sent, answer not yet written in
  inbound_internal_links INTEGER,                     -- from internal-link-audit.mjs
  inbound_links_checked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS page_keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  keyword_id INTEGER NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,      -- 'primary' | 'secondary' | 'ranking' | 'opportunity'
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (page_id, keyword_id, relationship)
);

-- ---------------------------------------------------------------------
-- Google Search Console observations (source of truth for actual
-- performance - see AGENTS.md/CLAUDE.md rule that GSC stays authoritative)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gsc_observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_url TEXT NOT NULL,
  -- "" (not NULL) for page-level-only / period-aggregate rows: SQLite's
  -- UNIQUE constraint never treats NULL = NULL, so a nullable column in the
  -- UNIQUE below would silently stop deduplicating - see the comment on
  -- upsertObservation in scripts/seo/gsc/persist.ts, caught by
  -- tests/seo/gsc-persist.test.ts.
  query TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr REAL NOT NULL DEFAULT 0,
  position REAL,
  source TEXT NOT NULL,            -- 'live_service_account' | 'csv_import' | 'xlsx_import'
  retrieved_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (page_url, query, date, period_start, period_end, source)
);

CREATE INDEX IF NOT EXISTS idx_gsc_obs_page ON gsc_observations(page_url);
CREATE INDEX IF NOT EXISTS idx_gsc_obs_query ON gsc_observations(query);
CREATE INDEX IF NOT EXISTS idx_gsc_obs_period ON gsc_observations(period_start, period_end);

-- ---------------------------------------------------------------------
-- Cache / raw responses / API usage
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS raw_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_family TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  environment TEXT NOT NULL,        -- 'sandbox' | 'live'
  is_sandbox INTEGER NOT NULL,
  retrieved_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  file_path TEXT NOT NULL,          -- relative path under seo-data/raw/
  status TEXT NOT NULL,             -- 'ok' | 'partial' | 'error'
  result_count INTEGER,
  cost REAL,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_raw_responses_hash ON raw_responses(request_hash);

CREATE TABLE IF NOT EXISTS cache_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_hash TEXT NOT NULL UNIQUE,
  api_family TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  environment TEXT NOT NULL,
  is_sandbox INTEGER NOT NULL,
  cache_family TEXT NOT NULL,       -- CacheFamily label, drives freshness rule
  params_json TEXT NOT NULL,
  seed_terms TEXT,
  location_code INTEGER,
  language_code TEXT,
  filters_json TEXT,
  result_limit INTEGER,
  date_range_start TEXT,
  date_range_end TEXT,
  raw_response_id INTEGER NOT NULL REFERENCES raw_responses(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cache_records_family ON cache_records(cache_family, expires_at);

CREATE TABLE IF NOT EXISTS api_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  occurred_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  workflow TEXT NOT NULL,           -- e.g. 'seo-page', 'seo-content'
  api_family TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  environment TEXT NOT NULL,
  is_sandbox INTEGER NOT NULL,
  request_hash TEXT NOT NULL,
  result_count INTEGER,
  cost REAL,
  cache_status TEXT NOT NULL,       -- 'hit' | 'miss' | 'stale' | 'refused'
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_api_usage_date ON api_usage(occurred_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_workflow ON api_usage(workflow);

-- ---------------------------------------------------------------------
-- Discovery (existing-article-new-terms, new-new-terms)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS discovery_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_type TEXT NOT NULL,           -- 'existing_article' | 'new_cluster' | 'competitor'
  page_id INTEGER REFERENCES pages(id),
  endpoint TEXT NOT NULL,
  seed_terms TEXT NOT NULL,         -- JSON array
  location_code INTEGER NOT NULL,
  language_code TEXT NOT NULL,
  filters_json TEXT,
  result_limit INTEGER,
  environment TEXT NOT NULL,
  is_sandbox INTEGER NOT NULL,
  request_hash TEXT NOT NULL,
  cache_record_id INTEGER REFERENCES cache_records(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS discovery_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discovery_run_id INTEGER NOT NULL REFERENCES discovery_runs(id) ON DELETE CASCADE,
  keyword_id INTEGER NOT NULL REFERENCES keywords(id),
  relevance_flag TEXT NOT NULL DEFAULT 'review', -- 'relevant' | 'irrelevant' | 'review'
  classification TEXT,              -- 'optimise_existing' | 'new_section' | 'faq' | 'secondary' |
                                     -- 'new_article' | 'ignore' | 'cannibalisation'
  rationale TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (discovery_run_id, keyword_id)
);

-- ---------------------------------------------------------------------
-- Trends
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS trend_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  seed_terms TEXT NOT NULL,         -- JSON array
  location_code INTEGER NOT NULL,
  language_code TEXT NOT NULL,
  environment TEXT NOT NULL,
  is_sandbox INTEGER NOT NULL,
  request_hash TEXT NOT NULL,
  cache_record_id INTEGER REFERENCES cache_records(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS trend_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trend_run_id INTEGER NOT NULL REFERENCES trend_runs(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  month TEXT,                       -- 'YYYY-MM' when this row is a monthly datapoint
  relative_interest INTEGER,        -- Google Trends 0-100 scale
  is_rising_related INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ---------------------------------------------------------------------
-- Content clusters / article opportunities
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS content_clusters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  pillar TEXT,
  intent TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS cluster_keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cluster_id INTEGER NOT NULL REFERENCES content_clusters(id) ON DELETE CASCADE,
  keyword_id INTEGER NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  UNIQUE (cluster_id, keyword_id)
);

CREATE TABLE IF NOT EXISTS article_opportunities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER REFERENCES pages(id),
  cluster_id INTEGER REFERENCES content_clusters(id),
  keyword_id INTEGER REFERENCES keywords(id),
  opportunity_type TEXT NOT NULL,   -- 'optimise_existing' | 'new_section' | 'faq' | 'secondary' |
                                     -- 'new_article' | 'ignore' | 'cannibalisation'
  rationale TEXT,
  combined_volume INTEGER,
  difficulty REAL,
  intent TEXT,
  seasonality TEXT,
  suggested_timing TEXT,
  status TEXT NOT NULL DEFAULT 'proposed',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ---------------------------------------------------------------------
-- Live SERP rank checks (real position, not gated behind a GSC
-- impression like the position figures in gsc_observations)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS serp_rank_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword_id INTEGER REFERENCES keywords(id),
  keyword TEXT NOT NULL,
  target_domain TEXT NOT NULL,
  rank_group INTEGER,
  rank_absolute INTEGER,
  ranking_url TEXT,
  checked_depth INTEGER NOT NULL,
  environment TEXT NOT NULL,
  is_sandbox INTEGER NOT NULL,
  raw_response_id INTEGER REFERENCES raw_responses(id),
  retrieved_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_serp_rank_checks_keyword ON serp_rank_checks(keyword, retrieved_at);

-- ---------------------------------------------------------------------
-- Product research (launch + features)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS product_opportunities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  area TEXT NOT NULL,               -- 'launch' | 'feature'
  user_problem TEXT,
  supporting_terms TEXT,            -- JSON array
  demand_evidence TEXT,
  target_user TEXT,
  proposed_feature TEXT,
  competitor_coverage TEXT,
  differentiation TEXT,
  recommendation TEXT,              -- 'mvp' | 'later' | 'reject'
  confidence TEXT,                  -- 'low' | 'medium' | 'high'
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ---------------------------------------------------------------------
-- Backlinks
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS competitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT NOT NULL UNIQUE,
  name TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS backlink_prospects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prospect_domain TEXT NOT NULL,
  referring_page TEXT NOT NULL,
  competitor_id INTEGER REFERENCES competitors(id),
  competitor_target_page TEXT,
  link_type TEXT,
  dofollow INTEGER,
  authority_metrics TEXT,           -- JSON, screening signal only - see notes in client
  spam_indicators TEXT,             -- JSON, screening signal only
  suggested_fp_page TEXT,
  outreach_angle TEXT,
  relevance_score REAL,
  priority TEXT,
  review_status TEXT NOT NULL DEFAULT 'needs_review', -- never auto-outreached
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (prospect_domain, referring_page, competitor_id)
);

-- ---------------------------------------------------------------------
-- Imports
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS imports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL,
  file_hash TEXT NOT NULL,          -- content hash, used for whole-file duplicate detection
  file_type TEXT NOT NULL,          -- 'article_tracker' | 'keyword_tracker' | 'gsc_csv' | 'gsc_xlsx'
  imported_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  rows_read INTEGER NOT NULL DEFAULT 0,
  inserted INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL DEFAULT 0,
  unchanged INTEGER NOT NULL DEFAULT 0,
  duplicates_ignored INTEGER NOT NULL DEFAULT 0,
  invalid_rows INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

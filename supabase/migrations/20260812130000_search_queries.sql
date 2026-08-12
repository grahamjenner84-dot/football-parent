-- Logs on-site search queries (app/search/page.tsx) so Graham can see what
-- visitors are searching for and spot content-gap ideas. Deliberately
-- anonymous - no IP, no session id, nothing linkable back to an individual
-- visitor - so this table can be written to regardless of the analytics
-- consent choice itself (it's not an analytics/tracking cookie, just an
-- aggregate query-text log on our own first-party backend), same reasoning
-- as cookie_consent_events (20260810120000_cookie_consent_events.sql).
--
-- Lives in the football-parent-social project (ref jwlwzoklgrzharqvazeg),
-- same as the rest of this repo's Supabase usage. Not the Coach App
-- project - this has nothing to do with children's data, see CLAUDE.md
-- "Supabase projects - two, kept fully isolated".

create table search_queries (
  id bigint generated always as identity primary key,
  query text not null,
  result_count integer not null,
  created_at timestamptz not null default now()
);

alter table search_queries enable row level security;

-- Same grants-only lockdown as the rest of this project's tables: no
-- policies means anon/authenticated get nothing via the Data API;
-- service_role bypasses RLS but still needs an explicit grant to be
-- reachable at all (see 20260718192716_instagram_content_automation_grants.sql).
grant select, insert on search_queries to service_role;

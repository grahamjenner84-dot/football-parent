-- True total page-view count, deliberately independent of the cookie
-- consent banner entirely (unlike cookie_consent_events.banner_shown,
-- which only fires for a visitor with no stored/fresh consent decision -
-- see app/components/PageViewPing.tsx). Fires on every route regardless of
-- consent state, so returning visitors who already accepted/rejected still
-- count. Anonymous - just a path and a timestamp, no IP, no session id,
-- nothing linkable back to an individual visitor - same reasoning as
-- cookie_consent_events and search_queries.
--
-- Lives in the football-parent-social project (ref jwlwzoklgrzharqvazeg),
-- same as the rest of this repo's Supabase usage. Not the Coach App
-- project - this has nothing to do with children's data, see CLAUDE.md
-- "Supabase projects - two, kept fully isolated".

create table page_views (
  id bigint generated always as identity primary key,
  path text not null,
  created_at timestamptz not null default now()
);

alter table page_views enable row level security;

-- Same grants-only lockdown as the rest of this project's tables: no
-- policies means anon/authenticated get nothing via the Data API;
-- service_role bypasses RLS but still needs an explicit grant to be
-- reachable at all (see 20260718192716_instagram_content_automation_grants.sql).
grant select, insert on page_views to service_role;

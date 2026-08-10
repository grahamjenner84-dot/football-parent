-- Aggregate accept/reject/manage counts for the cookie consent banner
-- (app/components/CookieConsent.tsx). Deliberately anonymous - no IP, no
-- session id, no cookie, nothing linkable back to an individual visitor -
-- so this table can be written to regardless of the analytics consent
-- choice itself (it's not an analytics/tracking cookie, just an aggregate
-- event count on our own first-party backend).
--
-- Lives in the football-parent-social project (ref jwlwzoklgrzharqvazeg),
-- same as the rest of this repo's Supabase usage. Not the Coach App
-- project - this has nothing to do with children's data, see CLAUDE.md
-- "Supabase projects - two, kept fully isolated".

create table cookie_consent_events (
  id bigint generated always as identity primary key,
  action text not null check (action in ('accept_all', 'reject_all', 'save_preferences')),
  analytics_granted boolean not null,
  created_at timestamptz not null default now()
);

alter table cookie_consent_events enable row level security;

-- Same grants-only lockdown as the rest of this project's tables: no
-- policies means anon/authenticated get nothing via the Data API;
-- service_role bypasses RLS but still needs an explicit grant to be
-- reachable at all (see 20260718192716_instagram_content_automation_grants.sql).
grant select, insert on cookie_consent_events to service_role;

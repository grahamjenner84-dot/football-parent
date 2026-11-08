-- Weekly activity, habit and paying counts from the Coach App, for the
-- Coach App tab on /admin/seo.
--
-- The Coach App project's own database posts these once an hour (coach-app
-- migration 0071, send_usage_insights via pg_cron + pg_net) to
-- /api/coach-app-insights, with the same shared secret as the usage snapshot
-- (COACH_APP_SNAPSHOT_SECRET). Counts only, on the terms Graham approved on
-- 2026-09-26 and confirmed for this payload on 2026-11-08: app -> site, never
-- a read of the Coach App database. The endpoint rebuilds the payload from the
-- keys lib/supabase/coach-app-insights.ts knows and refuses any value that
-- isn't a whole number or a date label, so nothing identifying can be stored.
--
-- Not written on visitor requests, but still: apply this before deploying
-- the endpoint, or the hourly posts fail until it exists.
--
-- Lives in the football-parent-social project (ref jwlwzoklgrzharqvazeg).

create table if not exists coach_app_insights (
  id bigint generated always as identity primary key,
  -- When the Coach App database worked the counts out.
  taken_at timestamptz not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

alter table coach_app_insights enable row level security;
grant select, insert on coach_app_insights to service_role;

create index if not exists coach_app_insights_taken_at_idx
  on coach_app_insights (taken_at);

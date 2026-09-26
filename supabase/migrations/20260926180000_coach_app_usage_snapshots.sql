-- Whole-app usage counts for the Coach App, posted here every 10 minutes by
-- the Coach App project itself (coach-app migration 0039,
-- send_usage_snapshot) to /api/coach-app-snapshot. Shown at the top of the
-- Coach App funnel tab on /admin/seo and in get_coach_app_funnel.
--
-- Counts only: no user id, email, name, team or match detail ever arrives
-- here, and this site still never reads the Coach App project. Graham
-- approved this route on 2026-09-26 alongside the anonymous sign-up event
-- (coach_app_signups). The post is only accepted with the shared secret in
-- COACH_APP_SNAPSHOT_SECRET, so nobody else can write rows.
--
-- One row per post, kept, so the tab can show how the numbers move by day.
--
-- Lives in the football-parent-social project (ref jwlwzoklgrzharqvazeg).

create table if not exists coach_app_usage_snapshots (
  id bigint generated always as identity primary key,
  -- When the Coach App database took the counts.
  taken_at timestamptz not null,
  total_accounts integer not null,
  signups_today integer not null,
  active_today integer not null,
  active_7d integer not null,
  accounts_with_team integer not null,
  finished_matches integer not null,
  accounts_with_finished_match integer not null,
  received_at timestamptz not null default now()
);

alter table coach_app_usage_snapshots enable row level security;

grant select, insert on coach_app_usage_snapshots to service_role;

create index if not exists coach_app_usage_snapshots_taken_at_idx
  on coach_app_usage_snapshots (taken_at);

-- The Progress pipeline on /admin/seo (and get_progress_funnel): two tables.
--
-- 1. progress_join_events: one anonymous row each time the "Start your
--    journey" form on /progress sends a sign-in email (written by
--    /api/progress-join from app/components/ProgressJoinForm.tsx). No email,
--    no user id, no gclid (only whether there was one): just how the visit
--    began and which banner, if any, led to the page. A send is a new trial
--    or a returning parent signing in; the form can't tell which.
--
-- 2. progress_usage_snapshots: whole-app counts posted every 10 minutes by
--    the Progress project's own database (progress migration 0021,
--    send_usage_snapshot) to /api/progress-snapshot. Counts only: no ids,
--    emails, names or player details ever arrive here, and this site never
--    reads the Progress project (it holds children's data). Graham approved
--    this on 2026-10-02 on the same terms as the Coach App's usage snapshot.
--    Accepted only with the shared secret PROGRESS_SNAPSHOT_SECRET.
--
-- Channel is not stored: it is derived at read time (lib/coach-app-channels.ts).
--
-- Lives in the football-parent-social project (ref jwlwzoklgrzharqvazeg).

create table if not exists progress_join_events (
  id bigint generated always as identity primary key,
  -- Which copy of the form: "join" (top of /progress) or "join-trial" (bottom).
  form text,
  -- First page of the visit, and how that visit began (Search, Ads,
  -- Internal, Direct, ...).
  entry_path text,
  entry_source_group text,
  -- ?b= value of the Progress banner that led them to /progress.
  banner text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  had_gclid boolean not null default false,
  marketing_opt_in boolean not null default false,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table progress_join_events enable row level security;
grant select, insert on progress_join_events to service_role;
create index if not exists progress_join_events_created_at_idx on progress_join_events (created_at);

create table if not exists progress_usage_snapshots (
  id bigint generated always as identity primary key,
  -- When the Progress database took the counts.
  taken_at timestamptz not null,
  total_accounts integer not null,
  signups_today integer not null,
  signups_today_with_player integer not null,
  active_today integer not null,
  active_7d integer not null,
  accounts_with_player integer not null,
  players integer not null,
  shared_players integer not null,
  matches_logged integer not null,
  accounts_with_match integer not null,
  training_logged integer not null,
  -- Each account's own plan: the three add up to total_accounts.
  plan_paid integer not null,
  plan_trial integer not null,
  plan_lapsed integer not null,
  received_at timestamptz not null default now()
);

alter table progress_usage_snapshots enable row level security;
grant select, insert on progress_usage_snapshots to service_role;
create index if not exists progress_usage_snapshots_taken_at_idx on progress_usage_snapshots (taken_at);

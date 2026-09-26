-- One anonymous row per device per UK day that a signed-in coach opened the
-- Coach App, so the Coach App funnel tab on /admin/seo can show daily active
-- coaches. Sent by the app itself (src/data/activeDayPing.ts in coach-app),
-- the same app -> site route as coach_app_signups, approved by Graham on
-- 2026-09-26 as an extension of that one.
--
-- Anonymous by construction: no user id, email, name or team. day_token is a
-- random value the app generates fresh each UK day and throws away the next,
-- so it cannot link one day's row to another's, or to an account. It exists
-- only so the unique index below can make the ping idempotent: opening the
-- app five times in a day, or in two tabs at once, still leaves one row.
--
-- Counts devices, not people: a coach on a phone and a laptop the same day
-- is two rows.
--
-- Lives in the football-parent-social project (ref jwlwzoklgrzharqvazeg).

create table if not exists coach_app_active_days (
  id bigint generated always as identity primary key,
  -- The UK (Europe/London) calendar day, as the app saw it.
  day date not null,
  day_token text not null,
  -- 'web' (browser or installed PWA) or 'android' (the Play Store app).
  platform text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table coach_app_active_days enable row level security;

grant select, insert on coach_app_active_days to service_role;

create unique index if not exists coach_app_active_days_day_token_idx
  on coach_app_active_days (day, day_token);

create index if not exists coach_app_active_days_day_idx
  on coach_app_active_days (day);

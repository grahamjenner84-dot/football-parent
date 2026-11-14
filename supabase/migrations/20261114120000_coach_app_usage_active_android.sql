-- Active coaches split into the Android app and the web app, on the Coach App
-- usage snapshot (coach_app_usage_snapshots, see
-- 20260926180000_coach_app_usage_snapshots.sql).
--
-- The Coach App's database now also posts activeTodayAndroid and
-- active7dAndroid (coach-app migration 0077): of activeToday and active7d,
-- the coaches whose latest open was in the Android app (profiles.device =
-- 'android_app'). The web figure is the total minus these.
--
-- Still a whole-app count, on the terms Graham approved on 2026-09-26: counts
-- only, app -> site, never a read of the Coach App database. Nullable:
-- snapshots from before the app sends them have none.
--
-- APPLY THIS BEFORE DEPLOYING THE CODE THAT WRITES THESE COLUMNS. The insert
-- retries without them on PGRST204/42703, so no snapshot is lost, but the
-- split is dropped until this runs.
--
-- Lives in the football-parent-social project (ref jwlwzoklgrzharqvazeg).

alter table coach_app_usage_snapshots add column if not exists active_today_android integer;
alter table coach_app_usage_snapshots add column if not exists active_7d_android integer;

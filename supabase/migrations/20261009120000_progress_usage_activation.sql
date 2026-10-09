-- Activation counts on the Progress usage snapshot (progress_usage_snapshots,
-- see 20261002140000_progress_pipeline.sql).
--
-- The Progress database's send_usage_snapshot now also posts these
-- whole-app counts, on the same approved terms (counts only, app -> site,
-- Graham's accounts and accounts being deleted left out; never ids, emails,
-- names or player details). Nullable: snapshots taken before the Progress
-- side sends them have none, and /api/progress-snapshot treats them as
-- optional.
--
-- APPLY THIS BEFORE DEPLOYING THE CODE THAT WRITES THESE COLUMNS. The
-- insert in lib/supabase/progress-funnel.ts retries without them on
-- PGRST204/42703, so a snapshot is never lost, but the activation numbers
-- are dropped until this runs.
--
-- Lives in the football-parent-social project (ref jwlwzoklgrzharqvazeg).

-- Accounts created in the last 7 days, and of those how many have access
-- to a live player, have a player with at least one club/season (chapter),
-- have a match or training logged on a player they can access, and have
-- opened the app installed to the home screen.
alter table progress_usage_snapshots add column if not exists signups_7d integer;
alter table progress_usage_snapshots add column if not exists signups_7d_with_player integer;
alter table progress_usage_snapshots add column if not exists signups_7d_with_club integer;
alter table progress_usage_snapshots add column if not exists signups_7d_with_log integer;
alter table progress_usage_snapshots add column if not exists signups_7d_installed integer;

-- Accounts created 7 to 14 days ago (their first week is complete), and of
-- those how many logged a match or training within 7 days of signing up.
alter table progress_usage_snapshots add column if not exists cohort_week2 integer;
alter table progress_usage_snapshots add column if not exists cohort_week2_activated integer;

-- Accounts with a match or training logged (created) in the last 7 days:
-- the weekly habit number.
alter table progress_usage_snapshots add column if not exists accounts_logged_7d integer;

-- Accounts that have ever opened the installed app.
alter table progress_usage_snapshots add column if not exists accounts_installed integer;

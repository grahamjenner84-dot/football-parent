-- Emails sent today, on both apps' usage snapshots (coach_app_usage_snapshots,
-- see 20260926180000_coach_app_usage_snapshots.sql; progress_usage_snapshots,
-- see 20261002140000_progress_pipeline.sql).
--
-- Each app's database now also posts emailsToday: the scheduled emails it has
-- sent since UK midnight (Coach App: match reminders, set-up nudges and trial
-- emails, coach-app migration 0060; Progress: reminder and trial emails,
-- progress migration 0024). Both send through the one Resend account, whose
-- free plan allows 100 a day including both apps' sign-in emails, so the
-- dashboard can show how close a day gets. Sign-in emails aren't in these
-- counts: Supabase Auth sends them and neither app records them.
--
-- Still a whole-app count, on the terms Graham approved (Coach App 2026-09-26,
-- Progress 2026-10-02): counts only, app -> site, never a read of either app's
-- database. Nullable: snapshots from before the apps send it have none.
--
-- APPLY THIS BEFORE DEPLOYING THE CODE THAT WRITES THESE COLUMNS. The inserts
-- retry without them on PGRST204/42703, so no snapshot is lost, but the email
-- counts are dropped until this runs.
--
-- Lives in the football-parent-social project (ref jwlwzoklgrzharqvazeg).

alter table coach_app_usage_snapshots add column if not exists emails_today integer;
alter table progress_usage_snapshots add column if not exists emails_today integer;

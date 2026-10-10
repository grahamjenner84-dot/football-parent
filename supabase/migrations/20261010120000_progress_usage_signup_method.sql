-- Sign-ups by method on the Progress usage snapshot (progress migration 0025):
-- how many accounts have signed in with Google, overall and among the last 7
-- days' sign-ups. The rest used the email link or code. Whole-app counts on the
-- snapshot's approved terms (counts only, app -> site).
--
-- Nullable: snapshots before progress 0025 don't carry them. The insert in
-- lib/supabase/progress-funnel.ts drops these columns on their own if this
-- hasn't run yet, so nothing else is lost, but apply it before (or soon after)
-- deploying. Lives in football-parent-social (ref jwlwzoklgrzharqvazeg).

alter table progress_usage_snapshots add column if not exists accounts_google integer;
alter table progress_usage_snapshots add column if not exists signups_7d_google integer;

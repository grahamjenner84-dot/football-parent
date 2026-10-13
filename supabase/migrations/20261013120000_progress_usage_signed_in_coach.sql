-- More whole-app counts on the Progress usage snapshot
-- (progress_usage_snapshots, see 20261002140000_progress_pipeline.sql):
-- whether accounts ever signed in, and how far parents get with coach
-- feedback and training.
--
-- The Progress database's send_usage_snapshot now also posts these, on the
-- same approved terms (counts only, app -> site, Graham's accounts and
-- accounts being deleted left out; never ids, emails, names or player
-- details).
--
-- Nullable: snapshots taken before the Progress side sends them have none,
-- and /api/progress-snapshot treats them as optional. The insert in
-- lib/supabase/progress-funnel.ts drops these columns on their own if this
-- hasn't run yet, so nothing else is lost, but apply it before (or soon
-- after) deploying. Lives in football-parent-social (ref jwlwzoklgrzharqvazeg).

-- Accounts that have ever signed in (an account can exist from a sign-in
-- link that was never opened), and of the accounts created in the last 7
-- days, how many have signed in.
alter table progress_usage_snapshots add column if not exists accounts_signed_in integer;
alter table progress_usage_snapshots add column if not exists signups_7d_signed_in integer;

-- Accounts with a coach feedback link, and coach feedback reports submitted.
alter table progress_usage_snapshots add column if not exists accounts_with_coach_link integer;
alter table progress_usage_snapshots add column if not exists coach_reports integer;

-- Accounts with training logged.
alter table progress_usage_snapshots add column if not exists accounts_with_training integer;

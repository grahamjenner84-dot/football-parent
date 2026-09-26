-- How many of today's new Coach App accounts have set up a team, alongside
-- signups_today. Nullable: snapshots sent before the Coach App function
-- reported it (coach-app migration 0040) have no value, not zero.
--
-- Apply before the site code that writes it deploys (CLAUDE.md: migration
-- first), then update the Coach App function.
--
-- Lives in the football-parent-social project (ref jwlwzoklgrzharqvazeg).

alter table coach_app_usage_snapshots
  add column if not exists signups_today_with_team integer;

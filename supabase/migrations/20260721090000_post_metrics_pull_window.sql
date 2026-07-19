-- Phase C: the insights collector needs to know *which* scheduled pull
-- window (see getPullWindows() in lib/instagram/insights-pipeline.ts) a
-- given post_metrics row corresponds to, so a cron tick that runs more
-- often than the pull cadence doesn't re-pull (and duplicate) the same
-- window's snapshot. Multiple snapshots per post ARE wanted - e.g.
-- 'initial' then 'followup_7d', to see engagement grow over time - just
-- not more than one row per (post, window).
alter table post_metrics add column pull_window text not null default 'initial';
alter table post_metrics alter column pull_window drop default;

-- Metrics the reels metric set has that carousel/feed doesn't (see
-- CLAUDE.md-adjacent Phase C brief: reels also get views + avg watch time).
-- NULL for carousel/feed posts.
alter table post_metrics add column total_interactions int;
alter table post_metrics add column avg_watch_time_sec numeric;

-- Set (not left NULL) only when a pull for this (post, window) failed
-- permanently (non-transient - e.g. bad metric request, deleted media).
-- Its presence is what stops the collector retrying that window forever,
-- the same role posts.error_message + status='failed' plays for the
-- publisher (see 20260720100000_publish_pipeline.sql) - a transient/outage
-- error (HTTP 5xx, Meta's own "unknown error, try again") deliberately
-- does NOT write a row at all, so that window stays "due" and is retried
-- next run instead of being marked permanently failed.
alter table post_metrics add column pull_error text;

create unique index post_metrics_post_id_pull_window_idx on post_metrics(post_id, pull_window);

comment on column post_metrics.pull_window is
  'Which scheduled pull this snapshot corresponds to (e.g. initial, followup_7d) - see getPullWindows() in lib/instagram/insights-pipeline.ts. Unique per (post_id, pull_window) so re-running the collector is idempotent.';
comment on column post_metrics.total_interactions is
  'Meta total_interactions metric, as returned by the Graph API directly (not derived locally) in case Meta''s definition diverges from a naive likes+comments+saves+shares sum.';
comment on column post_metrics.avg_watch_time_sec is
  'Reels-only: ig_reels_avg_watch_time metric, converted from Meta''s native milliseconds to seconds before storage (Meta''s own field title reads "Reels average watch time (milliseconds)"). NULL for carousel/feed posts.';
comment on column post_metrics.pull_error is
  'Set only when a pull for this (post, window) failed non-transiently and will not be retried. NULL for successful pulls and for windows still pending retry after a transient/outage error (those simply have no row yet).';
comment on column post_metrics.impressions is
  'Retired by Meta platform-wide in 2025 - never populated by the collector. See reach/views instead.';

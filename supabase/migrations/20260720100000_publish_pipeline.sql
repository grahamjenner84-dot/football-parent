-- Phase B: the publisher/scheduler needs somewhere to persist in-flight
-- container state (for crash recovery / idempotency - a re-run must resume
-- rather than recreate-and-double-publish) and a queryable failure reason
-- (so a failed publish is never silent - see CLAUDE.md-adjacent Phase B
-- brief: "the whole point is I find out when something breaks").

-- Parent container (carousel) or the single container (reels/single-image),
-- mid-flight. Instagram containers expire after 24h - this is read back on
-- the next cron tick so an in-progress post resumes from wherever it left
-- off instead of recreating from scratch. Cleared implicitly by moving on
-- (not nulled after publish - harmless to leave for an audit trail).
alter table posts add column ig_container_id text;

-- Queryable failure reason for status='failed', whether the failure was at
-- render time (Phase A) or publish time (Phase B). NULL when there's been
-- no failure, or after a subsequent successful run clears it.
alter table posts add column error_message text;

-- Per-slide child container id for carousel posts, so a crash after
-- creating 2 of 5 children resumes by recreating only the missing/expired
-- ones, not all 5 (see Phase B brief point 3, "keep finished children,
-- recreate only what expired").
alter table post_slides add column ig_child_container_id text;

-- Total duration of a rendered reel, in seconds, as computed by
-- render-batch.ts at render time (sum of slide `secs`). The publisher runs
-- as a Vercel serverless function with no ffmpeg available, so it cannot
-- ffprobe a video to check the Reels 90s cap itself - it relies on this
-- column instead. NULL for images (single-slide/carousel-item post_slides).
alter table post_slides add column duration_sec numeric;

comment on column posts.ig_container_id is
  'In-flight Instagram container id (carousel parent or reels container) while a post is being published. Left in place after publish for audit purposes.';
comment on column posts.error_message is
  'Last render or publish failure reason, set alongside status=failed. Cleared on the next successful attempt.';
comment on column post_slides.ig_child_container_id is
  'In-flight Instagram child container id for this carousel slide, so a crashed/resumed publish only recreates expired or missing children.';
comment on column post_slides.duration_sec is
  'Rendered video duration in seconds, set by render-batch.ts for reel slides. Used by the publisher to validate the 90s Reels cap without needing ffmpeg server-side.';

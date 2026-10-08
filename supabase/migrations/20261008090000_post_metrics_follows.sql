-- More Instagram measurement: follows per post, account growth per day.
--
-- A collab's views come from the guest's followers, so reach and likes say
-- little about whether it grew the account: a Football DNA collab reached
-- about 10k views and brought 4 follows. This adds what Instagram's API will
-- give us towards that question. Null in any of these columns means
-- Instagram didn't return the number (some are documented for feed posts
-- only, some may have been withdrawn), not zero.
--
-- Apply before the code that writes these columns is deployed.

-- Per post (lib/instagram/insights-pipeline.ts, insights-flow.ts).
alter table post_metrics add column if not exists follows int;
alter table post_metrics add column if not exists profile_visits int;
alter table post_metrics add column if not exists profile_activity int;      -- taps on profile buttons after viewing this post
alter table post_metrics add column if not exists bio_link_taps int;         -- profile_activity broken down to bio link taps, if Instagram gives it
alter table post_metrics add column if not exists reach_followers int;       -- reach split by whether the viewer already followed us
alter table post_metrics add column if not exists reach_non_followers int;
alter table post_metrics add column if not exists watch_time_total_sec numeric; -- reels: total time watched across all views
alter table post_metrics add column if not exists extra jsonb;               -- raw responses of the breakdown requests, kept for exploring

comment on column post_metrics.extra is
  'Raw Instagram responses (or errors) for the optional breakdown requests made on each pull, so what Instagram does and does not return can be checked without another code change.';

-- Per day, whole account (lib/instagram/account-daily.ts), one row per
-- account per day, written by the nightly /api/cron/insights run for the
-- previous UTC day. followers_count is the count at the time of the run.
create table if not exists instagram_account_daily (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  snapshot_date date not null,
  followers_count int,
  follows_count int,
  media_count int,
  reach int,
  reach_followers int,
  reach_non_followers int,
  views int,
  views_followers int,
  views_non_followers int,
  profile_links_taps int,
  follows int,
  unfollows int,
  online_followers jsonb,          -- followers online by hour, if Instagram still returns it
  raw jsonb not null default '{}', -- every response or error, for checking what came back
  pulled_at timestamptz not null default now(),
  unique (account_id, snapshot_date)
);

-- Service role only, like every other table in this project.
alter table instagram_account_daily enable row level security;

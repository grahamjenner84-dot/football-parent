-- Follows and profile visits per post, for the Expert Opinion collabs.
--
-- A collab's views come from the guest's followers, so reach and likes say
-- little about whether it grew the account: a Football DNA collab reached
-- about 10k views and brought 4 follows. Instagram's media insights expose
-- `follows` and `profile_visits` for feed/carousel posts (and possibly not
-- for reels), so the insights cron now asks for them and stores them here.
-- Null means Instagram didn't return the metric for that post, not zero.
--
-- Apply before the code that writes these columns is deployed.
alter table post_metrics add column if not exists follows int;
alter table post_metrics add column if not exists profile_visits int;

-- Adds user-agent and campaign attribution to page_views, plus an index
-- backing a per-path flood check in lib/supabase/page-views.ts.
--
-- Triggered by the 2026-08-26 what-is-eppp incident: 226 "views" landed in
-- an 8-minute window at a near-perfectly uniform ~1 every 2 seconds, all
-- referrer_host null. That pattern (dead-flat rate, single path, zero
-- referrer diversity) is what marked it as scripted rather than a real
-- traffic event - but "Direct" alone doesn't prove that, since ad network
-- redirect chains routinely strip the referrer header too. user_agent and
-- the UTM/click-id columns give a way to actually tell a future ad/campaign
-- spike apart from another scripted flood, instead of inferring it from
-- timing after the fact.
--
-- Still no IP, no session id, no cookie - same anonymous posture as the
-- rest of this table (see 20260819120000_page_views.sql). user_agent is
-- the raw UA string, which is coarse-grained and not by itself identifying
-- at this site's traffic volume.

alter table page_views add column user_agent text;
alter table page_views add column utm_source text;
alter table page_views add column utm_medium text;
alter table page_views add column utm_campaign text;
alter table page_views add column gclid text;
alter table page_views add column fbclid text;

-- Backs the per-path flood check that runs on every insert (see
-- pathRecentlyFlooded in lib/supabase/page-views.ts) - without this, that
-- check does a full-table scan on every single pageview.
create index if not exists page_views_path_created_at_idx on page_views (path, created_at);

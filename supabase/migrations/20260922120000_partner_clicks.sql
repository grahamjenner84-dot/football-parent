-- Outbound clicks on editorial partner links (Football DNA today), logged
-- first-party.
--
-- Separate from affiliate_clicks on purpose. Affiliate clicks measure links we
-- earn commission on (Amazon, QuickPlay) and those links carry
-- rel="sponsored nofollow". Partner links are EDITORIAL: we link to a partner
-- like Football DNA as a genuine reference and, where there's a sponsorship,
-- want to prove how much traffic that reference sends them. Mixing the two
-- into one table would blur "monetised" with "editorial" and tempt someone to
-- reuse the affiliate rel/nofollow path for a partner link, which would be
-- wrong. See lib/outbound-partners.ts and CLAUDE.md.
--
-- Same anonymous posture as page_views and affiliate_clicks: no IP, no session
-- id, no cookie. Page, destination, partner and timestamp only. Nothing here
-- links a click back to an individual visitor, which is why it doesn't need to
-- sit behind the cookie-consent banner (and why, like the other two, it keeps
-- counting the ~90% of visitors who never make a consent choice and are
-- therefore invisible to GA4).
--
-- Lives in the football-parent-social project (ref jwlwzoklgrzharqvazeg), like
-- the rest of this repo's Supabase usage - never the Coach App project. See
-- CLAUDE.md "Supabase projects - two, kept fully isolated".

create table partner_clicks (
  id bigint generated always as identity primary key,
  -- Page the reader was on when they clicked, e.g. /academy-pathway/how-academy-football-works.
  path text not null,
  -- Full destination URL as rendered in the article.
  href text not null,
  -- Partner slug from lib/outbound-partners.ts (e.g. "football-dna"), so the
  -- report can group by partner without re-parsing hosts.
  partner text not null,
  -- Destination hostname (footballdna.co.uk...), denormalised from href.
  host text not null,
  -- Anchor text as the reader saw it, kept for context.
  link_text text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table partner_clicks enable row level security;

-- Grants-only lockdown, same as affiliate_clicks and every other table in this
-- project: no policies means anon/authenticated get nothing through the Data
-- API, and service_role bypasses RLS but still needs the grant to reach it.
grant select, insert on partner_clicks to service_role;

-- Backs the report's date-range scan.
create index if not exists partner_clicks_created_at_idx
  on partner_clicks (created_at);

-- Backs the per-path flood guard that runs on every insert (see
-- clickRecentlyFlooded in lib/supabase/partner-clicks.ts).
create index if not exists partner_clicks_path_created_at_idx
  on partner_clicks (path, created_at);

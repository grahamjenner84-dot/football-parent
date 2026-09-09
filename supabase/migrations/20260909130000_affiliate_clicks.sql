-- Outbound clicks on affiliate links (Amazon today), logged first-party.
--
-- Exists because Amazon Associates reporting only starts at the point a
-- click reaches Amazon, is aggregated per tracking id rather than per page,
-- and shows nothing at all on a day with no orders. That makes it useless
-- for the question actually worth answering: which article sends people to
-- Amazon, and what share of its readers click. This table answers that from
-- our own side of the link, independently of whether Amazon ever reports a
-- sale.
--
-- Deliberately not GA4-only: GA4's outbound click event is gated on
-- analytics consent, so it only ever sees the accepting share of visitors
-- (see cookie_consent_events for what that share actually is). The gtag
-- event still fires alongside this - see app/components/AffiliateClickTracker.tsx
-- - but this table is the number to trust.
--
-- Same anonymous posture as page_views (see 20260819120000_page_views.sql):
-- no IP, no session id, no cookie. Path, destination and timestamp only.
-- Nothing here links a click back to an individual visitor, which is also
-- why it does not need to sit behind the consent banner.
--
-- Lives in the football-parent-social project (ref jwlwzoklgrzharqvazeg),
-- like the rest of this repo's Supabase usage - not the Coach App project.
-- See CLAUDE.md "Supabase projects - two, kept fully isolated".

create table affiliate_clicks (
  id bigint generated always as identity primary key,
  -- Page the reader was on when they clicked, e.g. /football-gear/best-footballs-by-age.
  path text not null,
  -- Full destination URL as rendered in the article, so a click can be traced
  -- to the exact short link (and therefore the exact product) that earned it.
  href text not null,
  -- Destination hostname (amzn.to, amazon.co.uk...). Denormalised from href
  -- so the report can group by merchant without parsing URLs in SQL.
  merchant text not null,
  -- Anchor text, i.e. the product name as the reader saw it. The readable
  -- half of href, since an amzn.to short link says nothing on its own.
  link_text text,
  -- Which component rendered the link: "gear-picks" for the quick-picks box,
  -- "inline" for an ordinary link in the prose. The point of the quick-picks
  -- component was that it would out-convert inline links; this is what
  -- settles that.
  placement text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table affiliate_clicks enable row level security;

-- Same grants-only lockdown as every other table in this project: no
-- policies means anon/authenticated get nothing through the Data API, and
-- service_role bypasses RLS but still needs the grant to reach it at all
-- (see 20260718192716_instagram_content_automation_grants.sql).
grant select, insert on affiliate_clicks to service_role;

-- Backs the report's date-range scan.
create index if not exists affiliate_clicks_created_at_idx
  on affiliate_clicks (created_at);

-- Backs the per-path/href flood guard that runs on every insert (see
-- clickRecentlyFlooded in lib/supabase/affiliate-clicks.ts), which would
-- otherwise scan the whole table on each click.
create index if not exists affiliate_clicks_path_created_at_idx
  on affiliate_clicks (path, created_at);

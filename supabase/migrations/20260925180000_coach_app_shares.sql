-- Taps on the "Send it to your child's coach" button in the Coach App
-- banner (app/components/CoachAppShareButton.tsx), logged first-party.
--
-- The banner asks parents on grassroots articles to pass the app to their
-- child's coach. Its only other record is a gtag event, which only sees the
-- visitors who accepted analytics cookies. This counts every tap.
--
-- The other half of the loop, the coach opening what was sent, is already
-- in page_views: the shared link carries utm_source=parent-share. The Coach
-- App tab on /admin/seo and the get_coach_app_funnel MCP tool put the two
-- side by side.
--
-- Same anonymous posture as page_views, affiliate_clicks and partner_clicks:
-- no IP, no session id, no cookie. Page, banner variant, how it was shared,
-- and timestamp. Nothing ties a tap to a person, so it isn't consent-gated.
--
-- Lives in the football-parent-social project (ref jwlwzoklgrzharqvazeg),
-- never the Coach App project. See CLAUDE.md "Supabase projects".

create table if not exists coach_app_shares (
  id bigint generated always as identity primary key,
  -- Article the parent was reading, e.g. /parent-guides/what-is-grassroots-football.
  path text not null,
  -- Banner variant carrying the button, e.g. dark-share-article.
  banner_variant text not null,
  -- share-sheet (the phone's share sheet completed), share-cancelled
  -- (opened, then dismissed), clipboard (desktop: link copied), email
  -- (fallback when copying failed).
  method text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table coach_app_shares enable row level security;

-- Grants-only lockdown, same as every other table in this project.
grant select, insert on coach_app_shares to service_role;

create index if not exists coach_app_shares_created_at_idx
  on coach_app_shares (created_at);

-- Backs the per-path flood guard on every insert.
create index if not exists coach_app_shares_path_created_at_idx
  on coach_app_shares (path, created_at);

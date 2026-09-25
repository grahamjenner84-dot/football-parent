-- One anonymous row per new Coach App account, sent by the app itself on the
-- account's first load, so the Coach App funnel tab on /admin/seo can show
-- sign-ups by channel next to the traffic that produced them.
--
-- Why this exists rather than reading the Coach App project: the sign-ups
-- live in that project's profiles table, and CLAUDE.md forbids anything on
-- this site reading Coach App data (it holds children's data). Instead the
-- app sends this site the same kind of anonymous ping it already sends for
-- page views (/api/page-view): no user id, no email, no name, no team, no
-- gclid (only whether there was one). Nothing here identifies a coach, and
-- nothing crosses the other way.
--
-- The attribution fields are only ever present when the coach accepted
-- analytics cookies (see lib/coach-app-handoff.ts). A sign-up without them
-- still sends a row with attributed = false, so the total is complete even
-- when the channel isn't known.
--
-- Channel is not stored: it is derived at read time by lib/coach-app-channels.ts,
-- so changing the rules re-reads history instead of leaving old rows stuck.
--
-- Lives in the football-parent-social project (ref jwlwzoklgrzharqvazeg).

create table if not exists coach_app_signups (
  id bigint generated always as identity primary key,
  -- False when the coach arrived with no attribution at all.
  attributed boolean not null default false,
  -- Page they signed up from: a Coach App landing page, or
  -- /coach-app/sign-in for the app's own sign-in screen.
  landing_path text,
  -- First page of the visit, and how that visit began (Search, Ads,
  -- Internal, Direct, ...).
  entry_path text,
  entry_source_group text,
  -- ?b= value of the article banner that led them to the landing page.
  banner text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  had_gclid boolean not null default false,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table coach_app_signups enable row level security;

grant select, insert on coach_app_signups to service_role;

create index if not exists coach_app_signups_created_at_idx
  on coach_app_signups (created_at);

-- Progress banners actually seen, not just pages that carry one.
--
-- Banner impressions on the Progress pipeline (/admin/seo) are views of pages
-- carrying a Progress banner (progressBannerOnPath): a page view, not proof
-- the banner was scrolled to. The article banner sits mid-article, so many
-- of those views never reach it, and CTR on impressions undersells it.
--
-- One anonymous row the first time at least half of a Progress banner is on
-- screen during a page view (app/components/useProgressBannerSeen.ts, an
-- IntersectionObserver), posted to /api/progress-banner-seen. At most one
-- per banner per page view; nothing is stored in the browser.
--
-- Same anonymous posture as page_views, coach_app_shares and
-- progress_join_events: no IP, no session id, no cookie. Page, placement,
-- the banner's ?b= value (which carries the test arm), and timestamp.
-- Nothing ties a row to a person, so, like page_views, it isn't
-- consent-gated. Graham's own devices and self-declared bots are dropped by
-- the endpoint.
--
-- Written on every visitor request that scrolls to a banner: APPLY THIS
-- BEFORE DEPLOYING THE CODE THAT WRITES IT (CLAUDE.md). Until it runs, the
-- endpoint's inserts fail (silently, from the visitor's side) and the
-- dashboard shows the error in place of the seen counts.
--
-- Lives in the football-parent-social project (ref jwlwzoklgrzharqvazeg),
-- never the Progress project.

create table if not exists progress_banner_seen (
  id bigint generated always as identity primary key,
  -- Page the banner was on, e.g. /academy-pathway/what-is-an-academy-trial.
  path text not null,
  -- home, article or academy-pathway (as in ?b=progress-<placement>).
  placement text not null,
  -- The banner test arm, a or b; null outside the test.
  arm text,
  -- The ?b= value the banner links with, e.g. progress-article-b.
  banner text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table progress_banner_seen enable row level security;

-- Grants-only lockdown, same as every other table in this project.
grant select, insert on progress_banner_seen to service_role;

create index if not exists progress_banner_seen_created_at_idx
  on progress_banner_seen (created_at);

-- Backs the per-path flood guard on every insert.
create index if not exists progress_banner_seen_path_created_at_idx
  on progress_banner_seen (path, created_at);

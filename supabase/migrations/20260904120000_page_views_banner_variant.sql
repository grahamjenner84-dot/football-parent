-- Records which Coach App banner creative sent a visitor to
-- /football-parent-coach-app, so the dark bar and the light card can be
-- compared on clicks rather than on taste.
--
-- The banner links carry ?b=<style>-<audience>-<placement> (see
-- app/components/CoachAppBanner.tsx); PageViewPing.tsx forwards that value
-- here. Deliberately NOT reusing utm_source/utm_medium for this: those are
-- read by GA4 as an acquisition source, and setting them on an INTERNAL
-- link would start a new GA4 session and re-attribute real organic traffic
-- to the banner, corrupting the acquisition reports to measure a button.
-- A private "b" param is invisible to GA4's attribution and only means
-- something to our own logger.
--
-- Same anonymous posture as the rest of this table (see
-- 20260819120000_page_views.sql): no IP, no session id, no cookie. The
-- value is one of a small fixed set of creative ids, not anything about
-- the visitor.

alter table page_views add column banner_variant text;

-- The variant report filters on this column over a date range; without an
-- index that's a full scan of a table that grows with every pageview.
create index if not exists page_views_banner_variant_idx
  on page_views (banner_variant, created_at)
  where banner_variant is not null;

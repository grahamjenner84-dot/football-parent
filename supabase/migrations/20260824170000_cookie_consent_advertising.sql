-- Add an advertising_granted column alongside the existing analytics_granted,
-- so the cookie consent banner (app/components/CookieConsent.tsx) can record
-- a separate advertising consent choice - scaffolding for Google Ads/Meta
-- consent signals (Google Consent Mode v2's ad_storage/ad_user_data/
-- ad_personalization, and a fbq('consent', ...) stub) described in the
-- Privacy Policy's "Cookies and advertising" section, ahead of any actual
-- ad platform tag being added to the site.
--
-- Backfill existing rows to false: they predate the advertising toggle, so
-- no advertising consent was ever actually granted for them.
alter table cookie_consent_events
  add column advertising_granted boolean not null default false;

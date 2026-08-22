-- Adds a referrer bucket to page_views so the anonymous, cookie-consent-
-- independent pageview log (see 20260819120000_page_views.sql) can also
-- answer "where did visitors come from" without needing GA4, which only
-- fires post-consent and undercounts.
--
-- Deliberately stores only the referrer HOSTNAME (e.g. "www.google.com"),
-- never the full referrer URL - same anonymous, no-PII posture as the rest
-- of this table. Classification into Search/Social/AI/Direct groups happens
-- at read time in lib/referrer-sources.ts, not at write time, so new
-- sources (a new AI tool, say) can be reclassified into existing history
-- without re-collecting anything.

alter table page_views add column referrer_host text;

-- Which country each page view came from, so the Countries tab on /admin/seo
-- can answer "is this a UK audience?" - prompted by mornings where a quarter
-- of the day's views had landed before 6.30am UK time, which is odd for a
-- site written for UK parents.
--
-- Filled from Vercel's x-vercel-ip-country request header (ISO 3166-1
-- alpha-2, e.g. "GB") in app/api/page-view/route.ts. The IP itself is never
-- stored, only the two-letter country it geolocated to, which keeps the same
-- anonymous posture as the rest of this table (see
-- 20260819120000_page_views.sql): nothing linkable back to an individual.
-- Rows from before this column existed stay null and report as "Unknown".

alter table page_views add column country text;

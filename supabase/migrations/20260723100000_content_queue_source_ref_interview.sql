-- Documents the content_queue.source_ref shape used by interview items
-- (content_type='interview'), per the amended Phase F spec. No schema
-- change - source_ref is already a jsonb column (see migration
-- 20260722090000_content_queue_source_ref.sql) - this migration only
-- extends its column comment so the shape is documented in one place
-- alongside the 'gsc' shape, the same way render_payload's shape is
-- documented per content_type in migration
-- 20260719140000_render_pipeline_payload.sql.
--
-- Interviews are published as a Football Parent article FIRST, then
-- repurposed to social. Contributor identity (name, role, bio, photo) lives
-- in the article's prose, not a structured field - Phase F must never
-- scrape/infer identity from article text (unreliable, and misattributing a
-- real person's credentials is unacceptable). So for content_type='interview'
-- (source='manual' - these are low-volume/high-touch, entered by hand, not
-- derived), source_ref carries:
--
--   {
--     articlePage: "<pathname>",   -- the published interview article Phase F
--                                     reads to select verbatim quotes from
--     contributor: {
--       name: "<full name>",
--       role: "<short role/credentials>",
--       bio: "<full supplied bio, article-length ~100 words - Phase F
--              shortens this to ~15 words for the slide, never adding to it>",
--       photoUrl: "<uploaded/hosted photo URL or data URI - Phase F does not
--                    source images, this is passed straight through as the
--                    render module's bioSrc>"
--     }
--   }
--
-- See lib/instagram/copy-flow.ts's InterviewContributor type and
-- generateInterviewCarousel() for how these fields are consumed.

comment on column content_queue.source_ref is
  'Structured provenance for the queue item - shape depends on source:
   source=''gsc'' -> { page, queries, opportunityType, reportPeriodEnd, extractedAt } (dedup + traceability, see migration 20260722090000).
   content_type=''interview'' (source=''manual'') -> { articlePage, contributor: { name, role, bio, photoUrl } } - contributor identity supplied by hand, never scraped from the article (see migration 20260723100000).
   other sources -> ''{}''.';

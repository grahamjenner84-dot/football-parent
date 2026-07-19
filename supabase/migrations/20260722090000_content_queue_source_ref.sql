-- Phase E (GSC-derived content ideation): content_queue.topic is a free-text
-- brief with no structured way to say WHERE an idea came from. The ideation
-- job needs two things a plain topic string can't give it:
--   1. Dedup - "don't requeue the same page's carousel idea every week" needs
--      a queryable field, not substring matching on topic.
--   2. Traceability - the later copywriting phase (and a human reviewing the
--      queue) should be able to see which page/query drove the idea without
--      re-deriving it from the topic text.
--
-- source_ref is one JSON blob per queue item, shape depends on source:
--   source = 'gsc'  -> { page: "<pathname>", queries: [...], opportunityType,
--                         reportPeriodEnd, extractedAt }
--   other sources   -> '{}' (default) - nothing to trace yet.
--
-- Queried via the ->> operator for dedup (source_ref->>'page' = pathname),
-- hence the GIN index rather than a plain btree.

alter table content_queue add column source_ref jsonb not null default '{}'::jsonb;

create index content_queue_source_ref_idx on content_queue using gin (source_ref);

comment on column content_queue.source_ref is
  'Structured provenance for the queue item - see migration comment for the shape per source. Used for de-dup (source=gsc) and traceability back to the originating page/query.';

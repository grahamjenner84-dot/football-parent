-- Phase A of Instagram automation: the local batch renderer needs somewhere
-- to read the actual render-ready content from. content_queue.topic is only
-- ever a brief ("pre-season nerves"), not the drawable payload - there is no
-- content-generation step yet that turns a brief into joke setup/punchline
-- text, reel slide copy, or expert-quote Q&As. Until that generation step
-- exists, render_payload is hand-authored (direct SQL/Studio) per post.
--
-- render_payload is one JSON blob per post, shaped to match exactly what the
-- corresponding core module's server renderer expects (see
-- lib/renderers/*-server.ts and scripts/render-*-sample.mjs for the shapes):
--
--   content_type = 'joke'      -> { joke: { setup, punch, layout }, platform }
--   content_type = 'education' -> { reel: { day, slides: [...] }, brand: {...},
--                                   templateId, bgUrlBySlide?, audioUrl? }
--   content_type = 'interview' -> { slides: [...], data: {...}, logoSrc?,
--                                   bioSrc?, secsPerSlide?, audioUrl? }
--                                   (format='carousel' renders each slide to
--                                   an image; format='reel' assembles them
--                                   into a video like 'education' does)
--
-- content_type is denormalized onto posts (rather than requiring a join
-- through content_queue_id, which is nullable/on delete set null) so the
-- renderer can always pick the right core module for a post on its own.

create extension if not exists "pgcrypto";

alter table posts add column content_type content_type;

update posts p
set content_type = cq.content_type
from content_queue cq
where cq.id = p.content_queue_id
  and p.content_type is null;

alter table posts add column render_payload jsonb not null default '{}'::jsonb;

-- Reuses the existing shared content_status enum rather than adding new
-- values: for posts specifically, 'approved' now means "payload ready,
-- awaiting render" and 'scheduled' means "rendered, files uploaded, waiting
-- for its scheduled_time to publish". A freshly created post starts awaiting
-- render, not already scheduled, so the default changes accordingly.
alter table posts alter column status set default 'approved';

comment on column posts.content_type is
  'Denormalized from content_queue.content_type at creation time - picks which core render module (single-slide/reel/expert-quote) handles this post.';
comment on column posts.render_payload is
  'The exact JSON input the render script passes to the core module for this post. Empty ({}) means nothing to render yet. See migration comment for the shape per content_type.';

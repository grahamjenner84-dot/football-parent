-- Instagram content automation system (Phase 1): schema for managed accounts,
-- the content queue, published posts + slides + metrics, hook performance
-- tracking, and periodic AI suggestions. Multi-tenant from the start via
-- account_id on every content table, so a second Instagram account/niche can
-- be added later without a schema change.
--
-- HARD ISOLATION RULE: this schema belongs only to the football-parent-social
-- Supabase project (ref jwlwzoklgrzharqvazeg). It must never be applied to,
-- or share any credentials/connection with, the separate "Coach App" project
-- (ref uqdtprphhsyrnhzfvzrk), which holds children's personal data. The
-- social system publishes publicly and must have no data path to the Coach
-- App project. See CLAUDE.md "Supabase projects — two, kept fully isolated".

create extension if not exists "pgcrypto";

-- Enums -----------------------------------------------------------------

create type content_type as enum ('joke', 'education', 'interview');

-- Shared lifecycle status for both content_queue and posts: a queue item
-- moves draft -> pending_qc -> pending_approval -> approved, then becomes a
-- post which moves scheduled -> published (or failed). rejected covers a
-- queue item killed before it ever became a post.
create type content_status as enum (
  'draft',
  'pending_qc',
  'pending_approval',
  'approved',
  'rejected',
  'scheduled',
  'published',
  'failed'
);

create type content_source as enum ('gsc', 'performance_feedback', 'manual', 'chat');

create type post_format as enum ('carousel', 'reel');

create type ai_suggestion_status as enum ('pending', 'applied', 'dismissed');

-- Tables ------------------------------------------------------------------

create table accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  niche text not null,
  instagram_account_id text,
  instagram_access_token text,
  token_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table content_queue (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  content_type content_type not null,
  status content_status not null default 'draft',
  topic text not null,
  source content_source not null default 'manual',
  priority int not null default 0,
  created_at timestamptz not null default now()
);

create index content_queue_account_id_idx on content_queue(account_id);
create index content_queue_status_idx on content_queue(status);
create index content_queue_content_type_idx on content_queue(content_type);

create table posts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  content_queue_id uuid references content_queue(id) on delete set null,
  format post_format not null,
  caption text,
  hook_text text,
  scheduled_time timestamptz,
  status content_status not null default 'scheduled',
  ig_media_id text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index posts_account_id_idx on posts(account_id);
create index posts_status_idx on posts(status);
create index posts_scheduled_time_idx on posts(scheduled_time);
create index posts_content_queue_id_idx on posts(content_queue_id);

create table post_slides (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  slide_order int not null,
  image_url text,
  video_url text,
  alt_text text,
  text_content text,
  unique (post_id, slide_order)
);

create index post_slides_post_id_idx on post_slides(post_id);

create table post_metrics (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  reach int,
  impressions int,
  likes int,
  comments int,
  saves int,
  shares int,
  views int,
  pulled_at timestamptz not null default now()
);

create index post_metrics_post_id_idx on post_metrics(post_id);

create table hook_library (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  post_id uuid references posts(id) on delete set null,
  hook_text text not null,
  style_tag text,
  created_at timestamptz not null default now()
);

create index hook_library_account_id_idx on hook_library(account_id);
create index hook_library_post_id_idx on hook_library(post_id);

create table ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  generated_at timestamptz not null default now(),
  suggestion_text text not null,
  based_on_post_ids uuid[] not null default '{}',
  status ai_suggestion_status not null default 'pending'
);

create index ai_suggestions_account_id_idx on ai_suggestions(account_id);
create index ai_suggestions_status_idx on ai_suggestions(status);

-- RLS -----------------------------------------------------------------
-- All writes come from server-side jobs using the service_role key, which
-- bypasses RLS entirely. Enabling RLS with no anon/authenticated policies
-- means the anon/publishable key gets zero access to any of these tables,
-- including the instagram_access_token column on accounts.

alter table accounts enable row level security;
alter table content_queue enable row level security;
alter table posts enable row level security;
alter table post_slides enable row level security;
alter table post_metrics enable row level security;
alter table hook_library enable row level security;
alter table ai_suggestions enable row level security;

-- Seed --------------------------------------------------------------------

insert into accounts (name, niche, instagram_account_id, instagram_access_token, token_expires_at)
values ('Football Parent', 'UK youth football / academy pathway parenting', null, null, null);

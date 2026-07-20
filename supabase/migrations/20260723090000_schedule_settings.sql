-- Phase G (approval/handoff page): carousels get auto-spaced onto a
-- configurable posting cadence when approved (never all published at once),
-- with a manual date/time override per item. The cadence/posting-time needs
-- to be tunable from the review page itself without a code deploy, hence a
-- proper settings table rather than an env var - one row per account.
--
-- posting_time is a wall-clock "HH:MM" in `timezone` (IANA name, e.g.
-- 'Europe/London'), resolved to a UTC instant at schedule time by
-- lib/instagram/review-pipeline.ts. cadence_days is numeric (not integer) so
-- a future "twice a day" cadence (0.5) is representable without another
-- migration, though the v1 UI only exposes whole-day presets.
create table schedule_settings (
  account_id uuid primary key references accounts(id) on delete cascade,
  posting_time text not null default '18:00',
  cadence_days numeric not null default 1,
  timezone text not null default 'Europe/London',
  updated_at timestamptz not null default now()
);

alter table schedule_settings enable row level security;

grant select, insert, update, delete on schedule_settings to service_role;

-- The only "reason" column the schema has (see posts.error_message, used by
-- the publish pipeline for publish failures) is repurposed for QC/manual
-- notes elsewhere, but a manually posted reel's source permalink is worth
-- keeping on its own column: it's the audit trail for how ig_media_id was
-- resolved (matched against the account's recent media by permalink, see
-- markManualReelPosted in review-pipeline.ts), independent of any
-- error/rejection reason that column already carries.
alter table posts add column manual_permalink text;

-- Link-building outreach pipeline: one row per prospect page, plus an event
-- log for the scoreboard.
--
-- Filled by the weekly outreach run (.claude/skills/football-parent-outreach,
-- scripts/outreach/cli.ts), worked through by Graham at /admin/outreach.
-- Nothing here sends email: drafts are opened in Gmail and sent by hand.
--
-- Lives in the football-parent-social project (ref jwlwzoklgrzharqvazeg),
-- like the rest of this repo's Supabase usage, never the Coach App project.
-- See CLAUDE.md "Supabase projects - two, kept fully isolated".

create table outreach_prospects (
  id bigint generated always as identity primary key,
  -- The exact page we'd want a link from. Unique so discovery can't re-add
  -- something already worked (or already rejected).
  url text not null unique,
  domain text not null,
  title text,
  -- lib/outreach/quality.ts ProspectType.
  prospect_type text not null default 'other',
  is_uk boolean,
  -- Where it came from: 'import:<file>', 'discovery:<query>', 'manual'.
  source text not null,
  -- DataForSEO bulk_ranks domain rank. Screening signal only.
  authority integer,
  -- 0-10 relevance judged by the weekly run.
  fit smallint,
  fit_note text,
  -- Our page to pitch, e.g. /football-parent-coach-app/equal-playing-time-calculator.
  fp_page text,
  angle text,
  contact_name text,
  contact_email text,
  -- Contact form or page where the address was found, for when there's no email.
  contact_url text,
  -- lib/outreach/lifecycle.ts STATUSES.
  status text not null default 'backlog',
  -- Why it was parked or rejected (lib/outreach/quality.ts reasons).
  status_reason text,
  score integer not null default 0,
  score_reasons text,
  draft_subject text,
  draft_body text,
  -- One tailored line for the chase-ups; the rest is the generic template.
  chase_line text,
  drafted_at timestamptz,
  sent_at timestamptz,
  last_contact_at timestamptz,
  next_action_at timestamptz,
  chase_count smallint not null default 0,
  won_link_url text,
  link_checked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index outreach_prospects_status_score_idx on outreach_prospects (status, score desc);
create index outreach_prospects_domain_idx on outreach_prospects (domain);
create index outreach_prospects_next_action_idx on outreach_prospects (next_action_at) where next_action_at is not null;

create table outreach_events (
  id bigint generated always as identity primary key,
  prospect_id bigint not null references outreach_prospects (id) on delete cascade,
  -- 'drafted', 'mark_sent', 'mark_chased', 'replied', 'won', 'lost',
  -- 'no_reply', 'skip', 'park', 'restore', 'link_found'.
  kind text not null,
  detail text,
  created_at timestamptz not null default now()
);

create index outreach_events_created_at_idx on outreach_events (created_at);
create index outreach_events_prospect_idx on outreach_events (prospect_id);

alter table outreach_prospects enable row level security;
alter table outreach_events enable row level security;

-- Grants-only lockdown, same as every other table in this project: no
-- policies means anon/authenticated get nothing through the Data API, and
-- service_role bypasses RLS but still needs the grant.
grant select, insert, update, delete on outreach_prospects to service_role;
grant select, insert on outreach_events to service_role;

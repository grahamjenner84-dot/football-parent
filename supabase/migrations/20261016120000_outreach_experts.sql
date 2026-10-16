-- Experts to approach: people whose quotes or interviews would fill an
-- E-E-A-T gap on a Football Parent page (a sport psychologist for the
-- academy release article, a parent-education founder for the touchline
-- pages). Kept apart from outreach_prospects on purpose: a prospect is a
-- page we want a link from and goes through lib/outreach/quality.ts and the
-- send/chase lifecycle; an expert is a person we want words from, often on
-- a site the link gate would reject (multi-sport, non-UK), and is approached
-- by DM or email by hand. Shown on the "Experts to approach" tab at
-- /admin/outreach.
--
-- Public professional details only (name, role, website, public contact,
-- Instagram handle). Lives in the football-parent-social project (ref
-- jwlwzoklgrzharqvazeg), never the Coach App project. See CLAUDE.md
-- "Supabase projects".

create table if not exists outreach_experts (
  id bigint generated always as identity primary key,
  name text not null,
  role text,
  website text,
  contact text,
  instagram text,
  -- What the expert would add, in words: the question they can answer.
  eeat_gap text,
  -- Our page(s) it would strengthen, one path per line.
  fp_pages text,
  status text not null default 'to_approach'
    check (status in ('to_approach', 'contacted', 'agreed', 'published', 'declined')),
  notes text,
  contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table outreach_experts enable row level security;

-- Grants-only lockdown, same as every other table in this project.
grant select, insert, update, delete on outreach_experts to service_role;

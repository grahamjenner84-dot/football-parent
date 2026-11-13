-- The shape of each game time plan made in the public calculator: format,
-- match length, squad size, how often players change, whether positions and
-- the keeper rotate. One row per page load, holding the plan as it stood when
-- the coach stopped changing it, so the calculator's users can be described
-- (which formats, how big a squad, how much rotation) and not just counted.
--
-- Sent by the Coach App's calculator (src/data/calculatorTracking.ts,
-- reportCalculatorPlan) to /api/calculator-plan, the same app -> site route
-- as coach_app_signups and the calculator's step events. Graham approved it
-- on 2026-11-13 on the same terms: settings and counts only. No player names,
-- no positions per player, no keeper name, no user id, no gclid. The squad is
-- a number. load_id is a random value made fresh on every page load and never
-- stored in the browser, so it ties a load's updates together and nothing else.
--
-- Lives in the football-parent-social project (ref jwlwzoklgrzharqvazeg).

create table if not exists calculator_plans (
  id bigint generated always as identity primary key,
  load_id uuid not null unique,
  -- True when made in the calculator embedded on the site's calculator page,
  -- false in the full-screen calculator at /coach-app/game-time-calculator.
  embedded boolean not null default false,
  -- e.g. '7v7'; the calculator has no age field, format stands in for it.
  format text not null,
  formation text,
  -- 'single' | 'halves' | 'quarters'
  period_type text,
  period_minutes integer,
  squad_size integer not null,
  -- Players on the pitch for this format (incl. keeper where there is one).
  on_pitch integer,
  -- How many blocks each period is split into: 1 = changes only at the breaks.
  stints_per_period integer,
  rotate_positions boolean,
  gk_rotates boolean,
  max_substitutions integer,
  min_time_per_player text,
  -- A keeper was named to stay in goal (the name itself is never sent).
  fixed_keeper boolean not null default false,
  -- From the plan the calculator produced.
  subs integer,
  minutes_spread numeric,
  -- Settings the coach changed from the format's own defaults, e.g.
  -- {period_minutes, stints_per_period}. Empty: defaults kept.
  customised text[] not null default '{}',
  -- The calculator opened with a squad already saved from an earlier visit.
  returning_visit boolean not null default false,
  referrer_host text,
  had_gclid boolean not null default false,
  user_agent text,
  updates integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table calculator_plans enable row level security;

grant select, insert, update on calculator_plans to service_role;

create index if not exists calculator_plans_created_at_idx
  on calculator_plans (created_at);

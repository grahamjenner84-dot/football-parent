import { createClient } from "@supabase/supabase-js";
import { ukDay } from "@/lib/uk-day";

// The shape of each plan made in the public game time calculator: format,
// match length, squad size, rotation. One row per page load, upserted on
// load_id as the coach changes settings, so a row holds the plan as it stood
// when they stopped. Sent by the Coach App's calculator through
// /api/calculator-plan; see the calculator_plans migration for what is and is
// never sent (no names, no ids). football-parent-social project only.

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// When rows started arriving (the coach-app release that sends them). Rows
// before it are test traffic. Update to the real release time when it ships.
export const CALCULATOR_PLANS_STARTED_AT = "2026-11-13T18:00:00Z";

export const PERIOD_TYPES = ["single", "halves", "quarters"] as const;
export type PlanPeriodType = (typeof PERIOD_TYPES)[number];

export const CUSTOMISABLE = [
  "formation",
  "period_type",
  "period_minutes",
  "stints_per_period",
  "rotate_positions",
  "gk_rotates",
  "max_substitutions",
  "min_time_per_player",
] as const;

export interface CalculatorPlanEvent {
  loadId: string;
  embedded: boolean;
  format: string;
  formation: string | null;
  periodType: PlanPeriodType | null;
  periodMinutes: number | null;
  squadSize: number;
  onPitch: number | null;
  stintsPerPeriod: number | null;
  rotatePositions: boolean | null;
  gkRotates: boolean | null;
  maxSubstitutions: number | null;
  minTimePerPlayer: string | null;
  fixedKeeper: boolean;
  subs: number | null;
  minutesSpread: number | null;
  customised: string[];
  returningVisit: boolean;
  referrerHost: string | null;
  hadGclid: boolean;
}

// A calculator load sends a handful of updates at most. New loads beyond
// this many a minute are somebody posting to the endpoint.
const NEW_LOAD_FLOOD_WINDOW_MS = 60_000;
const NEW_LOAD_FLOOD_THRESHOLD = 30;
// Updates per load beyond this are ignored (a script hammering one id).
const MAX_UPDATES_PER_LOAD = 40;

export async function logCalculatorPlan(event: CalculatorPlanEvent, userAgent: string | null): Promise<void> {
  const supabase = adminClient();

  const row = {
    embedded: event.embedded,
    format: event.format,
    formation: event.formation,
    period_type: event.periodType,
    period_minutes: event.periodMinutes,
    squad_size: event.squadSize,
    on_pitch: event.onPitch,
    stints_per_period: event.stintsPerPeriod,
    rotate_positions: event.rotatePositions,
    gk_rotates: event.gkRotates,
    max_substitutions: event.maxSubstitutions,
    min_time_per_player: event.minTimePerPlayer,
    fixed_keeper: event.fixedKeeper,
    subs: event.subs,
    minutes_spread: event.minutesSpread,
    customised: event.customised,
    returning_visit: event.returningVisit,
    referrer_host: event.referrerHost,
    had_gclid: event.hadGclid,
    user_agent: userAgent,
  };

  const { data: existing, error: readError } = await supabase
    .from("calculator_plans")
    .select("id, updates")
    .eq("load_id", event.loadId)
    .maybeSingle();
  if (readError) throw new Error("Failed to read calculator_plans: " + readError.message);

  if (existing) {
    if (existing.updates >= MAX_UPDATES_PER_LOAD) return;
    // The first send's source stays: later sends come from the same load.
    const { referrer_host: _r, had_gclid: _g, user_agent: _u, ...update } = row;
    void _r;
    void _g;
    void _u;
    const { error } = await supabase
      .from("calculator_plans")
      .update({ ...update, updates: existing.updates + 1, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw new Error("Failed to update calculator_plans row: " + error.message);
    return;
  }

  const since = new Date(Date.now() - NEW_LOAD_FLOOD_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("calculator_plans")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if ((count ?? 0) >= NEW_LOAD_FLOOD_THRESHOLD) return;

  const { error } = await supabase.from("calculator_plans").insert({ load_id: event.loadId, ...row });
  // A second send racing the first for a new load: the first one won, fine.
  if (error && error.code !== "23505") {
    throw new Error("Failed to insert calculator_plans row: " + error.message);
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

// The calculator has no age field. Format is the FA's mini-soccer and youth
// progression, so it stands in: a guide, not a fact about the team.
const AGE_HINT: Record<string, string> = {
  "3v3": "U6 and under",
  "4v4": "U6-U7",
  "5v5": "U7-U8",
  "6v6": "U7-U8 (some leagues)",
  "7v7": "U9-U10",
  "8v8": "U11 (some leagues)",
  "9v9": "U11-U12",
  "11v11": "U13 and up, or adults",
};

type Row = {
  embedded: boolean;
  format: string;
  formation: string | null;
  period_type: string | null;
  period_minutes: number | null;
  squad_size: number;
  on_pitch: number | null;
  stints_per_period: number | null;
  rotate_positions: boolean | null;
  gk_rotates: boolean | null;
  max_substitutions: number | null;
  min_time_per_player: string | null;
  fixed_keeper: boolean;
  subs: number | null;
  minutes_spread: number | null;
  customised: string[] | null;
  returning_visit: boolean;
  created_at: string;
};

function tally<T>(rows: Row[], key: (r: Row) => T): { value: T; plans: number; share: number }[] {
  const m = new Map<T, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
  return [...m.entries()]
    .map(([value, plans]) => ({ value, plans, share: rows.length ? Math.round((plans / rows.length) * 1000) / 10 : 0 }))
    .sort((a, b) => b.plans - a.plans);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function periodsIn(type: string | null): number {
  return type === "quarters" ? 4 : type === "halves" ? 2 : 1;
}

export async function getCalculatorPlans(days: number = 30) {
  const supabase = adminClient();
  const windowStart = new Date(Date.now() - days * 864e5).toISOString();
  const since = windowStart > CALCULATOR_PLANS_STARTED_AT ? windowStart : CALCULATOR_PLANS_STARTED_AT;

  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("calculator_plans")
      .select(
        "embedded, format, formation, period_type, period_minutes, squad_size, on_pitch, stints_per_period, rotate_positions, gk_rotates, max_substitutions, min_time_per_player, fixed_keeper, subs, minutes_spread, customised, returning_visit, created_at"
      )
      .gte("created_at", since)
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error("Failed to read calculator_plans: " + error.message);
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < 1000) break;
  }

  const benchSizes = rows.filter((r) => r.on_pitch !== null).map((r) => r.squad_size - (r.on_pitch as number));
  // Planned changes per game: blocks in the game minus one. 1 block per
  // period in halves is a change at half time only.
  const changeWindows = rows
    .filter((r) => r.stints_per_period !== null)
    .map((r) => periodsIn(r.period_type) * (r.stints_per_period as number) - 1);
  const customisedCounts = new Map<string, number>();
  for (const r of rows) for (const c of r.customised ?? []) customisedCounts.set(c, (customisedCounts.get(c) ?? 0) + 1);
  const pct = (n: number) => (rows.length ? Math.round((n / rows.length) * 1000) / 10 : 0);

  return {
    days,
    since,
    plans: rows.length,
    notes: {
      unit: "One plan per calculator page load, as it stood when the coach stopped changing settings.",
      age: "The calculator has no age field: ageHint is the usual age group for the format, a guide only.",
      defaults: "The calculator opens on 5v5 for a first-time visitor. customisedShare and keptDefaults show how many changed anything; a 5v5 row with nothing customised may be a coach who never looked at the format.",
    },
    byFormat: tally(rows, (r) => r.format).map((t) => ({ ...t, ageHint: AGE_HINT[t.value] ?? null })),
    squadSize: { median: median(rows.map((r) => r.squad_size)), distribution: tally(rows, (r) => r.squad_size).sort((a, b) => a.value - b.value) },
    benchSize: { median: median(benchSizes), distribution: tally(rows.filter((r) => r.on_pitch !== null), (r) => r.squad_size - (r.on_pitch as number)).sort((a, b) => a.value - b.value) },
    matchSetup: tally(rows, (r) => `${r.period_type ?? "?"} x ${r.period_minutes ?? "?"} min`),
    rotation: {
      changeWindowsPerGame: { median: median(changeWindows), distribution: tally(rows.filter((r) => r.stints_per_period !== null), (r) => periodsIn(r.period_type) * (r.stints_per_period as number) - 1).sort((a, b) => a.value - b.value) },
      stintsPerPeriod: tally(rows, (r) => r.stints_per_period),
      breaksOnlyShare: pct(rows.filter((r) => r.stints_per_period === 1).length),
      subsPlanned: { median: median(rows.filter((r) => r.subs !== null).map((r) => r.subs as number)) },
      minutesSpread: { median: median(rows.filter((r) => r.minutes_spread !== null).map((r) => Number(r.minutes_spread))), note: "Most minus fewest minutes any player gets in the plan." },
      rotatePositionsShare: pct(rows.filter((r) => r.rotate_positions === true).length),
      keeperRotatesShare: pct(rows.filter((r) => r.gk_rotates === true).length),
      fixedKeeperNamedShare: pct(rows.filter((r) => r.fixed_keeper).length),
    },
    limits: {
      maxSubstitutions: tally(rows, (r) => r.max_substitutions),
      minTimePerPlayer: tally(rows, (r) => r.min_time_per_player),
    },
    customisedShare: pct(rows.filter((r) => (r.customised ?? []).length > 0).length),
    keptDefaults: rows.filter((r) => (r.customised ?? []).length === 0).length,
    customisedSettings: [...customisedCounts.entries()].map(([setting, plans]) => ({ setting, plans, share: pct(plans) })).sort((a, b) => b.plans - a.plans),
    where: { embeddedOnArticle: rows.filter((r) => r.embedded).length, fullScreen: rows.filter((r) => !r.embedded).length },
    returningVisits: rows.filter((r) => r.returning_visit).length,
    byDay: tally(rows, (r) => ukDay(r.created_at)).sort((a, b) => (a.value < b.value ? 1 : -1)).map((t) => ({ date: t.value, plans: t.plans })),
  };
}

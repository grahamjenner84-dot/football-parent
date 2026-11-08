import { createClient } from "@supabase/supabase-js";

// Weekly activity, habit and paying counts from the Coach App (coach-app
// migration 0071, usage_insights()), posted hourly to /api/coach-app-insights
// and stored in coach_app_insights in football-parent-social. Server only:
// uses the service role key. Never import from client code, and never point at
// the Coach App project: data only flows app -> site.

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Coaches who did each thing in a period. "Did" means a team they are on did
 * it: definitions in coach-app migration 0071. */
export interface ActivityCounts {
  signups: number;
  /** Opened the app. Null for weeks ending before activity_days began
   * (openedTrackedFrom). */
  opened: number | null;
  scheduled: number;
  wentLive: number;
  finished: number;
  /** Scheduled, went live or finished: anything beyond opening the app. */
  didSomething: number;
}

export const STAGES = ["signedUp", "team", "scheduled", "live", "finished1", "finished2"] as const;
export type Stage = (typeof STAGES)[number];

export const SOURCE_LABELS = [
  "Google Ads",
  "Android app",
  "Shared link",
  "Article banner",
  "Search",
  "Site link",
  "Direct",
  "Other",
  "Unknown (Android)",
  "Unknown (web)",
] as const;
export const FORM_LABELS = [
  "Android app",
  "Coach App page",
  "Coach App ad pages",
  "Calculator",
  "App sign-in screen",
  "Other page",
  "Unknown",
] as const;

/** Sign-up quality for one channel or form. Stage counts are of `settled`
 * (accounts signed up 14+ days ago); plan counts are of all accounts. */
export interface QualityRow {
  label: string;
  accounts: number;
  last30d: number;
  settled: number;
  team: number;
  scheduled: number;
  wentLive: number;
  finished: number;
  finished2: number;
  backAfterWeek1: number;
  matchHabit: number;
  appHabit: number;
  paid: number;
  trial: number;
  lapsed: number;
}

export const HABIT_SEGMENTS = ["matchHabit", "appHabitOnly", "noHabit"] as const;
export type HabitSegment = (typeof HABIT_SEGMENTS)[number];

export interface PlanSplit {
  accounts: number;
  paid: number;
  trial: number;
  lapsed: number;
}

export interface CoachAppInsights {
  takenAt: string;
  /** The UK day the counts were taken on. */
  today: string;
  openedTrackedFrom: string;
  /** Last 8 UK weeks (Monday start), newest first; the first is the week so far. */
  weeks: (ActivityCounts & { weekStart: string })[];
  /** Last 7 UK days (today included) and the 7 before. */
  rolling: { last7: ActivityCounts; prev7: ActivityCounts };
  habit: {
    windowStart: string;
    windowEnd: string;
    /** Opened the app in 3 or 4 of the last 4 complete weeks. */
    appHabit: number;
    /** Used it at a match (went live or finished) in 3 or 4 of them. */
    matchHabit: number;
    /** Accounts that existed for the whole window: the base for the spreads. */
    eligible: number;
    /** Of those, how many did it in 0, 1, 2, 3, 4 of the weeks. */
    openedWeeks: number[];
    matchWeeks: number[];
  };
  recency: {
    today: number;
    d1to7: number;
    d8to14: number;
    d15to30: number;
    over30: number;
    never: number;
    onlyFirstDay: number;
    atRisk: number;
    matchNext7d: number;
    matchNext7dNeverLive: number;
  };
  /** Last 8 sign-up weeks, newest first: how far each week's accounts have got. */
  cohorts: {
    weekStart: string;
    signedUp: number;
    team: number;
    players: number;
    scheduled: number;
    wentLive: number;
    finished: number;
    finished2: number;
    backAfterWeek1: number;
    paid: number;
  }[];
  /** Sign-up quality by channel and by form. Empty from a sender that
   * predates them. */
  bySource: QualityRow[];
  byForm: QualityRow[];
  paying: {
    paid: number;
    trial: number;
    lapsed: number;
    trialsEndingNext7d: number;
    trialsEndedLast7d: number;
    byStage: (PlanSplit & { stage: Stage; trialEndingNext7d: number })[];
    byHabit: (PlanSplit & { segment: HabitSegment })[];
  };
}

// ---------------------------------------------------------------------------
// Validation: rebuild from known keys only. Anything that isn't a whole
// number, a YYYY-MM-DD label or a known stage/segment name is refused, so the
// payload can carry counts and nothing else.
// ---------------------------------------------------------------------------

class BadInsights extends Error {}

type Obj = Record<string, unknown>;

function obj(value: unknown, where: string): Obj {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new BadInsights(`${where}: not an object`);
  return value as Obj;
}

function arr(value: unknown, where: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new BadInsights(`${where}: not a list`);
  return value;
}

function n(value: unknown, where: string): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value < 10_000_000) return value;
  throw new BadInsights(`${where}: not a count`);
}

function nOrNull(value: unknown, where: string): number | null {
  return value === null ? null : n(value, where);
}

function day(value: unknown, where: string): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  throw new BadInsights(`${where}: not a date`);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], where: string): T {
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) return value as T;
  throw new BadInsights(`${where}: unknown value`);
}

function activity(value: unknown, where: string): ActivityCounts {
  const o = obj(value, where);
  return {
    signups: n(o.signups, `${where}.signups`),
    opened: nOrNull(o.opened, `${where}.opened`),
    scheduled: n(o.scheduled, `${where}.scheduled`),
    wentLive: n(o.wentLive, `${where}.wentLive`),
    finished: n(o.finished, `${where}.finished`),
    didSomething: n(o.didSomething, `${where}.didSomething`),
  };
}

function planSplit(o: Obj, where: string): PlanSplit {
  return {
    accounts: n(o.accounts, `${where}.accounts`),
    paid: n(o.paid, `${where}.paid`),
    trial: n(o.trial, `${where}.trial`),
    lapsed: n(o.lapsed, `${where}.lapsed`),
  };
}

function qualityRows(value: unknown, allowed: readonly string[], where: string): QualityRow[] {
  if (value === undefined) return [];
  return arr(value, where, allowed.length).map((r, i) => {
    const o = obj(r, `${where}[${i}]`);
    const w = `${where}[${i}]`;
    const keys = [
      "accounts", "last30d", "settled", "team", "scheduled", "wentLive", "finished", "finished2",
      "backAfterWeek1", "matchHabit", "appHabit", "paid", "trial", "lapsed",
    ] as const;
    const row = { label: oneOf(o.label, allowed, `${w}.label`) } as QualityRow;
    for (const k of keys) row[k] = n(o[k], `${w}.${k}`);
    return row;
  });
}

/** The payload rebuilt from known keys, or throws BadInsights. */
export function parseInsights(body: unknown): CoachAppInsights {
  const b = obj(body, "body");
  const takenAtMs = typeof b.takenAt === "string" ? Date.parse(b.takenAt) : NaN;
  if (!Number.isFinite(takenAtMs)) throw new BadInsights("takenAt: not a time");

  const rolling = obj(b.rolling, "rolling");
  const habit = obj(b.habit, "habit");
  const recency = obj(b.recency, "recency");
  const paying = obj(b.paying, "paying");
  const spread = (v: unknown, where: string) => {
    const list = arr(v, where, 5).map((x, i) => n(x, `${where}[${i}]`));
    if (list.length !== 5) throw new BadInsights(`${where}: expected 5`);
    return list;
  };

  return {
    takenAt: new Date(takenAtMs).toISOString(),
    today: day(b.today, "today"),
    openedTrackedFrom: day(b.openedTrackedFrom, "openedTrackedFrom"),
    weeks: arr(b.weeks, "weeks", 26).map((w, i) => ({
      weekStart: day(obj(w, `weeks[${i}]`).weekStart, `weeks[${i}].weekStart`),
      ...activity(w, `weeks[${i}]`),
    })),
    rolling: { last7: activity(rolling.last7, "rolling.last7"), prev7: activity(rolling.prev7, "rolling.prev7") },
    habit: {
      windowStart: day(habit.windowStart, "habit.windowStart"),
      windowEnd: day(habit.windowEnd, "habit.windowEnd"),
      appHabit: n(habit.appHabit, "habit.appHabit"),
      matchHabit: n(habit.matchHabit, "habit.matchHabit"),
      eligible: n(habit.eligible, "habit.eligible"),
      openedWeeks: spread(habit.openedWeeks, "habit.openedWeeks"),
      matchWeeks: spread(habit.matchWeeks, "habit.matchWeeks"),
    },
    recency: {
      today: n(recency.today, "recency.today"),
      d1to7: n(recency.d1to7, "recency.d1to7"),
      d8to14: n(recency.d8to14, "recency.d8to14"),
      d15to30: n(recency.d15to30, "recency.d15to30"),
      over30: n(recency.over30, "recency.over30"),
      never: n(recency.never, "recency.never"),
      onlyFirstDay: n(recency.onlyFirstDay, "recency.onlyFirstDay"),
      atRisk: n(recency.atRisk, "recency.atRisk"),
      matchNext7d: n(recency.matchNext7d, "recency.matchNext7d"),
      matchNext7dNeverLive: n(recency.matchNext7dNeverLive, "recency.matchNext7dNeverLive"),
    },
    cohorts: arr(b.cohorts, "cohorts", 26).map((c, i) => {
      const o = obj(c, `cohorts[${i}]`);
      const w = `cohorts[${i}]`;
      return {
        weekStart: day(o.weekStart, `${w}.weekStart`),
        signedUp: n(o.signedUp, `${w}.signedUp`),
        team: n(o.team, `${w}.team`),
        players: n(o.players, `${w}.players`),
        scheduled: n(o.scheduled, `${w}.scheduled`),
        wentLive: n(o.wentLive, `${w}.wentLive`),
        finished: n(o.finished, `${w}.finished`),
        finished2: n(o.finished2, `${w}.finished2`),
        backAfterWeek1: n(o.backAfterWeek1, `${w}.backAfterWeek1`),
        paid: n(o.paid, `${w}.paid`),
      };
    }),
    bySource: qualityRows(b.bySource, SOURCE_LABELS, "bySource"),
    byForm: qualityRows(b.byForm, FORM_LABELS, "byForm"),
    paying: {
      paid: n(paying.paid, "paying.paid"),
      trial: n(paying.trial, "paying.trial"),
      lapsed: n(paying.lapsed, "paying.lapsed"),
      trialsEndingNext7d: n(paying.trialsEndingNext7d, "paying.trialsEndingNext7d"),
      trialsEndedLast7d: n(paying.trialsEndedLast7d, "paying.trialsEndedLast7d"),
      byStage: arr(paying.byStage, "paying.byStage", STAGES.length).map((s, i) => {
        const o = obj(s, `paying.byStage[${i}]`);
        const w = `paying.byStage[${i}]`;
        return {
          stage: oneOf(o.stage, STAGES, `${w}.stage`),
          ...planSplit(o, w),
          trialEndingNext7d: n(o.trialEndingNext7d, `${w}.trialEndingNext7d`),
        };
      }),
      byHabit: arr(paying.byHabit, "paying.byHabit", HABIT_SEGMENTS.length).map((s, i) => {
        const o = obj(s, `paying.byHabit[${i}]`);
        const w = `paying.byHabit[${i}]`;
        return { segment: oneOf(o.segment, HABIT_SEGMENTS, `${w}.segment`), ...planSplit(o, w) };
      }),
    },
  };
}

export function isBadInsights(err: unknown): err is Error {
  return err instanceof BadInsights;
}

export async function logCoachAppInsights(insights: CoachAppInsights): Promise<void> {
  const { error } = await adminClient()
    .from("coach_app_insights")
    .insert({ taken_at: insights.takenAt, payload: insights });
  if (error) throw new Error("Failed to insert coach_app_insights row: " + error.message);
}

/** The latest insights, or null before the first arrives. Re-parsed on read,
 * so a row stored by an older shape reads as an error rather than breaking
 * the tab. */
export async function getLatestCoachAppInsights(): Promise<CoachAppInsights | null> {
  const { data, error } = await adminClient()
    .from("coach_app_insights")
    .select("payload")
    .order("taken_at", { ascending: false })
    .limit(1);
  if (error) throw new Error("Failed to read coach_app_insights: " + error.message);
  const row = data?.[0] as { payload: unknown } | undefined;
  return row ? parseInsights(row.payload) : null;
}

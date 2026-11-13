import { NextResponse } from "next/server";
import { CUSTOMISABLE, logCalculatorPlan, PERIOD_TYPES, type PlanPeriodType } from "@/lib/supabase/calculator-plans";
import { isKnownBot } from "@/lib/user-agent-bots";
import { isOwnerRequest } from "@/lib/owner-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UA_LENGTH = 500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// The calculator's own formats (coach-app src/domain/lineup/formations.ts).
const FORMAT = /^(3|4|5|6|7|8|9|11)v\1$/;
// Formation keys are short labels like "2-3-1" or "1-2-1"; anything else is
// dropped rather than stored, so no free text can ride along.
const FORMATION = /^[0-9](-[0-9]){0,4}$/;
const MIN_TIME = /^[a-z0-9_-]{1,24}$/i;
const HOST = /^[a-z0-9.-]{1,253}$/i;

function int(value: unknown, min: number, max: number): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : null;
}

function bool(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function match(value: unknown, pattern: RegExp): string | null {
  return typeof value === "string" && pattern.test(value) ? value : null;
}

// Public endpoint, called by the Coach App's game time calculator
// (src/data/calculatorTracking.ts, reportCalculatorPlan in the coach-app
// repo), served from this same origin through the vercel.json rewrite. It
// carries the plan's settings and counts only: every field is validated to a
// number, a boolean or a fixed pattern, so a player's name can't be stored
// here even if one were sent. See the calculator_plans migration.
//
// Same exclusions as the other public tracking endpoints: Graham's own
// devices and networks, previews, and self-declared bots.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userAgent = typeof req.headers.get("user-agent") === "string" ? req.headers.get("user-agent")!.slice(0, MAX_UA_LENGTH) : null;

    if ((await isOwnerRequest(req)) || isKnownBot(userAgent)) {
      return NextResponse.json({ ok: true });
    }

    const loadId = match(body.loadId, UUID);
    const format = match(body.format, FORMAT);
    const squadSize = int(body.squadSize, 1, 40);
    if (!loadId || !format || squadSize === null) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const periodType = PERIOD_TYPES.includes(body.periodType) ? (body.periodType as PlanPeriodType) : null;
    const customised = Array.isArray(body.customised)
      ? [...new Set(body.customised.filter((c: unknown): c is string => typeof c === "string" && (CUSTOMISABLE as readonly string[]).includes(c)))]
      : [];
    const spread = typeof body.minutesSpread === "number" && Number.isFinite(body.minutesSpread) && body.minutesSpread >= 0 && body.minutesSpread <= 200
      ? Math.round(body.minutesSpread * 10) / 10
      : null;

    await logCalculatorPlan(
      {
        loadId,
        embedded: body.embedded === true,
        format,
        formation: match(body.formation, FORMATION),
        periodType,
        periodMinutes: int(body.periodMinutes, 1, 120),
        squadSize,
        onPitch: int(body.onPitch, 1, 11),
        stintsPerPeriod: int(body.stintsPerPeriod, 1, 20),
        rotatePositions: bool(body.rotatePositions),
        gkRotates: bool(body.gkRotates),
        maxSubstitutions: int(body.maxSubstitutions, 0, 50),
        minTimePerPlayer: match(body.minTimePerPlayer, MIN_TIME),
        fixedKeeper: body.fixedKeeper === true,
        subs: int(body.subs, 0, 500),
        minutesSpread: spread,
        customised: customised as string[],
        returningVisit: body.returningVisit === true,
        referrerHost: match(body.referrerHost, HOST),
        hadGclid: body.hadGclid === true,
      },
      userAgent
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

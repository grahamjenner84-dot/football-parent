import { NextResponse } from "next/server";
import { logCoachAppActiveDay, londonDay } from "@/lib/supabase/coach-app-funnel";
import { isKnownBot } from "@/lib/user-agent-bots";
import { ADMIN_SESSION_COOKIE, NO_TRACK_COOKIE, hasAdminSession } from "@/lib/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UA_LENGTH = 500;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TOKEN_PATTERN = /^[A-Za-z0-9-]{16,64}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

// CORS for the Android app: its WebView runs on its own origin
// (https://localhost), so it posts here by absolute URL. The app sends the
// body as text/plain so the request is a "simple" one with no preflight;
// these headers just let it read the response, which it ignores anyway.
const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };

// Public endpoint, called by the Coach App (src/data/activeDayPing.ts in the
// coach-app repo) the first time a signed-in coach opens the app each UK day,
// on each device. Anonymous by construction: the body is the day, a random
// token that only lives for that day, and the platform. See the
// coach_app_active_days migration for why this exists.
//
// Same exclusions as the other public tracking endpoints: Graham's own
// devices (admin session or no-track cookie) and self-declared bots. The app
// also skips the accounts in VITE_UNTRACKED_USER_IDS before sending.
export async function POST(req: Request) {
  try {
    // Parsed from text rather than req.json(), because the Android app sends
    // text/plain (see CORS_HEADERS above).
    const raw = await req.text();
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(raw);
    } catch {
      body = {};
    }

    const day = typeof body.day === "string" ? body.day : "";
    const dayToken = typeof body.dayToken === "string" ? body.dayToken : "";
    // The app's clock decides the day, but only within a day either side of
    // ours (time zones, a device clock a little out): anything else is junk.
    const now = Date.now();
    const plausibleDays = new Set([londonDay(new Date(now - DAY_MS)), londonDay(new Date(now)), londonDay(new Date(now + DAY_MS))]);
    if (!DAY_PATTERN.test(day) || !plausibleDays.has(day) || !TOKEN_PATTERN.test(dayToken)) {
      return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
    }
    const platform = body.platform === "android" ? "android" : "web";

    const userAgent = req.headers.get("user-agent")?.trim().slice(0, MAX_UA_LENGTH) || null;

    const cookieParts = (req.headers.get("cookie") ?? "").split(";").map((part) => part.trim());
    const sessionValue = cookieParts
      .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`))
      ?.slice(ADMIN_SESSION_COOKIE.length + 1);
    const noTrack = cookieParts.some((part) => part === `${NO_TRACK_COOKIE}=1`);

    if (noTrack || hasAdminSession(sessionValue) || isKnownBot(userAgent)) {
      return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
    }

    await logCoachAppActiveDay({ day, dayToken, platform }, userAgent);

    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500, headers: CORS_HEADERS });
  }
}

import crypto from "crypto";
import { NextResponse } from "next/server";
import { logCoachAppUsageSnapshot, type CoachAppUsageCounts } from "@/lib/supabase/coach-app-funnel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called every 10 minutes by the Coach App project's own database
// (send_usage_snapshot in coach-app migration 0039, via pg_cron + pg_net),
// never by a browser. Carries whole-app counts only; see the
// coach_app_usage_snapshots migration for why this exists.
//
// Accepted only with the shared secret (COACH_APP_SNAPSHOT_SECRET here,
// site_snapshot_secret in the Coach App project's Vault). Without the env var
// set, every post is refused.

function secretMatches(header: string | null): boolean {
  const secret = process.env.COACH_APP_SNAPSHOT_SECRET;
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice("Bearer ".length));
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// A count is a whole number from 0 up to something no real app gets near.
function count(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < 10_000_000 ? value : null;
}

export async function POST(req: Request) {
  if (!secretMatches(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    const takenAt = typeof body?.takenAt === "string" ? Date.parse(body.takenAt) : NaN;
    const counts: Record<Exclude<keyof CoachAppUsageCounts, "signupsTodayWithTeam" | "emailsToday">, number | null> = {
      totalAccounts: count(body?.totalAccounts),
      signupsToday: count(body?.signupsToday),
      activeToday: count(body?.activeToday),
      active7d: count(body?.active7d),
      accountsWithTeam: count(body?.accountsWithTeam),
      finishedMatches: count(body?.finishedMatches),
      accountsWithFinishedMatch: count(body?.accountsWithFinishedMatch),
      planPaid: count(body?.planPaid),
      planTrial: count(body?.planTrial),
      planLapsed: count(body?.planLapsed),
    };
    if (!Number.isFinite(takenAt) || Object.values(counts).some((v) => v === null)) {
      return NextResponse.json({ error: "Bad snapshot" }, { status: 400 });
    }

    // Optional: added after the first version of the Coach App function, so
    // an older sender that doesn't include them still gets its row stored.
    const signupsTodayWithTeam = count(body?.signupsTodayWithTeam);
    const emailsToday = count(body?.emailsToday);

    await logCoachAppUsageSnapshot(new Date(takenAt).toISOString(), {
      ...(counts as Omit<CoachAppUsageCounts, "signupsTodayWithTeam" | "emailsToday">),
      signupsTodayWithTeam,
      emailsToday,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

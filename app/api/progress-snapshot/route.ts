import crypto from "crypto";
import { NextResponse } from "next/server";
import {
  ACTIVATION_FIELDS,
  USAGE_FIELDS,
  logProgressUsageSnapshot,
  type ProgressActivationCounts,
  type ProgressSnapshotCounts,
  type ProgressUsageCounts,
} from "@/lib/supabase/progress-funnel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called every 10 minutes by the Progress project's own database
// (send_usage_snapshot in progress migration 0021, via pg_cron + pg_net),
// never by a browser. Carries whole-app counts only; see the
// progress_pipeline migration for why this exists and what Graham approved.
//
// Accepted only with the shared secret (PROGRESS_SNAPSHOT_SECRET here,
// site_snapshot_secret in the Progress project's Vault). Without the env var
// set, every post is refused.

function secretMatches(header: string | null): boolean {
  const secret = process.env.PROGRESS_SNAPSHOT_SECRET;
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
    const counts = {} as Record<keyof ProgressUsageCounts, number | null>;
    for (const f of USAGE_FIELDS) counts[f] = count(body?.[f]);
    // The activation counts are optional (a Progress database that doesn't
    // send them yet, or an older one): missing means null. Sent but not a
    // count is as bad as a bad required field.
    const activation = {} as ProgressActivationCounts;
    let badActivation = false;
    for (const f of ACTIVATION_FIELDS) {
      const raw = body?.[f];
      if (raw === undefined || raw === null) {
        activation[f] = null;
        continue;
      }
      activation[f] = count(raw);
      if (activation[f] === null) badActivation = true;
    }
    if (!Number.isFinite(takenAt) || Object.values(counts).some((v) => v === null) || badActivation) {
      return NextResponse.json({ error: "Bad snapshot" }, { status: 400 });
    }
    const snapshot: ProgressSnapshotCounts = { ...(counts as ProgressUsageCounts), ...activation };
    await logProgressUsageSnapshot(new Date(takenAt).toISOString(), snapshot);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

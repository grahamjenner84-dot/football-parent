import { NextResponse } from "next/server";
import { getSeoReport } from "@/lib/gsc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_DAYS = new Set([7, 28, 90]);

function parseDays(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return ALLOWED_DAYS.has(n) ? n : undefined;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const report = await getSeoReport({
      strikingDays: parseDays(searchParams.get("strikingDays")),
      ctrDays: parseDays(searchParams.get("ctrDays")),
      noImpressionsDays: parseDays(searchParams.get("noImpressionsDays")),
    });
    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

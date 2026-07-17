import { NextResponse } from "next/server";
import { getSeoReport } from "@/lib/gsc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const report = await getSeoReport();
    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getEpnReport } from "@/lib/epn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only (proxy.ts matcher): eBay Partner Network earnings plus our own
// eBay click-outs, for the "eBay earnings" tab on /admin/seo.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const daysParam = Number(searchParams.get("days"));
    const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 30;
    return NextResponse.json(await getEpnReport(days));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

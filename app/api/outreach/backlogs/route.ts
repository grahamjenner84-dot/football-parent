import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { addProspects, listProspects, type AddResult, type NewProspect } from "@/lib/supabase/outreach";

// Admin-only (guarded in proxy.ts). Loads the reviewed backlog files that the
// football-parent-link-building skill commits to seo-data/exports into the
// outreach queue, so that step happens from /admin/outreach rather than a
// terminal. Files are bundled with this route via outputFileTracingIncludes
// in next.config.ts. Every row still goes through addProspects, so the
// quality gate and the site-wide duplicate check apply.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIR = path.join(process.cwd(), "seo-data", "exports");
const FILE = /^outreach-backlog-\d{4}-\d{2}-\d{2}\.json$/;

function readBacklog(name: string): NewProspect[] {
  if (!FILE.test(name)) throw new Error("not a backlog file");
  const rows = JSON.parse(fs.readFileSync(path.join(DIR, name), "utf8")) as NewProspect[];
  if (!Array.isArray(rows)) throw new Error(`${name} is not a list`);
  return rows.filter((r) => r && typeof r.url === "string").map((r) => ({ ...r, source: r.source || `backlog:${name}` }));
}

export async function GET() {
  try {
    const names = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => FILE.test(f)).sort().reverse() : [];
    const known = new Set((await listProspects(undefined, 10000)).map((p) => p.url));
    const files = names.map((name) => {
      const rows = readBacklog(name);
      return { name, rows: rows.length, loaded: rows.filter((r) => known.has(r.url)).length };
    });
    return NextResponse.json({ files });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { file } = (await req.json()) as { file?: string };
    if (!file || !FILE.test(file)) return NextResponse.json({ error: "unknown backlog file" }, { status: 400 });
    const results: AddResult[] = await addProspects(readBacklog(file));
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

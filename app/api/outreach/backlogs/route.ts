import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { addProspects, listProspects, recordRuledOut, type AddResult, type NewProspect, type RuledOutItem } from "@/lib/supabase/outreach";

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

// The research run's removals (<file>-removed.json), each with the reason
// vetting or the audit gave. Loaded as Ruled out so they're never re-found.
function readRemoved(name: string): RuledOutItem[] {
  const file = path.join(DIR, name.replace(/\.json$/, "-removed.json"));
  if (!fs.existsSync(file)) return [];
  const rows = JSON.parse(fs.readFileSync(file, "utf8")) as (NewProspect & { removed_reason?: string; reason?: string })[];
  return (Array.isArray(rows) ? rows : [])
    .filter((r) => r && typeof r.url === "string")
    .map((r) => ({ ...r, source: r.source || `backlog:${name}`, reason: r.removed_reason || r.reason || "removed during research" }));
}

export async function GET() {
  try {
    const names = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => FILE.test(f)).sort().reverse() : [];
    const known = new Set((await listProspects(undefined, 10000)).map((p) => p.url));
    const files = names.map((name) => {
      const rows = readBacklog(name);
      const removed = readRemoved(name);
      return {
        name,
        rows: rows.length,
        loaded: rows.filter((r) => known.has(r.url)).length,
        removed: removed.length,
        removedLoaded: removed.filter((r) => known.has(r.url)).length,
      };
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
    // Kept prospects into the queue, and the research's removals into Ruled
    // out, in one go.
    const results: AddResult[] = await addProspects(readBacklog(file));
    const ruledOut = await recordRuledOut(readRemoved(file));
    return NextResponse.json({ results, ruledOut });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

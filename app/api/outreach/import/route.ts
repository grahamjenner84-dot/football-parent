import { NextRequest, NextResponse } from "next/server";
import { parseHistory, resolveImportedStatus } from "@/lib/outreach/import";
import { findKnownDomain, importHistory, isFromHistoryImport } from "@/lib/supabase/outreach";

// Admin-only (guarded in proxy.ts). Bulk import of past outreach from
// Graham's own sheet. `preview: true` parses and checks each site against
// the list without writing anything, so he sees exactly what will happen.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ROWS = 2000;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { text?: string; preview?: boolean };
    if (!body.text?.trim()) return NextResponse.json({ error: "Paste your sheet or choose a CSV file first." }, { status: 400 });

    const parsed = parseHistory(body.text);
    if (parsed.rows.length > MAX_ROWS) {
      return NextResponse.json({ error: `That's ${parsed.rows.length} rows; import at most ${MAX_ROWS} at a time.` }, { status: 400 });
    }

    if (body.preview) {
      const now = new Date();
      const rows = [];
      for (const row of parsed.rows) {
        const existing = await findKnownDomain(row.domain);
        const fromEarlierImport = existing ? await isFromHistoryImport(row.domain) : false;
        rows.push({ ...row, resolved: resolveImportedStatus(row, now), existing, fromEarlierImport });
      }
      return NextResponse.json({ columns: parsed.columns, errors: parsed.errors, rows });
    }

    const results = await importHistory(parsed.rows);
    return NextResponse.json({ errors: parsed.errors, results });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

#!/usr/bin/env tsx
/**
 * Outreach pipeline CLI. Used by the weekly outreach run
 * (.claude/skills/football-parent-link-building/SKILL.md) and by hand.
 *
 *   npx tsx scripts/outreach/cli.ts <command> [args]
 *
 * Commands:
 *   import-existing [--dry-run]   Pull the old prospect CSVs in seo-data/exports
 *                                 through the quality gate. --dry-run needs no
 *                                 Supabase and writes a review report instead.
 *   check <url> [title]           Run the quality gate on one URL (no writes).
 *   review <file.json>            Re-run the gate over a backlog file in the
 *                                 `add` format and write <file>.md beside it
 *                                 for Graham to review (no Supabase).
 *   add <file.json>               Add prospects: [{url, source, title?, context?,
 *                                 country?, authority?, fit?, fit_note?, fp_page?,
 *                                 angle?, contact_*?}]. Rejected ones are stored
 *                                 as rejected so they are never re-proposed.
 *   queue                         JSON: drafted count, top backlog to draft,
 *                                 chase-ups due, link checks due.
 *   save-drafts <file.json>       [{id, subject, body, chase_line?, contact_*?,
 *                                 fp_page?, angle?, fit?, fit_note?}]
 *   link-result <id> [url]        Record a link check: url = link found (won),
 *                                 omitted = checked, nothing yet.
 *   close-expired                 Mark prospects past their last chase as no_reply.
 *   rescore                       Recompute backlog/drafted scores.
 *   set-status <id> <status> [reason]
 *                                 Move a prospect to any status (e.g. skipped
 *                                 when a backlog row fails the page-content
 *                                 check); the reason is saved as its
 *                                 status_reason.
 *   known-domains                 JSON: every site already on the list (any
 *                                 status but rejected), with status and date
 *                                 emailed. Load this before discovery and skip
 *                                 those domains.
 *   import-history <file>         Past outreach from Graham's sheet (CSV/TSV
 *                                 with a header row), same as the admin page
 *                                 import. --preview parses without writing.
 *   stats                         Scoreboard JSON.
 *
 * Writes go to the football-parent-social Supabase project (SUPABASE_URL /
 * SUPABASE_SERVICE_ROLE_KEY), never the Coach App project.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "../lib/load-env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
loadEnvLocal(REPO_ROOT);

import { parseCsv } from "../seo/shared/csv";
import { assessProspect, type QualityResult } from "../../lib/outreach/quality";
import { AWAITING, dueAction, WEEKLY_NEW_DRAFTS } from "../../lib/outreach/lifecycle";
import type { NewProspect } from "../../lib/supabase/outreach";

const EXPORTS = path.join(REPO_ROOT, "seo-data", "exports");

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(file), "utf8")) as T;
}

function rowsAsObjects(file: string): Record<string, string>[] {
  const [header, ...rows] = parseCsv(fs.readFileSync(file, "utf8"));
  return rows.filter((r) => r.some((c) => c.trim())).map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

const GRADE_FIT: Record<string, number> = { A: 8, B: 6, C: 4 };

// The two research exports that exist today. Each maps its own columns onto
// NewProspect; a future export only needs another entry here.
function existingProspects(): NewProspect[] {
  const out: NewProspect[] = [];

  const competitorFile = path.join(EXPORTS, "backlink-prospects-2026-09-17.csv");
  if (fs.existsSync(competitorFile)) {
    for (const r of rowsAsObjects(competitorFile)) {
      out.push({
        url: r["Referring Article / Page"],
        source: "import:backlink-prospects-2026-09-17",
        authority: Number(r["DataForSEO Rank"]) || null,
        context: `links to competitor ${r["Links To (Competitor)"]}`,
      });
    }
  }

  const playingTimeFile = path.join(EXPORTS, "playing-time-app-backlink-prospects-2026-09-19.csv");
  if (fs.existsSync(playingTimeFile)) {
    for (const r of rowsAsObjects(playingTimeFile)) {
      out.push({
        url: r["URL"],
        title: r["Article title"],
        country: r["Country"],
        source: "import:playing-time-app-backlink-prospects-2026-09-19",
        authority: Number(r["Domain authority/rank metric (DataForSEO bulk_ranks, screening signal only)"]) || null,
        fit: GRADE_FIT[r["Fit Grade"]] ?? null,
        fit_note: r["Why the app fits this specific article"] || null,
        context: `${r["Primary topic"]} ${r["Why the app fits this specific article"]} ${r["Notes"]}`,
        fp_page: "/coaching/equal-playing-time-in-grassroots-football",
      });
    }
  }
  return out.filter((p) => p.url);
}

function dryRunReport(items: NewProspect[], label = "The old prospect lists"): string {
  const assessed: { p: NewProspect; q: QualityResult }[] = items.map((p) => ({ p, q: assessProspect(p) }));
  const by = (v: string) => assessed.filter((a) => a.q.verdict === v);
  const ok = by("ok");
  const parked = by("parked");
  const rejected = by("rejected");

  const reasonCounts = new Map<string, number>();
  for (const a of rejected) {
    const key = a.q.reasons[a.q.reasons.length - 1].replace(/\s*\([^)]*\)$/, "").trim();
    reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1);
  }

  const cell = (v: unknown) => String(v ?? "").replace(/\|/g, "/").replace(/\s+/g, " ").trim() || "-";
  const short = (u: string) => (u.length > 90 ? u.slice(0, 87) + "..." : u);
  const line = (a: { p: NewProspect; q: QualityResult }) =>
    `| ${cell(a.q.domain)} | ${cell(a.q.type)} | ${cell(short(a.p.url))} | ${cell(a.p.fit)} | ${cell(a.p.fp_page)} | ${cell(a.p.contact_email ?? a.p.contact_url)} | ${cell([a.p.fit_note, ...a.q.reasons].filter(Boolean).join("; "))} |`;
  const table = (rows: typeof assessed) =>
    ["| Domain | Type | Page | Fit | Pitch | Contact | Notes |", "| --- | --- | --- | --- | --- | --- | --- |", ...rows.map(line)].join("\n");

  return [
    `# Outreach prospect review (${new Date().toISOString().slice(0, 10)})`,
    "",
    `${label} (${items.length} rows) through the quality gate in \`lib/outreach/quality.ts\`.`,
    "",
    `- **Kept for outreach:** ${ok.length}`,
    `- **Parked** (real relationship, needs a partnership conversation rather than a cold pitch): ${parked.length}`,
    `- **Rejected:** ${rejected.length}`,
    "",
    "## Why rows were rejected",
    "",
    ...[...reasonCounts.entries()].sort((a, b) => b[1] - a[1]).map(([r, n]) => `- ${n} x ${r}`),
    "",
    "## Kept",
    "",
    table(ok),
    "",
    "## Parked",
    "",
    table(parked),
    "",
    "## Rejected",
    "",
    table(rejected),
    "",
  ].join("\n");
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  if (cmd === "check") {
    console.log(JSON.stringify(assessProspect({ url: args[0], title: args[1] ?? null }), null, 2));
    return;
  }

  if (cmd === "review") {
    const file = path.resolve(args[0]);
    const report = dryRunReport(readJson<NewProspect[]>(file), path.basename(file));
    const out = file.replace(/\.json$/, "") + ".md";
    fs.writeFileSync(out, report);
    console.log(report.split("\n").slice(0, 16).join("\n"));
    console.log(`\nFull report: ${path.relative(REPO_ROOT, out)}`);
    return;
  }

  if (cmd === "import-existing" && args.includes("--dry-run")) {
    const report = dryRunReport(existingProspects());
    const out = path.join(EXPORTS, `outreach-import-review-${new Date().toISOString().slice(0, 10)}.md`);
    fs.writeFileSync(out, report);
    console.log(report.split("\n").slice(0, 16).join("\n"));
    console.log(`\nFull report: ${path.relative(REPO_ROOT, out)}`);
    return;
  }

  // Everything below touches Supabase.
  const db = await import("../../lib/supabase/outreach");

  switch (cmd) {
    case "import-existing": {
      const res = await db.addProspects(existingProspects());
      const tally = res.reduce<Record<string, number>>((acc, r) => {
        const k = r.outcome === "added" ? `added:${r.status}` : r.outcome;
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {});
      console.log(JSON.stringify(tally, null, 2));
      return;
    }
    case "add": {
      console.log(JSON.stringify(await db.addProspects(readJson<NewProspect[]>(args[0])), null, 2));
      return;
    }
    case "queue": {
      await db.rescoreAll();
      const open = await db.listProspects(["backlog", "drafted", ...AWAITING]);
      const drafted = open.filter((p) => p.status === "drafted");
      const now = new Date();
      const awaiting = open.filter((p) => AWAITING.includes(p.status));
      const threeDaysAgo = now.getTime() - 3 * 86_400_000;
      // One prospect per domain in the draft list, and never a domain we're
      // already mid-conversation with.
      const busyDomains = new Set([...drafted, ...awaiting].map((p) => p.domain));
      const toDraft = [];
      for (const p of open.filter((p) => p.status === "backlog")) {
        if (toDraft.length >= Math.max(0, WEEKLY_NEW_DRAFTS - drafted.length)) break;
        if (busyDomains.has(p.domain)) continue;
        busyDomains.add(p.domain);
        toDraft.push(p);
      }
      console.log(
        JSON.stringify(
          {
            alreadyDrafted: drafted.length,
            draftTarget: WEEKLY_NEW_DRAFTS,
            toDraft: toDraft.map((p) => ({ id: p.id, url: p.url, title: p.title, type: p.prospect_type, fp_page: p.fp_page, angle: p.angle, fit_note: p.fit_note, contact_email: p.contact_email, contact_url: p.contact_url, score: p.score })),
            chaseDue: awaiting
              .filter((p) => dueAction(p, now) === "chase")
              .map((p) => ({ id: p.id, url: p.url, contact_name: p.contact_name, chase_count: p.chase_count, chase_line: p.chase_line })),
            linkChecks: awaiting
              .filter((p) => !p.link_checked_at || new Date(p.link_checked_at).getTime() < threeDaysAgo)
              .map((p) => ({ id: p.id, url: p.url })),
          },
          null,
          2
        )
      );
      return;
    }
    case "save-drafts": {
      const drafts = readJson<import("../../lib/supabase/outreach").DraftInput[]>(args[0]);
      for (const d of drafts) await db.saveDraft(d);
      console.log(`saved ${drafts.length} draft(s)`);
      return;
    }
    case "link-result": {
      await db.recordLinkCheck(Number(args[0]), args[1] ?? null);
      console.log("ok");
      return;
    }
    case "close-expired": {
      const awaiting = await db.listProspects(AWAITING);
      let n = 0;
      for (const p of awaiting) {
        if (dueAction(p) === "close") {
          await db.applyProspectAction(p.id, { action: "no_reply" });
          n++;
        }
      }
      console.log(`closed ${n} as no_reply`);
      return;
    }
    case "known-domains": {
      console.log(JSON.stringify(await db.listKnownDomains(), null, 2));
      return;
    }
    case "import-history": {
      const { parseHistory } = await import("../../lib/outreach/import");
      const parsed = parseHistory(fs.readFileSync(path.resolve(args[0]), "utf8"));
      if (args.includes("--preview")) {
        console.log(JSON.stringify(parsed, null, 2));
        return;
      }
      const res = await db.importHistory(parsed.rows);
      console.log(JSON.stringify({ errors: parsed.errors, results: res }, null, 2));
      return;
    }
    case "set-status": {
      const [idRaw, status, ...why] = args;
      const id = Number(idRaw);
      if (!id || !status) throw new Error("usage: set-status <id> <status> [reason]");
      await db.applyProspectAction(id, { action: "set_status", status: status as import("../../lib/outreach/lifecycle").OutreachStatus });
      if (why.length) await db.updateProspectFields(id, { status_reason: why.join(" ") });
      console.log(`prospect ${id} -> ${status}`);
      return;
    }
    case "rescore": {
      console.log(`rescored ${await db.rescoreAll()}`);
      return;
    }
    case "stats": {
      console.log(JSON.stringify(await db.getStats(), null, 2));
      return;
    }
    default:
      console.error("Unknown command. See the header of scripts/outreach/cli.ts.");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

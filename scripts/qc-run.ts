#!/usr/bin/env tsx
/**
 * Phase D: QC layer for drafted social copy. Runs Tier 1 (deterministic),
 * Tier 2 (Claude judgment), and Tier 3 (fit + safety) checks against
 * content_queue items with status='draft', and reports pass/fail per item,
 * tier by tier.
 *
 *   npm run qc                   # dry run - report only, no DB writes
 *   npm run qc -- --apply        # also write status + source_ref.qc back
 *   npm run qc -- --source=gsc   # filter by content_queue.source (default: gsc)
 *
 * Not scheduled - manual command only until the output has been reviewed
 * against real content (see Phase D task notes).
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "./lib/load-env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
loadEnvLocal(REPO_ROOT);

import { createClient } from "@supabase/supabase-js";
import { getDraftItems, runQcOnItem, writeQcResult, QcItemResult } from "../lib/instagram/qc-flow";

function argValue(flag: string): string | undefined {
  const prefix = `--${flag}=`;
  return process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);
}
function hasFlag(flag: string): boolean {
  return process.argv.includes(`--${flag}`);
}

function requireEnv(name: string): void {
  if (!process.env[name]) {
    console.error(`Missing ${name} - check .env.local`);
    process.exitCode = 1;
    throw new Error(`Missing ${name}`);
  }
}

function printItemReport(result: QcItemResult): void {
  console.log(`\n${"=".repeat(72)}`);
  console.log(`Item ${result.id} (${result.contentType}, source=${result.source})`);
  console.log(`Hook: ${result.parsed.hook}`);
  result.parsed.points.forEach((p, i) => console.log(`  Point ${i + 1}: ${p}`));

  console.log(`\nTier 1 (deterministic): ${result.tier1.passed ? "PASS" : "FAIL"}`);
  if (result.tier1.findings.length === 0) console.log("  (no issues)");
  for (const f of result.tier1.findings) {
    console.log(`  ${f.hardFail ? "[HARD FAIL]" : "[soft]"} ${f.rule}: ${f.detail}`);
  }

  console.log(`\nTier 2 (AI judgment):`);
  console.log(`  hook: ${result.tier2.hookClassification} - ${result.tier2.hookClassificationReason}`);
  console.log(`  promises_success: ${result.tier2.promisesSuccess} - ${result.tier2.promisesSuccessDetail}`);
  console.log(`  absolutes_found: ${result.tier2.absolutesFound.length ? result.tier2.absolutesFound.join("; ") : "(none)"}`);
  console.log(
    `  claim_grounding_issues: ${
      result.tier2.claimGroundingIssues.length
        ? result.tier2.claimGroundingIssues.map((c) => `"${c.claim}" (${c.confirmedProblem ? "problem" : "note only"}) - ${c.issue}`).join("; ")
        : "(none)"
    }`
  );
  console.log(`  misleading_framing: ${result.tier2.misleadingFraming} - ${result.tier2.misleadingFramingDetail}`);
  console.log(`  source article resolved: ${result.article ? result.article.frontmatter.title : "(none - claim grounding checked on plausibility only)"}`);

  console.log(`\nTier 3 (fit + safety):`);
  console.log(`  identifies_real_child: ${result.tier2.identifiesRealChild} - ${result.tier2.identifiesRealChildDetail}`);
  for (const f of result.tier3Fit) {
    const flag = f.overflow ? "[HARD FAIL]" : f.tooLong ? "[soft]" : "[ok]";
    console.log(`  ${flag} ${f.label}: ${f.lines} line(s) (hard max ${f.hardMaxLines}, recommended max ${f.recommendedMaxLines})`);
  }

  console.log(`\nHook strength: ${result.tier2.hookStrength}`);
  console.log(`  ${result.tier2.hookImprovementSuggestion}`);

  console.log(`\nAPI cost this item: $${result.apiCostUsd.toFixed(4)} (${result.tier2.usage.inputTokens} in / ${result.tier2.usage.outputTokens} out)`);
  console.log(`\n>>> OVERALL: ${result.passed ? "PASS" : "FAIL"}${result.passed ? "" : ` (${result.hardFails.length} hard fail(s))`}`);
  if (!result.passed) {
    for (const hf of result.hardFails) console.log(`    - ${hf}`);
  }
  if (result.softFlags.length > 0) {
    console.log(`  Soft flags:`);
    for (const sf of result.softFlags) console.log(`    - ${sf}`);
  }
}

async function main() {
  for (const name of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY"]) {
    requireEnv(name);
  }

  const apply = hasFlag("apply");
  const source = argValue("source") ?? "gsc";

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  console.log(`Fetching content_queue items: status=draft, source=${source}...`);
  const rows = await getDraftItems(supabase, { source });
  if (rows.length === 0) {
    console.log("Nothing to QC.");
    return;
  }
  console.log(`Found ${rows.length} item(s). ${apply ? "Applying results to the DB." : "Dry run - no DB writes (pass --apply to write)."}\n`);

  let passed = 0;
  let failed = 0;
  let totalCost = 0;

  for (const row of rows) {
    const result = await runQcOnItem(row);
    printItemReport(result);
    totalCost += result.apiCostUsd;
    if (result.passed) passed++;
    else failed++;
    if (apply) await writeQcResult(supabase, row, result);
  }

  console.log(`\n${"=".repeat(72)}`);
  console.log(`Done. ${passed} passed, ${failed} failed, ${rows.length} total.`);
  console.log(`Total Tier 2 API cost: $${totalCost.toFixed(4)} ($${(totalCost / rows.length).toFixed(4)}/item average).`);
  if (!apply) console.log(`Dry run only - re-run with --apply to write status + source_ref.qc back to content_queue.`);
}

main().catch((err) => {
  console.error("qc-run crashed:", err instanceof Error ? err.stack ?? err.message : err);
  process.exitCode = 1;
});

#!/usr/bin/env tsx
/**
 * Phase F: AI copywriting layer. Turns a queued content idea (or an ad hoc
 * theme, for jokes) into finished, render-ready slide copy, runs it through
 * the existing QC layer (Phase D), and reports everything - full copy,
 * QC pass/fail per tier, and API cost.
 *
 *   npm run copy -- --type=joke-carousel --theme="things football parents shout from the sideline"
 *   npm run copy -- --type=joke-single --theme="pre-season nerves"
 *   npm run copy -- --type=education --source=gsc --limit=5
 *   npm run copy -- --type=interview --limit=1
 *
 *   npm run copy -- ... --apply     # also write source_ref.copy back to content_queue (no status change)
 *
 * Dry run by default (no DB writes). Not scheduled - manual command only,
 * same as scripts/qc-run.ts and scripts/ideation-run.ts.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "./lib/load-env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
loadEnvLocal(REPO_ROOT);

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Article } from "../lib/content";
import { resolveArticle } from "../lib/instagram/ideation-flow";
import {
  CopyGenerationResult,
  ContentQueueRow,
  generateJokeSingle,
  generateJokeCarousel,
  generateEducationReel,
  generateInterviewCarousel,
  getQueueItemsForCopy,
  writeCopyResult,
} from "../lib/instagram/copy-flow";
import { runQcOnGeneratedCopy, CopyQcResult } from "../lib/instagram/copy-qc-adapter";
import type { SlideFitResult } from "../lib/instagram/slide-fit";

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

function printSlides(result: CopyGenerationResult): void {
  console.log(`\n--- Generated copy (${result.contentType}/${result.format}, ${result.attempts} attempt(s)) ---`);
  for (const slide of result.slides) {
    console.log(`\n  [${slide.label}]${slide.num ? ` #${slide.num}` : ""}${slide.numberLabel ? ` (${slide.numberLabel})` : ""} kind=${slide.kind}`);
    console.log(`    head: ${slide.head}`);
    if (slide.body) console.log(`    body: ${slide.body}`);
    if (slide.attrib) console.log(`    attrib: ${slide.attrib}`);
  }
  console.log(`\n  [caption] (this is the exact text posts.caption should hold - what G's "Copy caption + hashtags" button copies verbatim)`);
  console.log(
    result.caption
      .split("\n")
      .map((line) => `    ${line}`)
      .join("\n")
  );
}

function printFit(result: CopyGenerationResult): void {
  console.log(`\n  Pre-QC self-check (Phase F, section 6) - real renderer fit (${result.fit[0]?.renderer ?? "n/a"}):`);
  console.log(`    deterministic issues: ${result.deterministicIssues.length ? result.deterministicIssues.join("; ") : "(none)"}`);
  console.log(`    model self-check: ${result.modelSelfCheck.passesAllChecks ? "PASS" : "FAIL"}${result.modelSelfCheck.issues.length ? ` - ${result.modelSelfCheck.issues.join("; ")}` : ""}`);
  for (const f of result.fit) {
    const flag = !f.fits ? "[OVERFLOW]" : f.tight ? "[tight]" : "[ok]";
    console.log(`    ${flag} ${f.label} (${f.slideKind}): ${f.detail}`);
  }
  if (result.needsManualReview) {
    console.log(`  >>> NEEDS MANUAL REVIEW: ${result.manualReviewReason}`);
  }
}

function printQcFooter(qc: CopyQcResult): void {
  console.log(`\n  >>> QC OVERALL: ${qc.passed ? "PASS" : "FAIL"}${qc.passed ? "" : ` (${qc.hardFails.length} hard fail(s))`}`);
  if (!qc.passed) for (const hf of qc.hardFails) console.log(`      - ${hf}`);
  if (qc.softFlags.length) {
    console.log(`    Soft flags:`);
    for (const sf of qc.softFlags) console.log(`      - ${sf}`);
  }
  console.log(`  QC API cost: $${qc.apiCostUsd.toFixed(4)}`);
}

function printQc(qc: CopyQcResult): void {
  console.log(`\n  --- QC (Phase D) ---`);
  console.log(`  Tier 1 (deterministic${qc.kind === "interview" ? ", F's own text only - never the quotes" : ""}): ${qc.tier1.passed ? "PASS" : "FAIL"}`);
  for (const f of qc.tier1.findings) console.log(`    ${f.hardFail ? "[HARD FAIL]" : "[soft]"} ${f.rule}: ${f.detail}`);

  if (qc.kind === "interview") {
    console.log(`  Tier 2 (AI judgment - split by whose words they are):`);
    console.log(`    -- Football Parent's OWN text (hook + context lines) --`);
    console.log(`    hook: ${qc.tier2.hookClassification} - ${qc.tier2.hookClassificationReason}`);
    console.log(`    promises_success: ${qc.tier2.promisesSuccess} - ${qc.tier2.promisesSuccessDetail}`);
    console.log(`    absolutes_found: ${qc.tier2.absolutesFound.length ? qc.tier2.absolutesFound.join("; ") : "(none)"}`);
    console.log(`    misleading_framing: ${qc.tier2.misleadingFraming} - ${qc.tier2.misleadingFramingDetail}`);
    console.log(`    hook strength: ${qc.tier2.hookStrength} - ${qc.tier2.hookImprovementSuggestion}`);
    console.log(`    -- The contributor's VERBATIM quotes (never edited - not checked for overpromising) --`);
    console.log(
      `    verbatim_fidelity_issues: ${qc.tier2.verbatimFidelityIssues.length ? qc.tier2.verbatimFidelityIssues.map((q) => `"${q.quote}" - ${q.issue}`).join("; ") : "(none)"}`
    );
    console.log(
      `    editorial_box_issues: ${qc.tier2.editorialBoxIssues.length ? qc.tier2.editorialBoxIssues.map((q) => `"${q.quote}" - ${q.issue}`).join("; ") : "(none)"}`
    );
    console.log(`    attribution_ok: ${qc.tier2.attributionOk} - ${qc.tier2.attributionDetail}`);
    console.log(`    source article resolved: ${qc.article.frontmatter.title}`);
    console.log(`  Tier 3 (fit, expert-quote-core - shared with Phase F's self-check, see lib/instagram/slide-fit.ts):`);
    printFitFindings(qc.tier3Fit);
    console.log(`  Safety: identifies_real_child: ${qc.tier2.identifiesRealChild} - ${qc.tier2.identifiesRealChildDetail}`);
    printQcFooter(qc);
    return;
  }

  console.log(`  Tier 2 (AI judgment):`);
  console.log(`    hook: ${qc.tier2.hookClassification} - ${qc.tier2.hookClassificationReason}`);
  console.log(`    promises_success: ${qc.tier2.promisesSuccess} - ${qc.tier2.promisesSuccessDetail}`);
  console.log(`    absolutes_found: ${qc.tier2.absolutesFound.length ? qc.tier2.absolutesFound.join("; ") : "(none)"}`);
  console.log(
    `    claim_grounding_issues: ${
      qc.tier2.claimGroundingIssues.length ? qc.tier2.claimGroundingIssues.map((c) => `"${c.claim}" (${c.confirmedProblem ? "problem" : "note only"}) - ${c.issue}`).join("; ") : "(none)"
    }`
  );
  console.log(`    misleading_framing: ${qc.tier2.misleadingFraming} - ${qc.tier2.misleadingFramingDetail}`);
  console.log(`    source article resolved: ${qc.article ? qc.article.frontmatter.title : "(none)"}`);
  console.log(`    hook strength: ${qc.tier2.hookStrength} - ${qc.tier2.hookImprovementSuggestion}`);

  console.log(`  Tier 3 (fit + safety):`);
  console.log(`    identifies_real_child: ${qc.tier2.identifiesRealChild} - ${qc.tier2.identifiesRealChildDetail}`);
  printFitFindings(qc.tier3Fit);

  printQcFooter(qc);
}

function printFitFindings(fit: SlideFitResult[]): void {
  for (const f of fit) {
    const flag = !f.fits ? "[HARD FAIL]" : f.tight ? "[soft]" : "[ok]";
    console.log(`    ${flag} ${f.label} (${f.renderer}/${f.slideKind}): ${f.detail}`);
  }
}

async function processItem(label: string, result: CopyGenerationResult, article: Article | null, apply: boolean, applyRow?: { supabase: SupabaseClient; row: ContentQueueRow }): Promise<{ generationCost: number; qcCost: number }> {
  console.log(`\n${"=".repeat(72)}`);
  console.log(label);
  printSlides(result);
  printFit(result);
  console.log(`\n  Generation API cost: $${result.usage.costUsd.toFixed(4)} (${result.usage.inputTokens} in / ${result.usage.outputTokens} out, ${result.attempts} call(s))`);

  const qc = await runQcOnGeneratedCopy(result, article);
  printQc(qc);

  if (apply && applyRow) {
    await writeCopyResult(applyRow.supabase, applyRow.row, result);
    console.log(`  Applied: wrote source_ref.copy to content_queue ${applyRow.row.id}`);
  }

  return { generationCost: result.usage.costUsd, qcCost: qc.apiCostUsd };
}

async function main() {
  requireEnv("ANTHROPIC_API_KEY");

  const type = argValue("type");
  const theme = argValue("theme");
  const apply = hasFlag("apply");
  const source = argValue("source");
  const limit = argValue("limit") ? Number(argValue("limit")) : undefined;
  const articleArg = argValue("article");
  const contributorName = argValue("contributor-name");
  const contributorRole = argValue("contributor-role");
  const contributorBio = argValue("contributor-bio");
  const contributorPhoto = argValue("contributor-photo");

  if (!type) {
    console.error(
      "Usage: npm run copy -- --type=<joke-carousel|joke-single|education|interview> [--theme=... | --source=gsc --limit=5 | --article=/path --contributor-name=... --contributor-role=... --contributor-bio=... --contributor-photo=...] [--apply]"
    );
    process.exitCode = 1;
    return;
  }

  let totalGenerationCost = 0;
  let totalQcCost = 0;
  let count = 0;

  if (type === "joke-carousel" || type === "joke-single") {
    if (!theme) {
      console.error("--theme is required for joke-carousel / joke-single");
      process.exitCode = 1;
      return;
    }
    const result = type === "joke-carousel" ? await generateJokeCarousel(theme) : await generateJokeSingle(theme);
    const { generationCost, qcCost } = await processItem(`Ad hoc ${type}: "${theme}"`, result, null, false);
    totalGenerationCost += generationCost;
    totalQcCost += qcCost;
    count = 1;
  } else if (type === "interview" && articleArg) {
    // Ad hoc path - test an interview without seeding a content_queue row
    // first, mirroring joke-carousel/joke-single's --theme path. Requires
    // all four structured contributor fields, same as the queue-driven path.
    if (!contributorName || !contributorRole || !contributorBio || !contributorPhoto) {
      console.error("--article requires --contributor-name, --contributor-role, --contributor-bio, and --contributor-photo");
      process.exitCode = 1;
      return;
    }
    const article = resolveArticle(articleArg);
    if (!article) {
      console.error(`--article=${articleArg} did not resolve to a published article (checked content/<category>/<slug>.mdx via getArticleBySlug).`);
      process.exitCode = 1;
      return;
    }
    const result = await generateInterviewCarousel(
      { name: contributorName, role: contributorRole, bio: contributorBio, photoUrl: contributorPhoto },
      article
    );
    const { generationCost, qcCost } = await processItem(`Ad hoc interview: ${articleArg} - ${contributorName}`, result, article, false);
    totalGenerationCost += generationCost;
    totalQcCost += qcCost;
    count = 1;
  } else if (type === "education" || type === "interview") {
    for (const name of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) requireEnv(name);
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

    const rows = await getQueueItemsForCopy(supabase, { contentType: type, source, limit });
    if (rows.length === 0) {
      console.log(`No draft content_queue items found for content_type=${type}${source ? `, source=${source}` : ""}.`);
      return;
    }
    console.log(`Found ${rows.length} item(s). ${apply ? "Will write source_ref.copy back to each." : "Dry run - no DB writes (pass --apply to write)."}`);

    for (const row of rows) {
      if (type === "education") {
        const pathname = typeof row.source_ref?.page === "string" ? (row.source_ref.page as string) : null;
        const article = pathname ? resolveArticle(pathname) : null;
        const result = await generateEducationReel(row.topic, article);
        const { generationCost, qcCost } = await processItem(`Item ${row.id} (${row.content_type}, source=${row.source})`, result, article, apply, { supabase, row });
        totalGenerationCost += generationCost;
        totalQcCost += qcCost;
        count++;
        continue;
      }

      // Interviews: contributor identity + the article reference are
      // supplied structurally (never scraped from the article) - see
      // supabase/migrations/20260720110000_content_queue_source_ref_interview.sql
      // for the source_ref.contributor / source_ref.articlePage shape.
      const sourceRef = row.source_ref ?? {};
      const contributorRaw = sourceRef.contributor as Record<string, unknown> | undefined;
      const articlePage = typeof sourceRef.articlePage === "string" ? (sourceRef.articlePage as string) : null;
      const article = articlePage ? resolveArticle(articlePage) : null;

      if (!article) {
        console.log(`\n${"=".repeat(72)}\nItem ${row.id} (interview): SKIPPED - source_ref.articlePage (${articlePage ?? "(missing)"}) did not resolve to a published article. F cannot select quotes without the source article.`);
        continue;
      }
      const name = typeof contributorRaw?.name === "string" ? contributorRaw.name : null;
      const role = typeof contributorRaw?.role === "string" ? contributorRaw.role : null;
      const bio = typeof contributorRaw?.bio === "string" ? contributorRaw.bio : null;
      const photoUrl = typeof contributorRaw?.photoUrl === "string" ? contributorRaw.photoUrl : null;
      if (!name || !role || !bio || !photoUrl) {
        console.log(`\n${"=".repeat(72)}\nItem ${row.id} (interview): SKIPPED - source_ref.contributor is missing one of name/role/bio/photoUrl. All four must be supplied manually when the interview enters the queue.`);
        continue;
      }

      const result = await generateInterviewCarousel({ name, role, bio, photoUrl }, article);
      const { generationCost, qcCost } = await processItem(`Item ${row.id} (${row.content_type}, source=${row.source}) - ${name}`, result, article, apply, { supabase, row });
      totalGenerationCost += generationCost;
      totalQcCost += qcCost;
      count++;
    }
  } else {
    console.error(`Unknown --type=${type}. Use joke-carousel, joke-single, education, or interview.`);
    process.exitCode = 1;
    return;
  }

  console.log(`\n${"=".repeat(72)}`);
  console.log(`Done. ${count} item(s) generated.`);
  console.log(`Total generation cost: $${totalGenerationCost.toFixed(4)}. Total QC cost: $${totalQcCost.toFixed(4)}. Combined: $${(totalGenerationCost + totalQcCost).toFixed(4)}.`);
  if (!apply) console.log(`Dry run only - re-run with --apply to write source_ref.copy back to content_queue.`);
}

main().catch((err) => {
  console.error("copy-run crashed:", err instanceof Error ? err.stack ?? err.message : err);
  process.exitCode = 1;
});

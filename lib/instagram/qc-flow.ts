// Phase D: QC layer. Runs on drafted social copy BEFORE it reaches human
// approval - content_queue (idea) -> drafted copy (topic, from Phase E's
// extractCarouselPoints) -> [QC HERE] -> render -> approval -> publish.
//
// QC operates on content_queue rows directly (status='draft') rather than
// posts.render_payload, because that's where drafted copy actually lives
// today - see lib/instagram/ideation-flow.ts buildTopic(). A future
// drafting step that turns topic into a full render_payload can run this
// same module before creating the post row.
//
// Item passes QC only if every HARD check across all three tiers passes.
// Soft flags are notes, not failures. Results are written back to
// content_queue.source_ref.qc (queryable) rather than a new column/status
// value, and status moves to 'pending_approval' (pass) or 'rejected' (fail)
// - 'rejected' already means "a queue item killed before it ever became a
// post" per the original schema migration comment, which is exactly what a
// QC failure at this stage is.

import { SupabaseClient } from "@supabase/supabase-js";
import type { Article } from "../content";
import { resolveArticle } from "./ideation-flow";
import { ParsedDraft, parseDraftedTopic, visibleCopy } from "./qc-parse";
import { Tier1Result, runTier1 } from "./qc-tier1";
import { Tier2Result, runTier2 } from "./qc-tier2";
import { FitCheckItem, FitFinding, checkFit } from "./qc-fit";

export interface ContentQueueRow {
  id: string;
  content_type: string;
  topic: string;
  status: string;
  source: string;
  source_ref: Record<string, unknown>;
  priority: number;
  created_at: string;
}

export interface QcItemResult {
  id: string;
  contentType: string;
  source: string;
  parsed: ParsedDraft;
  article: Article | null;
  tier1: Tier1Result;
  tier2: Tier2Result;
  tier3Fit: FitFinding[];
  hardFails: string[];
  softFlags: string[];
  passed: boolean;
  apiCostUsd: number;
}

export interface GetDraftItemsOptions {
  source?: string;
  limit?: number;
}

export async function getDraftItems(supabase: SupabaseClient, options: GetDraftItemsOptions = {}): Promise<ContentQueueRow[]> {
  let query = supabase
    .from("content_queue")
    .select("id, content_type, topic, status, source, source_ref, priority, created_at")
    .eq("status", "draft")
    .order("created_at", { ascending: true });
  if (options.source) query = query.eq("source", options.source);
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw new Error("Failed to fetch draft content_queue items: " + error.message);
  return (data ?? []) as ContentQueueRow[];
}

function fitItemsFor(parsed: ParsedDraft): FitCheckItem[] {
  const items: FitCheckItem[] = [];
  if (parsed.hook) items.push({ label: "hook", text: parsed.hook, kind: "hook" });
  parsed.points.forEach((p, i) => items.push({ label: `point ${i + 1}`, text: p, kind: "content" }));
  return items;
}

export async function runQcOnItem(row: ContentQueueRow): Promise<QcItemResult> {
  const parsed = parseDraftedTopic(row.topic);
  const text = visibleCopy(parsed);

  const tier1 = runTier1(text);

  const pathname = typeof row.source_ref?.page === "string" ? (row.source_ref.page as string) : null;
  const article = pathname ? resolveArticle(pathname) : null;

  const tier2 = await runTier2(parsed, article);
  const tier3Fit = checkFit(fitItemsFor(parsed));

  const hardFails: string[] = [];
  const softFlags: string[] = [];

  for (const f of tier1.findings) {
    (f.hardFail ? hardFails : softFlags).push(`[Tier 1] ${f.rule}: ${f.detail}`);
  }

  if (tier2.hookClassification === "overpromising") {
    hardFails.push(`[Tier 2] hook_overpromising: ${tier2.hookClassificationReason}`);
  }
  if (tier2.promisesSuccess) {
    hardFails.push(`[Tier 2] promises_success: ${tier2.promisesSuccessDetail}`);
  }
  if (tier2.absolutesFound.length > 0) {
    softFlags.push(`[Tier 2] unsupported_absolutes: ${tier2.absolutesFound.join("; ")}`);
  }
  // Only entries the model itself flagged as a genuine problem
  // (confirmedProblem) count as a failure - one it describes as
  // grounded/verified/fine (confirmedProblem: false) is not a failure, see
  // qc-tier2.ts's claim_grounding_issues schema comment.
  const confirmedGroundingIssues = tier2.claimGroundingIssues.filter((c) => c.confirmedProblem);
  const noteworthyGroundingIssues = tier2.claimGroundingIssues.filter((c) => !c.confirmedProblem);
  if (confirmedGroundingIssues.length > 0) {
    hardFails.push(`[Tier 2] claim_grounding: ${confirmedGroundingIssues.map((c) => `"${c.claim}" - ${c.issue}`).join("; ")}`);
  }
  if (noteworthyGroundingIssues.length > 0) {
    softFlags.push(`[Tier 2] claim_grounding_note: ${noteworthyGroundingIssues.map((c) => `"${c.claim}" - ${c.issue}`).join("; ")}`);
  }
  if (tier2.misleadingFraming) {
    hardFails.push(`[Tier 2] misleading_framing: ${tier2.misleadingFramingDetail}`);
  }
  // Safety backstop - bundled into the Tier 2 API call for cost (one call per
  // item instead of two) but reported as Tier 3, per the task brief's tier
  // split. See qc-tier2.ts system prompt, identifiesRealChild.
  if (tier2.identifiesRealChild) {
    hardFails.push(`[Tier 3] real_child_identified: ${tier2.identifiesRealChildDetail}`);
  }

  for (const f of tier3Fit) {
    if (f.overflow) {
      hardFails.push(
        `[Tier 3] fit_overflow: "${f.label}" wraps to ${f.lines} line(s) (max ${f.hardMaxLines} before it collides with the footer/handle at render time).`
      );
    } else if (f.tooLong) {
      softFlags.push(
        `[Tier 3] fit_long: "${f.label}" wraps to ${f.lines} line(s) (recommended max ${f.recommendedMaxLines} for a punchy slide).`
      );
    }
  }

  return {
    id: row.id,
    contentType: row.content_type,
    source: row.source,
    parsed,
    article,
    tier1,
    tier2,
    tier3Fit,
    hardFails,
    softFlags,
    passed: hardFails.length === 0,
    apiCostUsd: tier2.usage.costUsd,
  };
}

export async function writeQcResult(supabase: SupabaseClient, row: ContentQueueRow, result: QcItemResult): Promise<void> {
  const newStatus = result.passed ? "pending_approval" : "rejected";
  const qcRecord = {
    ranAt: new Date().toISOString(),
    passed: result.passed,
    hardFails: result.hardFails,
    softFlags: result.softFlags,
    hookStrength: result.tier2.hookStrength,
    hookImprovementSuggestion: result.tier2.hookImprovementSuggestion,
    apiCostUsd: result.apiCostUsd,
  };
  const { error } = await supabase
    .from("content_queue")
    .update({ status: newStatus, source_ref: { ...row.source_ref, qc: qcRecord } })
    .eq("id", row.id);
  if (error) throw new Error(`Failed to write QC result for ${row.id}: ${error.message}`);
}

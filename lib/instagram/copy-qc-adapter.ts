// Feeds Phase F's generated slide copy through QC.
//
// For jokes/education: the EXISTING QC layer's TEXT checks (Phase D:
// qc-tier1.ts, qc-tier2.ts), unmodified in their approach - qc-flow.ts's
// runQcOnItem() takes a content_queue row and parses row.topic (a free-text
// "hook + numbered points" string - see qc-parse.ts) into a ParsedDraft.
// Phase F's output isn't that shape - it's already-structured slide copy -
// so there is no topic string to parse. This module builds the SAME
// ParsedDraft shape runQcOnItem builds internally, directly from the
// generated slides, then calls the exact same tier functions and aggregates
// hard fails / soft flags with the exact same rules qc-flow.ts's
// runQcOnItem uses.
//
// Fit-checking (Tier 3) is NOT recomputed here at all: result.fit was
// already produced by copy-flow.ts's own pre-QC self-check, calling the
// SAME lib/instagram/slide-fit.ts module this file would otherwise call
// again - so QC's fit verdict reuses that exact computation rather than
// running a second, potentially-diverging one. slide-fit.ts covers all
// three renderers (single-slide-core, reel-core, expert-quote-core), so
// interviews now get a real fit-check too, not the "skipped entirely"
// placeholder this module used to fall back to (qc-fit.ts only ever knew
// reel-core's layout).
//
// For interviews: a DIFFERENT text-check split is required, because
// interview slides mix Football Parent's own writing (hook, context/
// framing lines) with a real contributor's VERBATIM QUOTES that F is
// forbidden from altering. Running the generic checks (never-promise-
// success, absolutes) against a contributor's own words would flag their
// real opinion as if Football Parent wrote it - see qc-tier2-interview.ts
// for the full rationale. So interviews get their own Tier 1 (run on F's
// own text only, not the quotes) and their own Tier 2
// (qc-tier2-interview.ts, which checks quotes for verbatim fidelity/
// attribution/not-lifted-from-an-editorial-box instead of overpromising).

import type { Article } from "../content";
import type { ParsedDraft } from "./qc-parse";
import { visibleCopy } from "./qc-parse";
import { Tier1Result, runTier1 } from "./qc-tier1";
import { Tier2Result, runTier2 } from "./qc-tier2";
import { Tier2InterviewResult, runTier2Interview } from "./qc-tier2-interview";
import type { SlideFitResult } from "./slide-fit";
import type { GeneratedSlide, CopyGenerationResult } from "./copy-flow";

export interface CopyQcResultGeneric {
  kind: "generic";
  parsed: ParsedDraft;
  article: Article | null;
  tier1: Tier1Result;
  tier2: Tier2Result;
  tier3Fit: SlideFitResult[];
  hardFails: string[];
  softFlags: string[];
  passed: boolean;
  apiCostUsd: number;
}

export interface CopyQcResultInterview {
  kind: "interview";
  article: Article;
  tier1: Tier1Result; // F's own text (hook + context lines) only - never the quotes
  tier2: Tier2InterviewResult;
  tier3Fit: SlideFitResult[];
  hardFails: string[];
  softFlags: string[];
  passed: boolean;
  apiCostUsd: number;
}

export type CopyQcResult = CopyQcResultGeneric | CopyQcResultInterview;

// The hook is the first slide (kind='hook') if present; every other slide
// becomes one "point" (head + body combined into a single string, mirroring
// how ideation-flow.ts's buildTopic() writes one point per bullet).
function toParsedDraft(slides: GeneratedSlide[]): ParsedDraft {
  const hookSlide = slides.find((s) => s.kind === "hook");
  const bodySlides = slides.filter((s) => s !== hookSlide);
  const hook = hookSlide ? [hookSlide.head, hookSlide.body].filter(Boolean).join(" - ") : "";
  const points = bodySlides.map((s) => [s.head, s.body, s.attrib ? `(${s.attrib})` : null].filter(Boolean).join(" - "));
  const raw = [hook, ...points].join("\n\n");
  return { hook, points, sourceLine: null, structured: true, raw };
}

function aggregateFit(tier3Fit: SlideFitResult[], hardFails: string[], softFlags: string[]): void {
  for (const f of tier3Fit) {
    if (!f.fits) {
      hardFails.push(`[Tier 3] fit_overflow: "${f.label}" (${f.renderer}/${f.slideKind}) - ${f.detail}`);
    } else if (f.tight) {
      softFlags.push(`[Tier 3] fit_tight: "${f.label}" (${f.renderer}/${f.slideKind}) - ${f.detail}`);
    }
  }
}

async function runGenericQc(result: CopyGenerationResult, article: Article | null): Promise<CopyQcResultGeneric> {
  const parsed = toParsedDraft(result.slides);
  const text = visibleCopy(parsed);

  const tier1 = runTier1(text);
  const tier2 = await runTier2(parsed, article);

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
  // grounded/verified/fine (confirmedProblem: false) is not a failure. See
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
  if (tier2.identifiesRealChild) {
    hardFails.push(`[Tier 3] real_child_identified: ${tier2.identifiesRealChildDetail}`);
  }

  aggregateFit(result.fit, hardFails, softFlags);

  return {
    kind: "generic",
    parsed,
    article,
    tier1,
    tier2,
    tier3Fit: result.fit,
    hardFails,
    softFlags,
    passed: hardFails.length === 0,
    apiCostUsd: tier2.usage.costUsd,
  };
}

// Splits interview slides by whose words they are: F's own text is the hook
// (head+body) plus every slide's "head" field (the context/framing line F
// wrote to introduce a quote, possibly empty) - the verbatim quotes are the
// "body" field of kind='quote' slides only. See generateInterviewCarousel's
// pairContextAndQuotes() in copy-flow.ts for how those fields get set.
function splitInterviewText(slides: GeneratedSlide[]): { ownText: string; quotes: string[] } {
  const ownTextParts: string[] = [];
  const quotes: string[] = [];
  for (const s of slides) {
    if (s.head) ownTextParts.push(s.head);
    if (s.kind === "hook" && s.body) ownTextParts.push(s.body);
    if (s.kind === "quote" && s.body) quotes.push(s.body);
  }
  return { ownText: ownTextParts.join("\n"), quotes };
}

async function runInterviewQc(result: CopyGenerationResult, article: Article, meta: { contributorName: string; contributorRole: string }): Promise<CopyQcResultInterview> {
  const { ownText, quotes } = splitInterviewText(result.slides);

  const tier1 = runTier1(ownText);
  const tier2 = await runTier2Interview(ownText, quotes, meta.contributorName, meta.contributorRole, article);

  const hardFails: string[] = [];
  const softFlags: string[] = [];

  for (const f of tier1.findings) {
    (f.hardFail ? hardFails : softFlags).push(`[Tier 1] ${f.rule}: ${f.detail}`);
  }

  if (tier2.hookClassification === "overpromising") {
    hardFails.push(`[Tier 2] hook_overpromising (FP's own text): ${tier2.hookClassificationReason}`);
  }
  if (tier2.promisesSuccess) {
    hardFails.push(`[Tier 2] promises_success (FP's own text): ${tier2.promisesSuccessDetail}`);
  }
  if (tier2.absolutesFound.length > 0) {
    softFlags.push(`[Tier 2] unsupported_absolutes (FP's own text): ${tier2.absolutesFound.join("; ")}`);
  }
  if (tier2.misleadingFraming) {
    hardFails.push(`[Tier 2] misleading_framing (FP's own text): ${tier2.misleadingFramingDetail}`);
  }
  if (tier2.verbatimFidelityIssues.length > 0) {
    hardFails.push(`[Tier 2] verbatim_fidelity: ${tier2.verbatimFidelityIssues.map((q) => `"${q.quote}" - ${q.issue}`).join("; ")}`);
  }
  if (tier2.editorialBoxIssues.length > 0) {
    hardFails.push(`[Tier 2] editorial_box_quote: ${tier2.editorialBoxIssues.map((q) => `"${q.quote}" - ${q.issue}`).join("; ")}`);
  }
  if (!tier2.attributionOk) {
    hardFails.push(`[Tier 2] attribution: ${tier2.attributionDetail}`);
  }
  if (tier2.identifiesRealChild) {
    hardFails.push(`[Tier 3] real_child_identified: ${tier2.identifiesRealChildDetail}`);
  }

  aggregateFit(result.fit, hardFails, softFlags);

  return {
    kind: "interview",
    article,
    tier1,
    tier2,
    tier3Fit: result.fit,
    hardFails,
    softFlags,
    passed: hardFails.length === 0,
    apiCostUsd: tier2.usage.costUsd,
  };
}

export async function runQcOnGeneratedCopy(result: CopyGenerationResult, article: Article | null): Promise<CopyQcResult> {
  if (result.contentType === "interview") {
    if (!article) throw new Error("Interview QC requires the source article (interviews cannot be QC'd without it - see generateInterviewCarousel)");
    if (!result.interviewMeta) throw new Error("Interview QC requires result.interviewMeta (contributor name/role) - was this CopyGenerationResult produced by generateInterviewCarousel?");
    return runInterviewQc(result, article, result.interviewMeta);
  }
  return runGenericQc(result, article);
}

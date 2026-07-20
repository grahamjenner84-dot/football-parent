// Phase F: AI copywriting layer. Turns a queued content idea (or an ad hoc
// theme, for jokes) into finished, render-ready slide copy matching the
// relevant core-module's render_payload shape (see
// supabase/migrations/20260719140000_render_pipeline_payload.sql), ready for
// the existing QC layer (Phase D, see copy-qc-adapter.ts) then render
// (Phase A, scripts/render-batch.ts).
//
// Pipeline: idea in content_queue (from GSC ideation E, or chat) -> [HERE] ->
// QC (D) -> render (A) -> approval (G) -> publish (B).
//
// One Claude call per item (same "bundle checks into one call" cost
// discipline as qc-tier2.ts). Runs the deterministic half of the spec's
// section 6 pre-QC self-check itself (banned phrases/em dash/line-fit -
// cheap, reliable) and trusts the model's own structured self-check for the
// judgment calls (hook overpromising, real-child ID) that need to have
// already been applied to the text it returns - if either the deterministic
// check or the model's own selfCheck.passesAllChecks is false, this
// regenerates ONCE with the failure fed back as extra instruction before
// giving up and flagging the item for manual review (never fails silently -
// the caller still gets the copy plus a needsManualReview reason).

import Anthropic from "@anthropic-ai/sdk";
import { SupabaseClient } from "@supabase/supabase-js";
import type { Article } from "../content";
import { BANNED_AI_SLOP_PHRASES, BADGE_CLICHE_PATTERNS, EM_DASH } from "./qc-rules";
import { checkSlidesFit, SlideFitInput, SlideFitResult } from "./slide-fit";
import {
  MODEL,
  INPUT_COST_PER_TOKEN,
  OUTPUT_COST_PER_TOKEN,
  buildJokeSingleSystemPrompt,
  buildJokeSingleUserPrompt,
  JOKE_SINGLE_SCHEMA,
  buildJokeCarouselSystemPrompt,
  buildJokeCarouselUserPrompt,
  JOKE_CAROUSEL_SCHEMA,
  buildEducationSystemPrompt,
  buildEducationUserPrompt,
  EDUCATION_SCHEMA,
  buildInterviewSystemPrompt,
  buildInterviewUserPrompt,
  INTERVIEW_SCHEMA,
} from "./copy-prompts";

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (cachedClient) return cachedClient;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set (check .env.local / Vercel env)");
  }
  cachedClient = new Anthropic();
  return cachedClient;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface SelfCheck {
  passesAllChecks: boolean;
  issues: string[];
}

async function callClaude<T>(system: string, user: string, schema: Record<string, unknown>): Promise<{ parsed: T; usage: Usage }> {
  const client = getClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema },
    },
    system,
    messages: [{ role: "user", content: user }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Claude refused to generate this copy");
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  if (!textBlock) throw new Error("No text content in Claude's copy response");

  const parsed = JSON.parse(textBlock.text) as T;

  const inputTokens = (response.usage.input_tokens ?? 0) + (response.usage.cache_creation_input_tokens ?? 0) + (response.usage.cache_read_input_tokens ?? 0);
  const outputTokens = response.usage.output_tokens;
  const costUsd = inputTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN;

  return { parsed, usage: { inputTokens, outputTokens, costUsd } };
}

function sumUsage(a: Usage, b: Usage): Usage {
  return { inputTokens: a.inputTokens + b.inputTokens, outputTokens: a.outputTokens + b.outputTokens, costUsd: a.costUsd + b.costUsd };
}

// Deterministic half of the spec's section 6 self-check - the same rules
// Tier 1 (qc-tier1.ts) enforces later, checked here first so a regeneration
// happens before Phase D ever sees the item, not after.
export function deterministicIssues(text: string): string[] {
  const issues: string[] = [];
  if (EM_DASH.test(text)) issues.push("Contains an em dash (—).");
  const lower = text.toLowerCase();
  const bannedHit = BANNED_AI_SLOP_PHRASES.find((p) => lower.includes(p));
  if (bannedHit) issues.push(`Contains banned AI-slop phrase: "${bannedHit}"`);
  for (const pattern of BADGE_CLICHE_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      issues.push(`Contains "badge" framing cliche: "${m[0]}"`);
      break;
    }
  }
  return issues;
}

export interface GeneratedSlide {
  label: string;
  kind: "hook" | "content" | "cta" | "quote";
  head: string;
  body?: string;
  attrib?: string;
  num?: number;
  numberLabel?: string; // e.g. "BONUS!" - overrides the numeric badge. Not read by
  // reel-core.js yet (see comment on renderCarouselContentType below) - a
  // future render-batch.ts update for joke carousels would need to draw it.
}

export interface CopyGenerationResult {
  contentType: "joke" | "education" | "interview";
  format: "single" | "carousel" | "reel";
  slides: GeneratedSlide[]; // full visible copy, in render order, for display/QC
  renderPayload: Record<string, unknown>;
  fit: SlideFitResult[];
  modelSelfCheck: SelfCheck;
  deterministicIssues: string[];
  needsManualReview: boolean;
  manualReviewReason: string | null;
  attempts: number;
  usage: Usage;
  raw: unknown; // last raw parsed model response, for debugging/display
  // Only set when contentType='interview' - lets copy-qc-adapter.ts split
  // QC checks by whose words they are (F's own framing vs the contributor's
  // verbatim quotes) without re-parsing GeneratedSlide.attrib, which is a
  // free-text "name, role" string that isn't safely splittable when role
  // itself contains a comma (e.g. "Head of Coaching, Content & Club
  // Support, Football DNA").
  interviewMeta?: { contributorName: string; contributorRole: string };
}

const DEFAULT_BRAND = {
  handle: "@footballparentuk",
  tiktokHandle: "@footballparent",
  ctaUrl: "footballparent.co.uk",
  // Explicitly empty rather than omitted: reel-core.js's classic hook
  // layout does `ctx.fillText(brand.hookSubtitle, ...)` AND
  // `fillTextEmojiAware(ctx, brand.saveLine, ...)` unconditionally (the
  // latter drawn separately, above the headline) - an undefined value on
  // either would draw the literal word "undefined" on the hook slide.
  // Confirmed by rendering a real joke-reel hook frame and seeing exactly
  // that. Phase F embeds its own per-post subtext INTO slide.head (see
  // hookHead in generateEducationReel/generateJokeCarousel), so these fixed
  // site-wide lines are deliberately blank, not per-post content. saveLine
  // is available for a real "save this" prompt (a genuine save-driver per
  // the reference examples) if that's ever wanted - left blank here rather
  // than choosing that copy unasked.
  hookSubtitle: "",
  saveLine: "",
  marginX: 96,
  marginRight: 96,
  marginBottom: 220,
};

// Per-slide hold time for a joke-set reel (public/reel-core.js frames, held
// static then concatenated by assembleSlideshowMp4 - see render-batch.ts's
// renderReelVideoPost). Tuned for "long enough to read a short quote +
// reframe, not so long it drags" - these are deliberately short punchy
// lines (see the joke-carousel prompt's fit rule), so a few seconds per
// slide is enough; the title card gets a little longer since it's the
// curiosity-gap hook the whole reel has to earn a stop-scroll on.
const JOKE_REEL_HOOK_SECS = 3.5;
const JOKE_REEL_ENTRY_SECS = 3;
const JOKE_REEL_BONUS_SECS = 3;
const JOKE_REEL_CLOSING_SECS = 4;

function allSlidesText(slides: GeneratedSlide[]): string {
  return slides.map((s) => [s.head, s.body, s.attrib].filter(Boolean).join(" ")).join("\n");
}

// The real fit-check now: SlideFitInput[] mirrors what actually gets
// rendered (see each generator's fitInputs below - notably the reel-core
// hook's `head` combines headline+subtext with \n exactly like the real
// render_payload does, unlike GeneratedSlide which keeps them separate
// fields for display) and is measured against the real renderer geometry
// via lib/instagram/slide-fit.ts - the SAME module Phase D's QC gate uses
// (see qc-fit.ts / copy-qc-adapter.ts), so F's self-check and D's QC gate
// can never disagree about whether a slide fits.
function evaluateSelfCheck(slides: GeneratedSlide[], fitInputs: SlideFitInput[], modelSelfCheck: SelfCheck): { detIssues: string[]; fit: SlideFitResult[]; ok: boolean } {
  const detIssues = deterministicIssues(allSlidesText(slides));
  const fit = checkSlidesFit(fitInputs);
  const fitOk = fit.every((f) => f.fits);
  const ok = detIssues.length === 0 && fitOk && modelSelfCheck.passesAllChecks;
  return { detIssues, fit, ok };
}

function failureFeedback(detIssues: string[], fit: SlideFitResult[], modelSelfCheck: SelfCheck): string {
  const parts: string[] = [];
  if (detIssues.length) parts.push(`Deterministic style check failed: ${detIssues.join("; ")}. Fix this exact issue.`);
  const overflow = fit.filter((f) => !f.fits);
  if (overflow.length) {
    parts.push(
      `These slides overflow the real render template and must be shortened or split into an extra slide: ${overflow
        .map((f) => `"${f.label}" (${f.detail})`)
        .join("; ")}.`
    );
  }
  if (!modelSelfCheck.passesAllChecks) {
    parts.push(`Your own self-check flagged unresolved issues: ${modelSelfCheck.issues.join("; ")}. Fix these before answering.`);
  }
  return `Your previous attempt failed review. ${parts.join(" ")} Rewrite the full response addressing this feedback.`;
}

// Generic "generate, self-check, regenerate once on failure" loop shared by
// all four generators below. toSlides returns BOTH the display slides
// (GeneratedSlide[], used for the CLI report and QC's text checks) and the
// renderer-accurate fit inputs (SlideFitInput[], used only for fit
// measurement) - the two can differ in shape (see the education hook
// example above), so they're built together from the same parsed response
// rather than derived from each other.
async function generateWithRetry<T extends { selfCheck: SelfCheck }>(
  system: string,
  user: string,
  schema: Record<string, unknown>,
  toSlides: (parsed: T) => { slides: GeneratedSlide[]; fitInputs: SlideFitInput[] }
): Promise<{ parsed: T; slides: GeneratedSlide[]; fit: SlideFitResult[]; detIssues: string[]; needsManualReview: boolean; manualReviewReason: string | null; attempts: number; usage: Usage }> {
  let attempt = await callClaude<T>(system, user, schema);
  let built = toSlides(attempt.parsed);
  let evalResult = evaluateSelfCheck(built.slides, built.fitInputs, attempt.parsed.selfCheck);
  let usage = attempt.usage;
  let attempts = 1;

  if (!evalResult.ok) {
    const feedback = failureFeedback(evalResult.detIssues, evalResult.fit, attempt.parsed.selfCheck);
    const retry = await callClaude<T>(system, `${user}\n\n${feedback}`, schema);
    const retryBuilt = toSlides(retry.parsed);
    const retryEval = evaluateSelfCheck(retryBuilt.slides, retryBuilt.fitInputs, retry.parsed.selfCheck);
    usage = sumUsage(usage, retry.usage);
    attempts = 2;
    attempt = retry;
    built = retryBuilt;
    evalResult = retryEval;
  }

  const needsManualReview = !evalResult.ok;
  const manualReviewReason = needsManualReview
    ? [
        ...evalResult.detIssues,
        ...evalResult.fit.filter((f) => !f.fits).map((f) => `"${f.label}" overflows (${f.detail})`),
        ...attempt.parsed.selfCheck.issues,
      ].join("; ")
    : null;

  return { parsed: attempt.parsed, slides: built.slides, fit: evalResult.fit, detIssues: evalResult.detIssues, needsManualReview, manualReviewReason, attempts, usage };
}

// ---------------------------------------------------------------------------
// Jokes
// ---------------------------------------------------------------------------

interface JokeSingleResponse {
  template: "A" | "B";
  head: string;
  body: string;
  selfCheck: SelfCheck;
}

export async function generateJokeSingle(topic: string): Promise<CopyGenerationResult> {
  const system = buildJokeSingleSystemPrompt();
  const user = buildJokeSingleUserPrompt(topic);
  const result = await generateWithRetry<JokeSingleResponse>(system, user, JOKE_SINGLE_SCHEMA, (parsed) => ({
    slides: [{ label: "slide 1", kind: "content", head: parsed.head, body: parsed.body }],
    fitInputs: [{ label: "slide 1", renderer: "single-slide-core", slideKind: "joke", head: parsed.head, body: parsed.body }],
  }));

  const renderPayload = {
    joke: { setup: result.parsed.head, punch: result.parsed.body, layout: "A" as const },
    platform: "ig" as const,
  };

  return {
    contentType: "joke",
    format: "single",
    slides: result.slides,
    renderPayload,
    fit: result.fit,
    modelSelfCheck: result.parsed.selfCheck,
    deterministicIssues: result.detIssues,
    needsManualReview: result.needsManualReview,
    manualReviewReason: result.manualReviewReason,
    attempts: result.attempts,
    usage: result.usage,
    raw: result.parsed,
  };
}

interface JokeCarouselResponse {
  title: string;
  entries: Array<{ number: number; quote: string; reframe: string; mechanic: string }>;
  bonus: { quote: string; reframe: string };
  closing: { statement: string; sharePrompt: string; callbackEntryNumber: number };
  selfCheck: SelfCheck;
}

// content_type='joke' with a multi-slide set (curiosity-gap title + numbered
// quote/reframe slides + BONUS + share-CTA closer) renders via reel-core,
// the SAME core module education reels use, and the SAME way: a silent MP4
// reel (each slide held for its own `secs`, assembled via
// assembleSlideshowMp4), not individual carousel images - reels get more
// reach and reach non-followers, which is the point for this content.
// render-batch.ts's renderJokePost branches on render_payload having `reel`
// vs `joke` to pick this path over the single-slide-core one. Rendered
// silent by design: this posts through Phase G's manual mark-posted path,
// where a human adds trending audio in-app - never set an audioUrl here.
export async function generateJokeCarousel(theme: string): Promise<CopyGenerationResult> {
  const system = buildJokeCarouselSystemPrompt();
  const user = buildJokeCarouselUserPrompt(theme);
  const result = await generateWithRetry<JokeCarouselResponse>(system, user, JOKE_CAROUSEL_SCHEMA, (parsed) => {
    const slides: GeneratedSlide[] = [{ label: "title card", kind: "hook", head: parsed.title }];
    for (const e of parsed.entries) {
      slides.push({ label: `entry ${e.number}`, kind: "content", head: e.quote, body: e.reframe, num: e.number });
    }
    slides.push({ label: "bonus", kind: "content", head: parsed.bonus.quote, body: parsed.bonus.reframe, numberLabel: "BONUS!" });
    // kind='content', not 'cta': reel-core's classic-style 'cta' slide
    // ignores slide.head/slide.body entirely and draws brand.ctaUrl/
    // brand.ctaLines instead (a fixed site-wide "follow us" slide, see
    // public/reel-core.js's drawSlide 'cta' branch) - a real per-item
    // closing statement + share prompt has to go through 'content' to
    // actually render. Discovered while building the shared fit-checker
    // (lib/instagram/slide-fit.ts), which measures against the SAME
    // renderer geometry this now correctly targets.
    slides.push({ label: "closing", kind: "content", head: parsed.closing.statement, body: parsed.closing.sharePrompt });
    const fitInputs: SlideFitInput[] = slides.map((s) => ({ label: s.label, renderer: "reel-core", slideKind: s.kind, head: s.head, body: s.body }));
    return { slides, fitInputs };
  });

  const parsed = result.parsed;
  const reelSlides = [
    { kind: "hook", head: parsed.title, secs: JOKE_REEL_HOOK_SECS },
    ...parsed.entries.map((e) => ({ kind: "content", num: e.number, head: e.quote, body: e.reframe, secs: JOKE_REEL_ENTRY_SECS })),
    { kind: "content", numberLabel: "BONUS!", head: parsed.bonus.quote, body: parsed.bonus.reframe, secs: JOKE_REEL_BONUS_SECS },
    { kind: "content", head: parsed.closing.statement, body: parsed.closing.sharePrompt, secs: JOKE_REEL_CLOSING_SECS },
  ];
  const renderPayload = {
    reel: { slides: reelSlides },
    brand: DEFAULT_BRAND,
    templateId: "default",
  };

  return {
    contentType: "joke",
    format: "reel",
    slides: result.slides,
    renderPayload,
    fit: result.fit,
    modelSelfCheck: parsed.selfCheck,
    deterministicIssues: result.detIssues,
    needsManualReview: result.needsManualReview,
    manualReviewReason: result.manualReviewReason,
    attempts: result.attempts,
    usage: result.usage,
    raw: parsed,
  };
}

// ---------------------------------------------------------------------------
// Education (reel)
// ---------------------------------------------------------------------------

interface EducationResponse {
  hook: { headline: string; subtext: string };
  slides: Array<{ head: string; body: string }>;
  selfCheck: SelfCheck;
}

export async function generateEducationReel(brief: string, sourceArticle: Article | null): Promise<CopyGenerationResult> {
  const system = buildEducationSystemPrompt();
  const user = buildEducationUserPrompt(brief, sourceArticle?.frontmatter.title ?? null);
  const result = await generateWithRetry<EducationResponse>(system, user, EDUCATION_SCHEMA, (parsed) => {
    const slides: GeneratedSlide[] = [
      { label: "hook", kind: "hook", head: parsed.hook.headline, body: parsed.hook.subtext },
      ...parsed.slides.map((s, i) => ({ label: `slide ${i + 2}`, kind: "content" as const, head: s.head, body: s.body, num: i + 1 })),
    ];
    // The real rendered hook text combines headline+subtext with \n into
    // ONE head field (see hookHead below, matching render_payload) -
    // GeneratedSlide keeps them as separate head/body only for the CLI
    // report, so the fit input has to recombine them to match what
    // actually gets measured/drawn.
    const hookHead = [parsed.hook.headline, parsed.hook.subtext].filter(Boolean).join("\n");
    const fitInputs: SlideFitInput[] = [
      { label: "hook", renderer: "reel-core", slideKind: "hook", head: hookHead },
      ...parsed.slides.map((s, i) => ({ label: `slide ${i + 2}`, renderer: "reel-core" as const, slideKind: "content", head: s.head, body: s.body })),
    ];
    return { slides, fitInputs };
  });

  const parsed = result.parsed;
  const hookHead = [parsed.hook.headline, parsed.hook.subtext].filter(Boolean).join("\n");
  const reelSlides = [
    { kind: "hook", head: hookHead, secs: 3 },
    ...parsed.slides.map((s, i) => ({ kind: "content", num: i + 1, head: s.head, body: s.body, secs: 3 })),
  ];
  const renderPayload = {
    reel: { slides: reelSlides },
    brand: DEFAULT_BRAND,
    templateId: "default",
  };

  return {
    contentType: "education",
    format: "reel",
    slides: result.slides,
    renderPayload,
    fit: result.fit,
    modelSelfCheck: parsed.selfCheck,
    deterministicIssues: result.detIssues,
    needsManualReview: result.needsManualReview,
    manualReviewReason: result.manualReviewReason,
    attempts: result.attempts,
    usage: result.usage,
    raw: parsed,
  };
}

// ---------------------------------------------------------------------------
// Interviews (expert-quote carousel)
//
// Interviews are published as a Football Parent ARTICLE first, then
// repurposed to social - contributor identity is never inferred from the
// article (unreliable, and misattributing a real person's credentials is
// unacceptable). It is supplied as structured input when the interview
// enters the queue - see supabase/migrations/20260720110000_content_queue_source_ref_interview.sql
// for the exact content_queue.source_ref.contributor shape this mirrors.
// F's only judgment call is WHICH lines in the article are quotable; every
// quote is verbatim from the article text passed in. F does not source
// images - contributor.photoUrl is passed straight through as the render
// module's bioSrc, and the Football Parent identity mark (images.logoImg in
// expert-quote-core.js) is intentionally left unset here - it comes from
// whatever constant asset the render step (Phase A) supplies, not a
// per-interview input.
// ---------------------------------------------------------------------------

export interface InterviewContributor {
  name: string;
  role: string; // short role/credentials, e.g. "Founder, Football DNA"
  bio: string; // the full supplied bio (article-length, ~100 words) - F shortens it for the slide
  photoUrl: string; // uploaded/hosted photo - passed through unmodified, never sourced by F
}

interface InterviewResponse {
  shortBio: string;
  hook: { headline: string; subtext: string };
  slides: Array<{ kind: "context" | "quote"; text: string }>;
  selfCheck: SelfCheck;
}

// Same cap qc-tier2.ts / ideation-extract.ts use when passing a source
// article to Claude.
const MAX_ARTICLE_CHARS = 16000;

// expert-quote-core.js's 'qa' slide type (data.qas[i]) draws a bold headline
// line (q) plus a pull-quote-styled answer (a) on ONE slide - exactly what a
// "context sentence + the quote it introduces" pair needs, without spending
// two separate slides on it the way reel-core's hook/content split would.
// A lone "context" entry is paired with the QUOTE that follows it (the
// prompt only ever writes context as a lead-in to the next quote - see
// buildInterviewSystemPrompt); a "quote" with no preceding context becomes
// its own qa slide with q left blank.
interface QaSlide {
  q: string;
  a: string;
  isQuote: boolean; // false only for the rare case context arrives with no following quote
}

function pairContextAndQuotes(slides: Array<{ kind: "context" | "quote"; text: string }>): QaSlide[] {
  const paired: QaSlide[] = [];
  let pendingContext: string | null = null;
  for (const s of slides) {
    if (s.kind === "context") {
      if (pendingContext !== null) paired.push({ q: pendingContext, a: "", isQuote: false });
      pendingContext = s.text;
    } else {
      paired.push({ q: pendingContext ?? "", a: s.text, isQuote: true });
      pendingContext = null;
    }
  }
  if (pendingContext !== null) paired.push({ q: pendingContext, a: "", isQuote: false });
  return paired;
}

export async function generateInterviewCarousel(contributor: InterviewContributor, article: Article): Promise<CopyGenerationResult> {
  const system = buildInterviewSystemPrompt();
  const truncated = article.content.length > MAX_ARTICLE_CHARS;
  const body = truncated ? article.content.slice(0, MAX_ARTICLE_CHARS) + "\n[truncated]" : article.content;
  const user = buildInterviewUserPrompt(contributor.name, contributor.role, contributor.bio, article.frontmatter.title, body);

  const result = await generateWithRetry<InterviewResponse>(system, user, INTERVIEW_SCHEMA, (parsed) => {
    const qaSlides = pairContextAndQuotes(parsed.slides);
    const slides: GeneratedSlide[] = [
      { label: "hook", kind: "hook", head: parsed.hook.headline, body: parsed.hook.subtext },
      ...qaSlides.map((s, i) => ({
        label: `slide ${i + 2}`,
        kind: (s.isQuote ? "quote" : "content") as "quote" | "content",
        head: s.q,
        body: s.a,
        attrib: s.isQuote ? `${contributor.name}, ${contributor.role}` : undefined,
      })),
    ];
    // 'bio' has no GeneratedSlide (it's the shortened supplied bio, not a
    // quote/context F selected) but is still real render_payload content
    // worth fit-checking - previously nothing checked it at all.
    const fitInputs: SlideFitInput[] = [
      { label: "hook", renderer: "expert-quote-core", slideKind: "cover-question", head: parsed.hook.headline, body: parsed.hook.subtext },
      { label: "bio", renderer: "expert-quote-core", slideKind: "bio", head: parsed.shortBio },
      ...qaSlides.map((s, i) => ({ label: `slide ${i + 2}`, renderer: "expert-quote-core" as const, slideKind: "qa", head: s.q, body: s.a })),
    ];
    return { slides, fitInputs };
  });

  const parsed = result.parsed;
  const qaSlides = pairContextAndQuotes(parsed.slides);

  const expertSlides = [{ type: "cover" as const }, { type: "bio" as const }, ...qaSlides.map((_, i) => ({ type: "qa" as const, i }))];
  const renderPayload = {
    slides: expertSlides,
    data: {
      name: contributor.name,
      role: contributor.role,
      bio: parsed.shortBio,
      coverStyle: "question" as const,
      coverQuestion: parsed.hook.headline,
      coverContext: parsed.hook.subtext,
      qas: qaSlides.map((s) => ({ q: s.q, a: s.a })),
      format: "carousel" as const,
    },
    bioSrc: contributor.photoUrl,
    // logoSrc intentionally omitted - see module comment above.
  };

  return {
    contentType: "interview",
    format: "carousel",
    slides: result.slides,
    renderPayload,
    fit: result.fit,
    modelSelfCheck: parsed.selfCheck,
    deterministicIssues: result.detIssues,
    needsManualReview: result.needsManualReview,
    manualReviewReason: result.manualReviewReason,
    attempts: result.attempts,
    usage: result.usage,
    raw: parsed,
    interviewMeta: { contributorName: contributor.name, contributorRole: contributor.role },
  };
}

// ---------------------------------------------------------------------------
// content_queue helper (mirrors qc-flow.ts's getDraftItems, filtered by
// content_type too since Phase F picks the generator by content_type)
// ---------------------------------------------------------------------------

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

export interface GetQueueItemsOptions {
  contentType?: "joke" | "education" | "interview";
  source?: string;
  status?: string;
  limit?: number;
}

export async function getQueueItemsForCopy(supabase: SupabaseClient, options: GetQueueItemsOptions = {}): Promise<ContentQueueRow[]> {
  let query = supabase
    .from("content_queue")
    .select("id, content_type, topic, status, source, source_ref, priority, created_at")
    .eq("status", options.status ?? "draft")
    .order("created_at", { ascending: true });
  if (options.contentType) query = query.eq("content_type", options.contentType);
  if (options.source) query = query.eq("source", options.source);
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw new Error("Failed to fetch content_queue items: " + error.message);
  return (data ?? []) as ContentQueueRow[];
}

// Writes the generated copy back onto the queue item's source_ref (additive,
// same pattern qc-flow.ts's writeQcResult uses for source_ref.qc) - does NOT
// change status, since Phase D's getDraftItems still expects status='draft'
// and this task's brief is dry-run only. A future wiring step can decide
// whether Phase F should move items to 'pending_qc' once Phase D is updated
// to read from there.
export async function writeCopyResult(supabase: SupabaseClient, row: ContentQueueRow, result: CopyGenerationResult): Promise<void> {
  const copyRecord = {
    generatedAt: new Date().toISOString(),
    model: MODEL,
    attempts: result.attempts,
    needsManualReview: result.needsManualReview,
    manualReviewReason: result.manualReviewReason,
    costUsd: result.usage.costUsd,
    renderPayload: result.renderPayload,
  };
  const { error } = await supabase
    .from("content_queue")
    .update({ source_ref: { ...row.source_ref, copy: copyRecord } })
    .eq("id", row.id);
  if (error) throw new Error(`Failed to write copy result for ${row.id}: ${error.message}`);
}

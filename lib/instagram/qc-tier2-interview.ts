// Tier 2 QC for INTERVIEW content specifically - split by whose words are
// being checked, because interview slides mix two categories of text that
// need different rules:
//
//   - FOOTBALL PARENT'S OWN WORDS (the hook headline/subtext and any short
//     context/framing lines F wrote to introduce a quote) - judged exactly
//     like qc-tier2.ts judges any FP social hook: overpromising, absolutes,
//     misleading framing.
//   - THE CONTRIBUTOR'S VERBATIM QUOTES - never edited, so the never-
//     promise-success / no-absolutes checks do NOT apply to them: a real
//     contributor's own opinion using a strong word is not Football Parent
//     overpromising, and QC must not flag a real person's accurate words as
//     if Football Parent wrote them. What DOES matter for quotes is whether
//     F selected/attributed them correctly - verbatim fidelity against the
//     source article, correct attribution, and that the quote is genuinely
//     the contributor's own words rather than lifted from a "Football
//     Parent perspective/takeaway" editorial commentary box (which is FP's
//     voice, not the contributor's, and would be a misattribution risk).
//
// identifiesRealChild still applies across everything (own text + quotes) -
// that's a safety check independent of whose words they are.

import Anthropic from "@anthropic-ai/sdk";
import type { Article } from "../content";

const MODEL = "claude-opus-4-8";
const INPUT_COST_PER_TOKEN = 5 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 25 / 1_000_000;
const MAX_ARTICLE_CHARS = 16000;

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (cachedClient) return cachedClient;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set (check .env.local / Vercel env)");
  }
  cachedClient = new Anthropic();
  return cachedClient;
}

export interface QuoteIssue {
  quote: string;
  issue: string;
}

export interface Tier2InterviewResult {
  hookClassification: "intriguing" | "overpromising";
  hookClassificationReason: string;
  promisesSuccess: boolean; // judged on F's OWN text only
  promisesSuccessDetail: string;
  absolutesFound: string[]; // F's OWN text only
  misleadingFraming: boolean; // is F's own framing an accurate reflection of the article?
  misleadingFramingDetail: string;
  hookStrength: "flat" | "solid" | "strong";
  hookImprovementSuggestion: string;
  verbatimFidelityIssues: QuoteIssue[]; // quotes that don't match the article exactly
  editorialBoxIssues: QuoteIssue[]; // quotes that look lifted from an FP commentary box, not the contributor's own answer
  attributionOk: boolean;
  attributionDetail: string;
  identifiesRealChild: boolean; // whole carousel: own text + quotes
  identifiesRealChildDetail: string;
  usage: { inputTokens: number; outputTokens: number; costUsd: number };
}

const SYSTEM_PROMPT = `You are the QC layer for a Football Parent (footballparent.co.uk) Instagram EXPERT-QUOTE CAROUSEL. This carousel mixes two categories of text and you must judge them by DIFFERENT rules:

1. FOOTBALL PARENT'S OWN TEXT - the hook headline/subtext and any short context/framing lines Football Parent wrote to introduce a quote. Judge this exactly as you would any Football Parent social hook:
   - hookClassification: "intriguing" (creates curiosity about something true, even if punchy) or "overpromising" (implies an outcome, guarantee, or success is likely - hard fail). One-sentence reason.
   - promisesSuccess: does FP's OWN framing (not the quotes) promise or imply academy/professional success is likely, or present the contributor's opinion as a guaranteed outcome or as Football Parent's own endorsement of a guaranteed outcome? This is the brand-critical check - be strict.
   - absolutesFound: unsupported absolute claims in FP's OWN text only ("all coaches", "every academy") - do not include anything from inside a quote here, a contributor stating their own view confidently is not an FP absolute.
   - misleadingFraming: is FP's own context/hook text factually misleading about what the article actually says?
   - hookStrength + hookImprovementSuggestion: same as any social hook review.

2. THE CONTRIBUTOR'S VERBATIM QUOTES - you will be given each quote F selected, plus the contributor's name/role and the full source article. These quotes are NEVER edited by F, so do not apply the overpromising/absolutes/never-promise-success checks to them at all - a real contributor's own words, even if confident or using a strong word like "guarantee", are their opinion, not Football Parent overpromising, and must not be flagged as if FP wrote them. Instead check:
   - verbatimFidelityIssues: for each quote, does it appear in the source article EXACTLY as given (word for word - trimming to a shorter contiguous clause of the same sentence is fine, but any reworded, paraphrased, or invented text is not)? List any quote that fails this, with a short note on what's wrong.
   - editorialBoxIssues: is each quote genuinely the contributor's own answer text, not lifted from a "Football Parent perspective" / "Football Parent takeaway" / "Football Parent asks" editorial commentary section of the article (that's Football Parent's own voice about the interview, not something the contributor said)? List any quote that appears to be lifted from an editorial/commentary box instead of the contributor's actual answer.
   - attributionOk + attributionDetail: based on the article, is the named contributor (name/role given) actually the person who said these words? Set false and explain if anything looks misattributed.

3. identifiesRealChild + identifiesRealChildDetail: applies to the WHOLE carousel (own text AND quotes combined) - does anything name, describe, or otherwise identify a specific real child in a way that could identify a real minor? (Generic references like "a child" or "young players" are fine.)

British English. Never use em dashes in your own written explanations.`;

function buildUserPrompt(ownText: string, quotes: string[], contributorName: string, contributorRole: string, article: Article): string {
  const quotesList = quotes.length ? quotes.map((q, i) => `${i + 1}. "${q}"`).join("\n") : "(no quotes)";
  const truncated = article.content.length > MAX_ARTICLE_CHARS;
  const body = truncated ? article.content.slice(0, MAX_ARTICLE_CHARS) + "\n[truncated]" : article.content;

  return `Football Parent's OWN text (hook + any context/framing lines F wrote):
"""
${ownText}
"""

Contributor: ${contributorName}${contributorRole ? `, ${contributorRole}` : ""}

Quotes F selected (check these against the source article below):
${quotesList}

Source article title: ${article.frontmatter.title}
Source article body:
"""
${body}
"""`;
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    hook_classification: { type: "string", enum: ["intriguing", "overpromising"] },
    hook_classification_reason: { type: "string" },
    promises_success: { type: "boolean" },
    promises_success_detail: { type: "string" },
    absolutes_found: { type: "array", items: { type: "string" } },
    misleading_framing: { type: "boolean" },
    misleading_framing_detail: { type: "string" },
    hook_strength: { type: "string", enum: ["flat", "solid", "strong"] },
    hook_improvement_suggestion: { type: "string" },
    verbatim_fidelity_issues: {
      type: "array",
      items: {
        type: "object",
        properties: { quote: { type: "string" }, issue: { type: "string" } },
        required: ["quote", "issue"],
        additionalProperties: false,
      },
    },
    editorial_box_issues: {
      type: "array",
      items: {
        type: "object",
        properties: { quote: { type: "string" }, issue: { type: "string" } },
        required: ["quote", "issue"],
        additionalProperties: false,
      },
    },
    attribution_ok: { type: "boolean" },
    attribution_detail: { type: "string" },
    identifies_real_child: { type: "boolean" },
    identifies_real_child_detail: { type: "string" },
  },
  required: [
    "hook_classification",
    "hook_classification_reason",
    "promises_success",
    "promises_success_detail",
    "absolutes_found",
    "misleading_framing",
    "misleading_framing_detail",
    "hook_strength",
    "hook_improvement_suggestion",
    "verbatim_fidelity_issues",
    "editorial_box_issues",
    "attribution_ok",
    "attribution_detail",
    "identifies_real_child",
    "identifies_real_child_detail",
  ],
  additionalProperties: false,
} as const;

interface RawResponse {
  hook_classification: "intriguing" | "overpromising";
  hook_classification_reason: string;
  promises_success: boolean;
  promises_success_detail: string;
  absolutes_found: string[];
  misleading_framing: boolean;
  misleading_framing_detail: string;
  hook_strength: "flat" | "solid" | "strong";
  hook_improvement_suggestion: string;
  verbatim_fidelity_issues: QuoteIssue[];
  editorial_box_issues: QuoteIssue[];
  attribution_ok: boolean;
  attribution_detail: string;
  identifies_real_child: boolean;
  identifies_real_child_detail: string;
}

export async function runTier2Interview(
  ownText: string,
  quotes: string[],
  contributorName: string,
  contributorRole: string,
  article: Article
): Promise<Tier2InterviewResult> {
  const client = getClient();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: RESPONSE_SCHEMA },
    },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(ownText, quotes, contributorName, contributorRole, article) }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Claude refused to run interview Tier 2 QC for this item");
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  if (!textBlock) throw new Error("No text content in Claude's interview Tier 2 QC response");

  const parsed = JSON.parse(textBlock.text) as RawResponse;

  const inputTokens = (response.usage.input_tokens ?? 0) + (response.usage.cache_creation_input_tokens ?? 0) + (response.usage.cache_read_input_tokens ?? 0);
  const outputTokens = response.usage.output_tokens;
  const costUsd = inputTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN;

  return {
    hookClassification: parsed.hook_classification,
    hookClassificationReason: parsed.hook_classification_reason,
    promisesSuccess: parsed.promises_success,
    promisesSuccessDetail: parsed.promises_success_detail,
    absolutesFound: parsed.absolutes_found,
    misleadingFraming: parsed.misleading_framing,
    misleadingFramingDetail: parsed.misleading_framing_detail,
    hookStrength: parsed.hook_strength,
    hookImprovementSuggestion: parsed.hook_improvement_suggestion,
    verbatimFidelityIssues: parsed.verbatim_fidelity_issues,
    editorialBoxIssues: parsed.editorial_box_issues,
    attributionOk: parsed.attribution_ok,
    attributionDetail: parsed.attribution_detail,
    identifiesRealChild: parsed.identifies_real_child,
    identifiesRealChildDetail: parsed.identifies_real_child_detail,
    usage: { inputTokens, outputTokens, costUsd },
  };
}

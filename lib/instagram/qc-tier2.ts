// Tier 2: AI-judgment checks that plain regex can't do - run once per item
// against the Anthropic API. Bundled into a SINGLE Claude call per item
// (rather than one call per check) to keep the per-item API cost down; see
// qc-flow.ts for how the result maps onto tiers 2 and 3 in the report.
//
// Rules distilled from the two article skills (see CLAUDE.md "Skills"),
// adapted for social copy per the Phase D brief's RELAX/KEEP split:
//   RELAXED for social: calm/no-hype tone, strict may/can/often hedging,
//     the "could apply to any sport" test - social needs a real hook.
//   KEPT as hard fails: never promise/imply academy or professional success
//     is likely, no invented/unverified stats, no misleading claims dressed
//     up as a hook, no content identifying a real child.

import Anthropic from "@anthropic-ai/sdk";
import type { Article } from "../content";
import type { ParsedDraft } from "./qc-parse";

const MODEL = "claude-opus-4-8";
// claude-opus-4-8 pricing: $5/1M input tokens, $25/1M output tokens.
const INPUT_COST_PER_TOKEN = 5 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 25 / 1_000_000;
// Same cap ideation-extract.ts uses when passing the source article to Claude.
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

export interface ClaimGroundingIssue {
  claim: string;
  issue: string;
  confirmedProblem: boolean;
}

export interface Tier2Result {
  hookClassification: "intriguing" | "overpromising";
  hookClassificationReason: string;
  promisesSuccess: boolean;
  promisesSuccessDetail: string;
  absolutesFound: string[];
  claimGroundingIssues: ClaimGroundingIssue[];
  misleadingFraming: boolean;
  misleadingFramingDetail: string;
  identifiesRealChild: boolean;
  identifiesRealChildDetail: string;
  hookStrength: "flat" | "solid" | "strong";
  hookImprovementSuggestion: string;
  usage: { inputTokens: number; outputTokens: number; costUsd: number };
}

const SYSTEM_PROMPT = `You are the QC layer for Football Parent (footballparent.co.uk)'s Instagram content, wearing a sceptical fact-checker's hat. You are checking DRAFTED SOCIAL COPY (a carousel/reel hook plus supporting points), not a full article - social copy is top-of-funnel and needs a real hook to earn a stranger's attention, so you must NOT apply article-tone rules like "calm, no hype" or strict may/can/often hedging. A punchy, curiosity-driving hook is good and expected.

The one line you must protect regardless of format: never promise or imply that academy or professional football success is likely, that any pathway guarantees progression, or "do X and your child will make it" style outcome-promising. Clickbait that creates CURIOSITY about a true, checkable fact is fine. Clickbait that PROMISES AN OUTCOME is a hard fail.

You will be given the drafted hook, the supporting points, and (when available) the full text of the source article the copy claims to be drawn from. Judge each of the following:

1. hookClassification: classify the hook as "intriguing" (creates curiosity about something true - allowed, even if punchy or a little provocative) or "overpromising" (implies an outcome, guarantee, or success is likely - hard fail). Give a one-sentence reason.
2. promisesSuccess: does ANY part of the copy (not just the hook) promise or imply academy/professional success is likely, or that a pathway guarantees progression? This is the brand-critical hard fail - be strict here even though you're lenient on hook tone elsewhere.
3. absolutesFound: list any genuinely unsupported absolute claims ("all coaches", "every academy", "most scouts", "academies always") with no evidence behind them. Social can state a striking true fact directly, so only list absolutes that are actually false or unsupported, not just confidently phrased.
4. claimGroundingIssues: this array is a PROBLEM LIST, not a fact-check log - only include a claim here if it is a GENUINE issue (unverifiable against the source, appears invented, or materially overstates/misrepresents what the source says). If a claim traces back to the source correctly, do NOT add an entry for it at all, even to note that it checks out - a claim with nothing wrong with it does not belong in this array. For every entry you do include, set confirmedProblem to true only if it is a real grounding problem; if on reflection the claim is actually fine, either leave it out of the array entirely or set confirmedProblem to false. If no source article text was provided, only flag claims that look implausible or invented on their face.
5. misleadingFraming: is anything in the copy factually false or misleading, dressed up as a hook? This is separate from overpromising - it covers factual inaccuracy, not outcome-promising.
6. identifiesRealChild: does the copy name, describe, or otherwise identify a specific real child, player, or team in a way that could identify a real minor? (Generic scenarios like "your child" or "a U11 player" are fine - this flags only content that reads as referring to an actual identifiable individual.)
7. hookStrength: rate the hook "flat" (generic, could apply to almost any parenting topic, no curiosity gap), "solid" (clear and on-topic but not especially attention-grabbing), or "strong" (a real curiosity gap or striking true fact that would stop a scroll). Always give hookImprovementSuggestion: if flat or solid, suggest a concretely stronger rewrite that stays within the hard rules above (no outcome promises, no invented facts); if strong, explain briefly why it already works.

British English. Never use em dashes.`;

function buildUserPrompt(parsed: ParsedDraft, article: Article | null): string {
  const pointsList = parsed.points.map((p, i) => `${i + 1}. ${p}`).join("\n") || "(no points)";
  const articleSection = article
    ? `Source article title: ${article.frontmatter.title}\nSource article body:\n"""\n${
        article.content.length > MAX_ARTICLE_CHARS ? article.content.slice(0, MAX_ARTICLE_CHARS) + "\n[truncated]" : article.content
      }\n"""`
    : "No source article text is available for this item.";

  return `Hook:\n${parsed.hook}\n\nPoints:\n${pointsList}\n\n${articleSection}`;
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    hook_classification: { type: "string", enum: ["intriguing", "overpromising"] },
    hook_classification_reason: { type: "string" },
    promises_success: { type: "boolean" },
    promises_success_detail: { type: "string" },
    absolutes_found: { type: "array", items: { type: "string" } },
    claim_grounding_issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          claim: { type: "string" },
          issue: { type: "string" },
          // Safety net for the instruction above (only real problems belong
          // in this array): if an entry slips in anyway, this says whether
          // it is a genuine grounding problem. false means "actually fine on
          // reflection" - such entries are NOT treated as failures by the
          // aggregation logic that reads this response (see qc-flow.ts /
          // copy-qc-adapter.ts), so a claim you describe as grounded/
          // verified never fails QC just for having an entry here.
          confirmed_problem: { type: "boolean" },
        },
        required: ["claim", "issue", "confirmed_problem"],
        additionalProperties: false,
      },
    },
    misleading_framing: { type: "boolean" },
    misleading_framing_detail: { type: "string" },
    identifies_real_child: { type: "boolean" },
    identifies_real_child_detail: { type: "string" },
    hook_strength: { type: "string", enum: ["flat", "solid", "strong"] },
    hook_improvement_suggestion: { type: "string" },
  },
  required: [
    "hook_classification",
    "hook_classification_reason",
    "promises_success",
    "promises_success_detail",
    "absolutes_found",
    "claim_grounding_issues",
    "misleading_framing",
    "misleading_framing_detail",
    "identifies_real_child",
    "identifies_real_child_detail",
    "hook_strength",
    "hook_improvement_suggestion",
  ],
  additionalProperties: false,
} as const;

interface RawClaimGroundingIssue {
  claim: string;
  issue: string;
  confirmed_problem: boolean;
}

interface RawTier2Response {
  hook_classification: "intriguing" | "overpromising";
  hook_classification_reason: string;
  promises_success: boolean;
  promises_success_detail: string;
  absolutes_found: string[];
  claim_grounding_issues: RawClaimGroundingIssue[];
  misleading_framing: boolean;
  misleading_framing_detail: string;
  identifies_real_child: boolean;
  identifies_real_child_detail: string;
  hook_strength: "flat" | "solid" | "strong";
  hook_improvement_suggestion: string;
}

export async function runTier2(parsed: ParsedDraft, article: Article | null): Promise<Tier2Result> {
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
    messages: [{ role: "user", content: buildUserPrompt(parsed, article) }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Claude refused to run Tier 2 QC for this item");
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  if (!textBlock) {
    throw new Error("No text content in Claude's Tier 2 QC response");
  }

  const parsedResponse = JSON.parse(textBlock.text) as RawTier2Response;

  const inputTokens = (response.usage.input_tokens ?? 0) + (response.usage.cache_creation_input_tokens ?? 0) + (response.usage.cache_read_input_tokens ?? 0);
  const outputTokens = response.usage.output_tokens;
  const costUsd = inputTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN;

  return {
    hookClassification: parsedResponse.hook_classification,
    hookClassificationReason: parsedResponse.hook_classification_reason,
    promisesSuccess: parsedResponse.promises_success,
    promisesSuccessDetail: parsedResponse.promises_success_detail,
    absolutesFound: parsedResponse.absolutes_found,
    claimGroundingIssues: parsedResponse.claim_grounding_issues.map((c) => ({ claim: c.claim, issue: c.issue, confirmedProblem: c.confirmed_problem })),
    misleadingFraming: parsedResponse.misleading_framing,
    misleadingFramingDetail: parsedResponse.misleading_framing_detail,
    identifiesRealChild: parsedResponse.identifies_real_child,
    identifiesRealChildDetail: parsedResponse.identifies_real_child_detail,
    hookStrength: parsedResponse.hook_strength,
    hookImprovementSuggestion: parsedResponse.hook_improvement_suggestion,
    usage: { inputTokens, outputTokens, costUsd },
  };
}

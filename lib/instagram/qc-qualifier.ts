// Deterministic qualifier-preservation check for education body slides - see
// batch-3 review feedback: the generation-time instruction alone did not
// reliably stop the model flattening a source's qualified stat (e.g. "a
// typical Category 1 academy: 10-12 hours") into a universal claim ("academies
// train 10-12 hours"), confirmed recurring across both Opus and Sonnet
// generation. This makes the check STRUCTURAL rather than relying on the
// model self-policing: every education body slide whose text contains a
// number/percentage/hours/age/quantity is deterministically flagged (regex,
// free, no API call) and every flagged item is then run through ONE focused
// Sonnet call per post (bundled - same cost discipline as qc-tier2.ts) that
// asks specifically whether the source attaches a qualifier the slide
// dropped or broadened. A quantity-bearing slide can never silently skip
// this check - it either has no quantity (regex doesn't fire, nothing to
// check) or it gets a real per-claim verdict.
//
// Scoped to content_type='education' only - jokes are comedic exaggeration
// (SHARED_RULES_BLOCK explicitly allows that for jokes), and interviews
// quote contributors verbatim, so a paraphrased/broadened claim can't happen
// structurally there (a different QC path - qc-tier2-interview.ts - already
// checks verbatim fidelity instead).

import Anthropic from "@anthropic-ai/sdk";
import type { Article } from "../content";
import type { GeneratedSlide } from "./copy-flow";

// claude-sonnet-5, matching qc-tier2.ts's cost-reduction switch - this is a
// narrow, single-purpose judgment call, not the kind of nuanced multi-check
// reasoning that justified keeping interviews on Opus.
const MODEL = "claude-sonnet-5";
const INPUT_COST_PER_TOKEN = 3 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 15 / 1_000_000;
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

// Digit-based (10-12 hours, 11%, U7, Category 1) plus common spelled-out
// quantity words (one million). Deliberately broad and cheap to run (regex,
// free) - a false-positive trigger only costs one extra line in a single
// bundled API call, but a false negative here means a dropped qualifier
// ships silently, which is the exact failure this check exists to close.
const QUANTITY_PATTERN =
  /\d+(\.\d+)?\s*(%|percent|hours?|hrs?|years?|yrs?)|\bU\d{1,2}\b|\bCategory\s*\d\b|\b\d+\s*(to|-)\s*\d+\b|\b\d+\b|\b(one|two|three|four|five|six|seven|eight|nine|ten|dozen|hundred|thousand|million|billion)\b/i;

export interface QuantityClaimSlide {
  label: string;
  text: string; // head + body combined - what actually gets checked
}

// Body slides only (excludes the hook) - see module comment: this check is
// scoped to education's fact-bearing body slides, matching what the user
// asked the qualifier-preservation prompt rule to cover.
export function findQuantityClaimSlides(slides: GeneratedSlide[]): QuantityClaimSlide[] {
  return slides
    .filter((s) => s.kind !== "hook")
    .map((s) => ({ label: s.label, text: [s.head, s.body].filter(Boolean).join(" ") }))
    .filter((s) => QUANTITY_PATTERN.test(s.text));
}

export interface QualifierClaimResult {
  slideLabel: string;
  claimText: string;
  qualifierDropped: boolean;
  reason: string;
}

export interface QualifierCheckResult {
  claims: QualifierClaimResult[];
  usage: { inputTokens: number; outputTokens: number; costUsd: number };
}

const SYSTEM_PROMPT = `You are checking QUANTITY-BEARING CLAIMS in drafted Football Parent (footballparent.co.uk) social copy against their source article, for exactly one accuracy issue: QUALIFIER PRESERVATION.

Source articles often attach a qualifier to a number or statistic - a specific category ("Category 1 academies"), an age band, a frequency word ("typical", "most", "some", "usually"), or a named condition. Drafted social copy sometimes drops that qualifier and restates the number as if it applies universally, to every case, with no exception. That is a factual accuracy failure: a reader will apply the number to situations the source never claimed it covers.

For each claim below, compare it against the source article text and decide: does the source attach a qualifier to this number/statistic that THIS claim text omits or broadens away?

Rules:
- qualifierDropped: true ONLY if the source demonstrably narrows the claim (to a category, age band, "typical"/"most"/"some" framing, or a stated condition) and the claim text states it without that qualifier, reading as universal/unconditional.
- qualifierDropped: false if the source states the fact universally itself (there is no narrower qualifier to preserve), OR if the claim text already carries the source's qualifier (it names the category, says "typical", "most", etc), OR if the number in the claim isn't actually the one the source qualifies (a different, unrelated figure).
- Do not invent a qualifier the source doesn't have. Only flag a claim if you can point to the specific qualifying language in the source that this claim dropped.
- Give a one-sentence reason either way, citing the specific source wording when flagging true.`;

function buildUserPrompt(claims: QuantityClaimSlide[], article: Article): string {
  const claimsList = claims.map((c) => `[${c.label}] ${c.text}`).join("\n");
  const body = article.content.length > MAX_ARTICLE_CHARS ? article.content.slice(0, MAX_ARTICLE_CHARS) + "\n[truncated]" : article.content;
  return `Claims to check:\n${claimsList}\n\nSource article title: ${article.frontmatter.title}\nSource article body:\n"""\n${body}\n"""`;
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    claims: {
      type: "array",
      items: {
        type: "object",
        properties: {
          slide_label: { type: "string" },
          qualifier_dropped: { type: "boolean" },
          reason: { type: "string" },
        },
        required: ["slide_label", "qualifier_dropped", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["claims"],
  additionalProperties: false,
} as const;

interface RawResponse {
  claims: Array<{ slide_label: string; qualifier_dropped: boolean; reason: string }>;
}

export async function runQualifierCheck(claims: QuantityClaimSlide[], article: Article): Promise<QualifierCheckResult> {
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
    messages: [{ role: "user", content: buildUserPrompt(claims, article) }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Claude refused to run the qualifier-preservation check");
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  if (!textBlock) throw new Error("No text content in the qualifier-check response");
  const parsed = JSON.parse(textBlock.text) as RawResponse;

  const byLabel = new Map(claims.map((c) => [c.label, c.text]));
  const claimResults: QualifierClaimResult[] = parsed.claims.map((c) => ({
    slideLabel: c.slide_label,
    claimText: byLabel.get(c.slide_label) ?? "",
    qualifierDropped: c.qualifier_dropped,
    reason: c.reason,
  }));

  const inputTokens = (response.usage.input_tokens ?? 0) + (response.usage.cache_creation_input_tokens ?? 0) + (response.usage.cache_read_input_tokens ?? 0);
  const outputTokens = response.usage.output_tokens;
  const costUsd = inputTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN;

  return { claims: claimResults, usage: { inputTokens, outputTokens, costUsd } };
}

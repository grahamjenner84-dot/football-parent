import Anthropic from "@anthropic-ai/sdk";
import type { Opportunity } from "./ideation-pipeline";
import type { Article } from "../content";

export interface CarouselExtraction {
  hook: string;
  points: string[];
  grounded: boolean;
}

const MODEL = "claude-opus-4-8";
// Football Parent guides run a few thousand words at most - this cap is a
// cost/context guardrail, not expected to bite in practice.
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

const SYSTEM_PROMPT = `You are drafting the factual brief for an Instagram education carousel for Football Parent (footballparent.co.uk), a UK youth football / academy pathway parenting account.

You will be given: a Search Console opportunity (the query/queries people are searching that led to this page, and why it was flagged), and the full body of the article that already ranks for it. Your job is to pull out the specific answer to that query plus supporting points, NOT a generic summary of the article.

Rules:
- Every point must be directly supported by the article text provided. Never invent a fact, statistic, or claim that isn't in the article. If the article doesn't clearly answer the target query, say so via "grounded": false rather than inventing an answer.
- Write 2-3 points. Each should be a single carousel-slide-worthy statement - specific, concrete, and quotable, not a vague teaser.
- Never use em dashes (—). Use commas, colons, or restructure the sentence.
- Never use "badge" framing cliches (e.g. "without the badge", "earning your badge") - it reads as AI filler.
- The hook is the first slide: one sentence that states the direct answer to the target query, written for a parent scrolling Instagram, not for search engines.
- Keep it factual and specific to what UK football parents actually need to know (academy pathways, trials, costs, age groups, categories) - avoid generic motivational language.`;

function buildUserPrompt(opportunity: Opportunity, article: Article): string {
  const queryList = opportunity.queries
    .map((q) => `- "${q.query}" (${q.impressions} impressions${q.position !== null ? `, position ${q.position}` : ""})`)
    .join("\n");

  const truncated = article.content.length > MAX_ARTICLE_CHARS;
  const body = truncated ? article.content.slice(0, MAX_ARTICLE_CHARS) : article.content;

  return `Opportunity type: ${opportunity.dominantType}
Why this page was flagged: ${opportunity.rationale}

Queries driving this opportunity:
${queryList}

Article title: ${article.frontmatter.title}
Article description: ${article.frontmatter.description}

Article body (Markdown/MDX)${truncated ? " [truncated]" : ""}:
"""
${body}
"""

Extract the carousel brief for the top query above.`;
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    hook: { type: "string" },
    points: {
      type: "array",
      items: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
        additionalProperties: false,
      },
    },
    grounded: { type: "boolean" },
  },
  required: ["hook", "points", "grounded"],
  additionalProperties: false,
} as const;

export async function extractCarouselPoints(opportunity: Opportunity, article: Article): Promise<CarouselExtraction> {
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
    messages: [{ role: "user", content: buildUserPrompt(opportunity, article) }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error(`Claude refused to extract points for ${opportunity.pathname}`);
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  if (!textBlock) {
    throw new Error(`No text content in Claude's response for ${opportunity.pathname}`);
  }

  const parsed = JSON.parse(textBlock.text) as { hook: string; points: { text: string }[]; grounded: boolean };
  return {
    hook: parsed.hook,
    points: parsed.points.map((p) => p.text),
    grounded: parsed.grounded,
  };
}

// Part three of the Junior Grassroots Hub advertising research: do LLM
// assistants actually name these sites when a parent asks the kind of
// question our content targets?
//
// The capability probe in jgh-ai-mentions.ts confirmed this account has
// DataForSEO's ai_optimization/chat_gpt/llm_responses/live endpoint (HTTP
// 200, ~$0.0009/prompt), so this asks real ChatGPT prompts with web search
// on and counts domain mentions in the answer text and in the web-search
// citations. Google AI Overviews are a separate measurement and live in
// jgh-ai-mentions.ts - an AIO citation and an LLM mention are not the same
// surface and don't move together.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/jgh-llm-mentions.ts
import fs from "node:fs";
import path from "node:path";
import { ensureEnvLoaded, REPO_ROOT, getDataForSeoCredentials, dataForSeoBaseUrl } from "../shared/env";

ensureEnvLoaded();

const EXPORT_DIR = path.join(REPO_ROOT, "seo-data", "exports");

const WATCH = ["juniorgrassrootshub.com", "teamstats.net", "footballparent.co.uk"];

// Also watch for brand-name mentions without a URL - an LLM naming
// "Junior Grassroots Hub" in prose is a mention even when it cites no link.
//
// footballparent.co.uk needs the negative lookbehind: thefootballparent.co.uk
// is a DIFFERENT, near-identically-named UK football-parent site, and a bare
// /football\s*parent/ match scored its citations as ours. Matching the
// literal domain with "the" excluded is the only reliable separator.
const BRANDS: Array<[string, RegExp]> = [
  ["juniorgrassrootshub.com", /junior\s*grassroots\s*hub/i],
  ["teamstats.net", /team\s*stats\b/i],
  ["footballparent.co.uk", /(?<!the)footballparent\.co\.uk/i],
];

const PROMPTS = [
  "What are the best websites for UK grassroots junior football parents?",
  "Where can I find my child's junior football league table and fixtures in the UK?",
  "How do I find a grassroots football club for my 8 year old in the UK?",
  "Which UK websites explain football academy categories 1 to 4?",
  "What should UK parents know before their child attends a football academy trial?",
  "What are the best apps or websites for running a grassroots youth football team in the UK?",
  "Where can I find a directory of junior football leagues and clubs in England?",
  "What size football and shin pads should my 7 year old use for football?",
];

// gpt-4o-mini silently ignores web_search (the response comes back with
// web_search: false), so it answers from a 2023 training cutoff and can't
// know these sites exist - useless for a mentions test. The models endpoint
// lists gpt-5.5 as web_search_supported, which is much closer to what a
// parent typing this into ChatGPT today actually gets.
const MODEL = "gpt-5.5";

type LlmResult = {
  prompt: string;
  answer: string;
  citedUrls: string[];
  mentions: Record<string, { inText: boolean; inCitations: boolean }>;
  error?: string;
};

async function askLlm(prompt: string): Promise<{ answer: string; citedUrls: string[]; cost: number; error?: string }> {
  const { username, password } = getDataForSeoCredentials();
  const auth = Buffer.from(`${username}:${password}`).toString("base64");
  const url = `${dataForSeoBaseUrl("live")}/ai_optimization/chat_gpt/llm_responses/live`.replace(/([^:])\/\/+/g, "$1/");
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify([{ user_prompt: prompt, model_name: MODEL, web_search: true }]),
  });
  const text = await res.text();
  if (!res.ok) return { answer: "", citedUrls: [], cost: 0, error: `HTTP ${res.status}: ${text.slice(0, 300)}` };

  let json: {
    cost?: number;
    tasks?: Array<{
      status_code?: number;
      status_message?: string;
      result?: Array<{
        items?: Array<{
          sections?: Array<{ text?: string; annotations?: Array<{ url?: string; title?: string }> }>;
        }>;
      }>;
    }>;
  };
  try {
    json = JSON.parse(text);
  } catch {
    return { answer: "", citedUrls: [], cost: 0, error: "malformed_json" };
  }

  const task = json.tasks?.[0];
  if (task?.status_code !== 20000) {
    return { answer: "", citedUrls: [], cost: json.cost ?? 0, error: `task ${task?.status_code}: ${task?.status_message}` };
  }

  const sections = task.result?.[0]?.items?.flatMap((i) => i.sections ?? []) ?? [];
  const answer = sections.map((s) => s.text ?? "").join("\n").trim();
  const citedUrls = [
    ...new Set(sections.flatMap((s) => (s.annotations ?? []).map((a) => a.url ?? "")).filter(Boolean)),
  ];
  return { answer, citedUrls, cost: json.cost ?? 0 };
}

function hostOf(u: string): string | null {
  try {
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

async function main() {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });

  const liveReady =
    process.env.DATAFORSEO_ENV === "live" &&
    process.env.DATAFORSEO_ALLOW_LIVE === "true" &&
    process.env.LIVE_CONFIRM === "yes";
  console.log(`Plan: ${PROMPTS.length} ChatGPT (${MODEL}, web_search on) prompts via ai_optimization. Rough estimated cost: ~$0.01.`);
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set.");
    return;
  }

  const results: LlmResult[] = [];
  let totalCost = 0;

  for (const prompt of PROMPTS) {
    const { answer, citedUrls, cost, error } = await askLlm(prompt);
    totalCost += cost;
    console.log(`\n\n======================================================`);
    console.log(`PROMPT: ${prompt}`);
    if (error) {
      console.log(`  ERROR: ${error}`);
      results.push({ prompt, answer: "", citedUrls: [], mentions: {}, error });
      continue;
    }

    const hosts = new Set(citedUrls.map(hostOf).filter((h): h is string => !!h));
    const mentions: Record<string, { inText: boolean; inCitations: boolean }> = {};
    for (const w of WATCH) {
      const brand = BRANDS.find(([d]) => d === w)?.[1];
      // Only the brand regex decides inText. A plain
      // answer.includes("footballparent.co.uk") also matches
      // "thefootballparent.co.uk" as a substring, which scored the lookalike
      // competitor's citations as ours - see the BRANDS comment.
      mentions[w] = {
        inText: brand ? brand.test(answer) : answer.toLowerCase().includes(w),
        inCitations: hosts.has(w),
      };
    }

    for (const w of WATCH) {
      const m = mentions[w];
      const flag = m.inText || m.inCitations ? "MENTIONED" : "no mention";
      console.log(`  ${w.padEnd(26)} ${flag}${m.inText ? " [named in answer]" : ""}${m.inCitations ? " [cited as source]" : ""}`);
    }
    console.log(`  sources cited (${hosts.size}): ${[...hosts].join(", ") || "(none)"}`);
    // Pull the sentence around any mention so "what for" is answerable, not
    // just "yes/no".
    for (const w of WATCH) {
      if (!mentions[w].inText) continue;
      const brand = BRANDS.find(([d]) => d === w)?.[1];
      const sentences = answer.split(/(?<=[.!?])\s+/);
      const hit = sentences.find((s) => s.toLowerCase().includes(w) || (brand && brand.test(s)));
      if (hit) console.log(`  >> context for ${w}: "${hit.replace(/\s+/g, " ").trim().slice(0, 300)}"`);
    }
    console.log(`  --- answer (first 700 chars) ---`);
    console.log(`  ${answer.replace(/\n+/g, "\n  ").slice(0, 700)}`);

    results.push({ prompt, answer, citedUrls, mentions });
  }

  console.log(`\n\n=============== TALLY across ${PROMPTS.length} prompts ===============`);
  for (const w of WATCH) {
    const named = results.filter((r) => r.mentions[w]?.inText).length;
    const cited = results.filter((r) => r.mentions[w]?.inCitations).length;
    console.log(`  ${w.padEnd(26)} named in answer: ${named}/${PROMPTS.length}   cited as source: ${cited}/${PROMPTS.length}`);
  }
  // Who *does* own this answer space, if not us or them.
  const domainTally = new Map<string, number>();
  for (const r of results) {
    for (const h of new Set(r.citedUrls.map(hostOf).filter((x): x is string => !!x))) {
      domainTally.set(h, (domainTally.get(h) ?? 0) + 1);
    }
  }
  console.log(`\n  Most-cited domains across all prompts:`);
  for (const [d, n] of [...domainTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`    ${String(n).padStart(2)}x  ${d}`);
  }

  const outPath = path.join(EXPORT_DIR, "jgh-llm-mentions.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nWritten to ${path.relative(REPO_ROOT, outPath).replace(/\\/g, "/")}`);
  console.log(`Total actual API-reported cost: $${totalCost.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

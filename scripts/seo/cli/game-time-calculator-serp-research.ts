// SERP feature research for the planned equal playing time calculator page
// (game-time-calculator-plan.md, 2026-10-04). Companion to
// game-time-calculator-term-research.ts, which found the volume; this pulls
// what Google actually shows for each term with volume - the AI Overview
// (present or not, and who it cites), People Also Ask questions, related
// searches, any featured snippet, and the top organic results - so the
// page's H2s and FAQs can cover every question Google already asks, and so
// we know which sources the AI Overview is built from.
//
// One request per keyword (SERP pricing is per request and scales with
// depth, see endpoints/serp.ts). Depth 30 is used deliberately: the 28 Sept
// SERP pulls for the head terms were made at depth 30, so the same request
// hashes hit the 30-day cache and cost nothing; only the terms never pulled
// before are charged (about $0.006 each at this depth).
//
// Writes a markdown report to seo-data/exports/ for the page build.
//
// SAFETY: same three-factor live gate as the other research scripts -
// DATAFORSEO_ENV=live and DATAFORSEO_ALLOW_LIVE=true in .env.local, plus
// LIVE_CONFIRM=yes passed inline for this invocation, on top of
// confirmLive:true in code, set here only because Graham approved this
// specific request in-session on 2026-10-04.
// Run:
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/game-time-calculator-serp-research.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { migrate } from "../database/migrate";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { extractSerpFeatures, type SerpItem } from "../dataforseo/serp-features";
import { ensureEnvLoaded } from "../shared/env";

const WORKFLOW = "game-time-calculator-serp-research";
const DEPTH = 30;

// Every phrasing that showed UK volume in the term research, biggest first.
const QUERIES: Array<{ keyword: string; volume: number }> = [
  { keyword: "playing time calculator", volume: 260 },
  { keyword: "equal playing time calculator", volume: 210 },
  { keyword: "equal game time calculator", volume: 140 },
  { keyword: "equal game time", volume: 50 },
  { keyword: "equal playing time", volume: 30 },
  { keyword: "fair game time calculator", volume: 20 },
  { keyword: "game time calculator football", volume: 20 },
  { keyword: "football game time calculator", volume: 20 },
  { keyword: "fair game time", volume: 10 },
  { keyword: "football substitution calculator", volume: 10 },
  { keyword: "how to work out equal playing time", volume: 10 },
  { keyword: "equal playing time app", volume: 10 },
];

type OrganicItem = SerpItem & {
  rank_group?: number;
  rank_absolute?: number;
  domain?: string;
  url?: string;
  description?: string;
};

type AiOverviewElement = SerpItem & { markdown?: string; title?: string };

function trim(text: string | undefined, max: number): string {
  if (!text) return "";
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function aiOverviewText(ai: SerpItem | undefined): string {
  if (!ai) return "";
  const own = (ai as AiOverviewElement).markdown ?? ai.text;
  if (own) return own;
  return ((ai.items ?? []) as AiOverviewElement[])
    .filter((it): it is AiOverviewElement => typeof it !== "string")
    .map((it) => it.markdown ?? it.text ?? "")
    .filter(Boolean)
    .join("\n");
}

function paaAnswer(sub: SerpItem): string {
  const expanded = (sub.expanded_element ?? []) as OrganicItem[];
  const first = expanded[0];
  if (!first) return "";
  const text = (first as AiOverviewElement).markdown ?? first.description ?? first.text ?? "";
  const source = first.domain ? ` [${first.domain}]` : "";
  return `${trim(text, 220)}${source}`;
}

async function main() {
  ensureEnvLoaded(); // loads DATAFORSEO_ENV/DATAFORSEO_ALLOW_LIVE from .env.local before the gate check below
  migrate();

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  const report: string[] = [
    "# Game time calculator: SERP features (UK, desktop)",
    "",
    `Pulled ${new Date().toISOString().slice(0, 10)} by scripts/seo/cli/game-time-calculator-serp-research.ts at depth ${DEPTH}. Cache hits are the 28 Sept / 19 Sept SERPs; the rest are live.`,
    "",
  ];
  const allPaa = new Map<string, string[]>(); // question -> queries that show it
  const allRelated = new Map<string, string[]>();
  let spend = 0;

  for (const { keyword, volume } of QUERIES) {
    const r = await googleOrganicSerp(keyword, { workflow: WORKFLOW, depth: DEPTH, environment: "live", confirmLive: true });
    spend += r.cost ?? 0;
    const items = ((r.data?.tasks?.[0]?.result?.[0] as { items?: SerpItem[] } | undefined)?.items ?? []) as OrganicItem[];
    const features = extractSerpFeatures(items);
    const organic = items.filter((it) => it.type === "organic");
    const snippet = items.find((it) => it.type === "featured_snippet") as OrganicItem | undefined;
    const types = [...new Set(items.map((it) => it.type))];
    const aiRefs = (features.aiOverview?.references ?? []).map((ref) => ref.domain?.replace(/^www\./, "") ?? ref.url ?? "?");

    const lines: string[] = [];
    lines.push(`## ${keyword} (${volume}/mo)`, "");
    lines.push(`Call: ${r.cacheStatus}, cost $${(r.cost ?? 0).toFixed(4)}${r.error ? `, error ${r.error}` : ""}. SERP item types: ${types.join(", ")}.`, "");

    lines.push(`**AI Overview:** ${features.aiOverview ? "present" : "none"}`);
    if (features.aiOverview) {
      lines.push("");
      lines.push(`Cites: ${aiRefs.length ? [...new Set(aiRefs)].join(", ") : "(no references returned)"}`);
      lines.push("");
      lines.push("> " + trim(aiOverviewText(features.aiOverview), 900).replace(/\n/g, "\n> "));
    }
    lines.push("");

    if (snippet) {
      lines.push(`**Featured snippet:** ${snippet.domain ?? ""} - ${trim(snippet.title, 120)}`, "", `> ${trim(snippet.description, 400)}`, "");
    }

    const paaSubItems = ((items.find((it) => it.type === "people_also_ask")?.items ?? []) as SerpItem[]).filter((q) => typeof q !== "string");
    lines.push(`**People also ask (${features.paaQuestions.length}):**`, "");
    for (const sub of paaSubItems) {
      if (!sub.title) continue;
      const answer = paaAnswer(sub);
      lines.push(`- ${sub.title}${answer ? `\n  - ${answer}` : ""}`);
      allPaa.set(sub.title, [...(allPaa.get(sub.title) ?? []), keyword]);
    }
    if (!paaSubItems.length) lines.push("- (none)");
    lines.push("");

    lines.push(`**Related searches (${features.relatedSearches.length}):** ${features.relatedSearches.join("; ") || "(none)"}`, "");
    for (const rel of features.relatedSearches) allRelated.set(rel, [...(allRelated.get(rel) ?? []), keyword]);

    lines.push("**Top organic:**", "");
    for (const it of organic.slice(0, 10)) {
      lines.push(`${it.rank_group ?? "?"}. ${it.domain ?? ""} - ${trim(it.title, 110)}`);
    }
    const ours = organic.find((it) => (it.domain ?? "").includes("footballparent"));
    lines.push("", ours ? `footballparent.co.uk ranks #${ours.rank_group} (${ours.url})` : `footballparent.co.uk: not in top ${DEPTH}`, "");

    report.push(...lines);
    console.log(lines.join("\n"));
  }

  report.push("## All People Also Ask questions, by how many terms show them", "");
  for (const [q, kws] of [...allPaa.entries()].sort((a, b) => b[1].length - a[1].length)) report.push(`- (${kws.length}) ${q}`);
  report.push("", "## All related searches, by how many terms show them", "");
  for (const [q, kws] of [...allRelated.entries()].sort((a, b) => b[1].length - a[1].length)) report.push(`- (${kws.length}) ${q}`);
  report.push("", `Total spend this run: $${spend.toFixed(4)}`, "");

  mkdirSync("seo-data/exports", { recursive: true });
  const out = `seo-data/exports/game-time-calculator-serp-research-${new Date().toISOString().slice(0, 10)}.md`;
  writeFileSync(out, report.join("\n"), "utf8");
  console.log(`\nReport written to ${out}`);
  console.log(`Total spend: $${spend.toFixed(4)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

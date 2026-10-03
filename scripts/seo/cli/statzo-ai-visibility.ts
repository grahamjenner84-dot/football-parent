// How Statzo (statzoapp.com) shows up in AI answers, vs Football Parent:
//  1. Google AI Overviews (incl. PAA expanded overviews) on stats/app
//     queries - every source cited, which Statzo URL gets cited, and whether
//     the overview text names Statzo even without citing it.
//  2. ChatGPT (gpt-5.5, web search on) via DataForSEO ai_optimization - same
//     question asked the way a parent or coach would.
// Graham noticed Statzo in AI Overviews "quite often"; this measures where
// and works out which of its pages/listings the citations actually come from.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/statzo-ai-visibility.ts
import fs from "node:fs";
import path from "node:path";
import { migrate } from "../database/migrate";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { ensureEnvLoaded, REPO_ROOT, getDataForSeoCredentials, dataForSeoBaseUrl } from "../shared/env";

ensureEnvLoaded();

type Ref = { url?: string; domain?: string; title?: string };
type Node = { type?: string; text?: string; title?: string; references?: Ref[]; items?: Array<Node | string>; expanded_element?: Node[] };

const SERP_QUERIES = [
  "football stats app",
  "football stats tracker",
  "best football stats app",
  "grassroots football stats app",
  "grassroots football app",
  "best grassroots football app",
  "track my child's football stats",
  "app to track my child's football",
  "football stats app for parents",
  "football stats tracker for parents",
  "kids football stats app",
  "how to track football stats",
  "how to track your football stats",
  "football stats app for coaches",
  "football stats app for grassroots players",
  "football player stats tracker",
  "app to track football stats",
  "football match stats app",
  "is there a free app to track football stats",
  "best app for tracking my son's football stats",
];

const PROMPTS = [
  "What's the best app to track my child's grassroots football stats in the UK?",
  "Is there an app where I can log my son's goals and assists for his junior football team?",
  "What's the best football stats app for a grassroots coach running an under 10s team?",
  "How can I track my football stats as a grassroots player?",
  "What are the best grassroots football apps in the UK?",
  "Recommend a football stats tracker app for parents",
];

const MODEL = "gpt-5.5";
const STATZO = /statzo/i;
// thefootballparent.co.uk is a different site - see jgh-llm-mentions.ts.
const FP = /(?<!the)footballparent\.co\.uk/i;

function walk(n: Node | string | undefined, texts: string[], refs: Ref[]) {
  if (!n || typeof n === "string") return;
  if (n.text) texts.push(n.text);
  for (const r of n.references ?? []) refs.push(r);
  for (const c of n.items ?? []) walk(c, texts, refs);
  for (const c of n.expanded_element ?? []) walk(c, texts, refs);
}

function hostOf(u?: string): string {
  try {
    return new URL(u ?? "").hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

async function askLlm(prompt: string) {
  const { username, password } = getDataForSeoCredentials();
  const auth = Buffer.from(`${username}:${password}`).toString("base64");
  const url = `${dataForSeoBaseUrl("live")}/ai_optimization/chat_gpt/llm_responses/live`.replace(/([^:])\/\/+/g, "$1/");
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify([{ user_prompt: prompt, model_name: MODEL, web_search: true }]),
  });
  const json = (await res.json()) as any;
  const task = json.tasks?.[0];
  if (task?.status_code !== 20000) {
    return { answer: "", cited: [] as string[], cost: json.cost ?? 0, error: `${task?.status_code} ${task?.status_message}` };
  }
  const sections = (task.result?.[0]?.items ?? []).flatMap((i: any) => i.sections ?? []);
  const answer: string = sections.map((s: any) => s.text ?? "").join("\n");
  const cited = [...new Set<string>(sections.flatMap((s: any) => (s.annotations ?? []).map((a: any) => a.url)).filter(Boolean))];
  return { answer, cited, cost: json.cost ?? 0, error: undefined as string | undefined };
}

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }
  let totalCost = 0;
  const out: { aio: unknown[]; llm: unknown[] } = { aio: [], llm: [] };
  const aioDomainTally = new Map<string, number>();
  const statzoUrlTally = new Map<string, number>();
  let aioCount = 0;
  let statzoCited = 0;
  let statzoNamed = 0;
  let fpCited = 0;

  console.log("########## GOOGLE AI OVERVIEWS ##########");
  for (const q of SERP_QUERIES) {
    const r = await googleOrganicSerp(q, { workflow: "statzo-ai-visibility", environment: "live", confirmLive: true, depth: 20 });
    totalCost += r.cost ?? 0;
    const items = ((r.data as any)?.tasks?.[0]?.result?.[0]?.items ?? []) as Node[];
    const texts: string[] = [];
    const refs: Ref[] = [];
    const aio = items.find((i) => i.type === "ai_overview");
    if (aio) walk(aio, texts, refs);

    // PAA questions that expand into their own AI overview
    const paaHits: Array<{ q: string; urls: string[]; named: boolean }> = [];
    for (const p of items.filter((i) => i.type === "people_also_ask")) {
      for (const sub of (p.items ?? []) as Node[]) {
        const t: string[] = [];
        const rr: Ref[] = [];
        for (const e of sub.expanded_element ?? []) walk(e, t, rr);
        const urls = rr.map((x) => x.url ?? "").filter((u) => STATZO.test(u));
        const named = t.some((x) => STATZO.test(x));
        if (urls.length || named) paaHits.push({ q: sub.title ?? "?", urls, named });
      }
    }

    const urls = [...new Set(refs.map((x) => x.url ?? "").filter(Boolean))];
    const text = texts.join(" ");
    const sCited = urls.filter((u) => STATZO.test(u));
    const named = STATZO.test(text);
    const fp = urls.some((u) => FP.test(u));
    if (aio) {
      aioCount++;
      if (sCited.length) statzoCited++;
      if (named) statzoNamed++;
      if (fp) fpCited++;
      for (const d of new Set(urls.map(hostOf))) aioDomainTally.set(d, (aioDomainTally.get(d) ?? 0) + 1);
      for (const u of sCited) statzoUrlTally.set(u, (statzoUrlTally.get(u) ?? 0) + 1);
    }
    console.log(`\n=== ${q} === ${aio ? `AIO: ${urls.length} sources` : "no AIO"}`);
    if (aio) {
      console.log(`  statzo cited: ${sCited.length ? sCited.join(" , ") : "no"} | named in text: ${named ? "YES" : "no"} | footballparent cited: ${fp ? "YES" : "no"}`);
      console.log(`  sources: ${urls.map(hostOf).join(", ")}`);
      if (named) {
        text
          .split(/(?<=[.!?])\s+/)
          .filter((x) => STATZO.test(x))
          .slice(0, 2)
          .forEach((x) => console.log(`  >> "${x.replace(/\s+/g, " ").slice(0, 300)}"`));
      }
    }
    for (const p of paaHits) console.log(`  PAA overview "${p.q}": statzo ${p.named ? "named" : ""} ${p.urls.join(" , ")}`);
    out.aio.push({ q, hasAio: !!aio, urls, text, statzoCited: sCited, statzoNamed: named, fpCited: fp, paaHits });
  }

  console.log(`\n\n########## CHATGPT (${MODEL}, web search) ##########`);
  const llmTally = { named: 0, cited: 0, fpNamed: 0, fpCited: 0 };
  const llmDomains = new Map<string, number>();
  for (const p of PROMPTS) {
    const r = await askLlm(p);
    totalCost += r.cost;
    console.log(`\n=== ${p} ===`);
    if (r.error) {
      console.log(`  ERROR ${r.error}`);
      continue;
    }
    const named = STATZO.test(r.answer);
    const cited = r.cited.filter((u) => STATZO.test(u));
    const fpN = FP.test(r.answer) || /football parent('s)? (coach )?app|\bprogress\b app/i.test(r.answer);
    const fpC = r.cited.some((u) => FP.test(u));
    if (named) llmTally.named++;
    if (cited.length) llmTally.cited++;
    if (fpN) llmTally.fpNamed++;
    if (fpC) llmTally.fpCited++;
    for (const d of new Set(r.cited.map(hostOf))) llmDomains.set(d, (llmDomains.get(d) ?? 0) + 1);
    console.log(`  statzo named: ${named ? "YES" : "no"} | cited: ${cited.join(" , ") || "no"} | football parent named: ${fpN ? "YES" : "no"} cited: ${fpC ? "YES" : "no"}`);
    console.log(`  sources: ${r.cited.map(hostOf).join(", ")}`);
    const apps = [...new Set((r.answer.match(/\*\*([^*]{2,40})\*\*/g) ?? []).map((x) => x.replace(/\*/g, "")))].slice(0, 14);
    if (apps.length) console.log(`  bolded names in answer: ${apps.join(" | ")}`);
    out.llm.push({ prompt: p, ...r });
  }

  console.log(`\n\n########## TALLY ##########`);
  console.log(`AI Overviews present on ${aioCount}/${SERP_QUERIES.length} queries. Statzo cited in ${statzoCited}, named in text ${statzoNamed}. Football Parent cited in ${fpCited}.`);
  console.log(`Statzo URLs cited:`);
  for (const [u, n] of [...statzoUrlTally.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${n}x ${u}`);
  console.log(`Most-cited domains in AI Overviews:`);
  for (const [d, n] of [...aioDomainTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log(`  ${String(n).padStart(2)}x ${d}`);
  console.log(`ChatGPT: Statzo named ${llmTally.named}/${PROMPTS.length}, cited ${llmTally.cited}. Football Parent named ${llmTally.fpNamed}, cited ${llmTally.fpCited}.`);
  console.log(`Most-cited domains in ChatGPT answers:`);
  for (const [d, n] of [...llmDomains.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${String(n).padStart(2)}x ${d}`);

  const file = path.join(REPO_ROOT, "seo-data", "exports", "statzo-ai-visibility.json");
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`\nWrote ${file}`);
  console.log(`Total actual API-reported cost: $${totalCost.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

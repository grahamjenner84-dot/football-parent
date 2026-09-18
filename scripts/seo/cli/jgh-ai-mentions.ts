// "Do they get AI mentions, and what for?" - part two of the Junior
// Grassroots Hub advertising research (see jgh-advertising-research.ts).
//
// "AI mentions" splits into two measurable things, and they need different
// endpoints:
//   1. Google AI Overviews citing the domain. The organic SERP advanced
//      endpoint already returns the ai_overview block with its references,
//      so this is the same call ai-overview-check.ts makes - but checked
//      against several domains at once (them, teamstats, us) instead of
//      only footballparent.co.uk, which is what the shared
//      citationSummary() helper hardcodes.
//   2. Actual LLM answers (ChatGPT etc.) naming the domain. Probed via
//      DataForSEO's ai_optimization family; the account may not have it
//      enabled, so a 404/40x there is a reportable answer, not a bug.
//
// The keyword set is deliberately mixed: their real traffic drivers (league
// names), their academy-directory pages (where they overlap with us), the
// parent-intent questions an AI assistant would plausibly answer with a
// grassroots directory, and our own head terms as a like-for-like control.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/jgh-ai-mentions.ts
import fs from "node:fs";
import path from "node:path";
import { migrate } from "../database/migrate";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { extractSerpFeatures, type SerpItem } from "../dataforseo/serp-features";
import { ensureEnvLoaded, REPO_ROOT, getDataForSeoCredentials, dataForSeoBaseUrl } from "../shared/env";

ensureEnvLoaded();

const EXPORT_DIR = path.join(REPO_ROOT, "seo-data", "exports");

const WATCH = ["juniorgrassrootshub.com", "teamstats.net", "footballparent.co.uk"];

type Group = { group: string; keywords: string[] };

const GROUPS: Group[] = [
  {
    group: "A. JGH's actual traffic drivers (league-name navigational)",
    keywords: [
      "tandridge league",
      "central warwickshire youth football league",
      "echo junior league",
      "avon youth league",
      "warrington junior football league",
    ],
  },
  {
    group: "B. JGH's academy directory pages (overlaps our academy content)",
    keywords: ["academies near me", "category 3 academies list", "cat 1 academy"],
  },
  {
    group: "C. Parent-intent questions an AI would answer with a directory",
    keywords: [
      "how to find a grassroots football team for my child",
      "how do i find a junior football league near me",
      "grassroots football leagues uk",
      "how to join a grassroots football team",
    ],
  },
  {
    group: "D. Our own head terms (control)",
    keywords: [
      "junior premier league",
      "what is grassroots football",
      "best shin pads for kids",
      "football academy categories explained",
      "football development centres explained",
    ],
  },
  {
    group: "E. TeamStats' product territory",
    keywords: ["football team management app", "sunday league football stats app", "grassroots football app"],
  },
];

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

// Probe the ai_optimization family directly - it isn't wrapped in
// endpoints/ yet because we don't know the account has it. Deliberately a
// raw call rather than a new endpoints/ module: if this comes back 404 the
// right outcome is a note in the report, not dead code left in the repo.
async function probeLlmEndpoint(endpoint: string, body: unknown): Promise<{ ok: boolean; detail: string }> {
  const { username, password } = getDataForSeoCredentials();
  const auth = Buffer.from(`${username}:${password}`).toString("base64");
  const url = `${dataForSeoBaseUrl("live")}/${endpoint}`.replace(/([^:])\/\/+/g, "$1/");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify([body]),
    });
    const text = await res.text();
    return { ok: res.ok, detail: `HTTP ${res.status} :: ${text.slice(0, 600)}` };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  migrate();
  fs.mkdirSync(EXPORT_DIR, { recursive: true });

  const allKeywords = GROUPS.flatMap((g) => g.keywords);
  const liveReady =
    process.env.DATAFORSEO_ENV === "live" &&
    process.env.DATAFORSEO_ALLOW_LIVE === "true" &&
    process.env.LIVE_CONFIRM === "yes";
  console.log(
    `Plan: ${allKeywords.length} serp/google/organic/live/advanced calls at depth 20, plus 2 ai_optimization capability probes. Rough estimated cost: ~$0.10.`
  );
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set.");
    return;
  }

  let totalCost = 0;
  const records: Array<Record<string, unknown>> = [];

  for (const g of GROUPS) {
    console.log(`\n\n=============== ${g.group} ===============`);
    for (const keyword of g.keywords) {
      const result = await googleOrganicSerp(keyword, {
        workflow: "jgh-ai-mentions",
        environment: "live",
        confirmLive: true,
        depth: 20,
      });
      totalCost += result.cost ?? 0;
      if (result.error || !result.data) {
        console.log(`\n"${keyword}" -> ERROR ${result.error}`);
        continue;
      }
      const items = ((result.data.tasks?.[0]?.result as unknown[])?.[0] as { items?: SerpItem[] } | undefined)?.items ?? [];
      const { aiOverview, paaQuestions } = extractSerpFeatures(items);

      console.log(`\n"${keyword}"`);
      if (!aiOverview) {
        console.log(`  AI Overview: NONE on this SERP`);
        records.push({ group: g.group, keyword, aiOverview: false, citedDomains: [], watchCited: {} });
      } else {
        const refs = aiOverview.references ?? [];
        const domains = [...new Set(refs.map((r) => hostOf(r.url)).filter((d): d is string => !!d))];
        const watchCited: Record<string, number | null> = {};
        for (const w of WATCH) {
          const idx = refs.findIndex((r) => hostOf(r.url) === w);
          watchCited[w] = idx === -1 ? null : idx + 1;
        }
        console.log(`  AI Overview: PRESENT, ${refs.length} references`);
        for (const w of WATCH) {
          console.log(`    ${w.padEnd(26)} ${watchCited[w] ? `CITED (source #${watchCited[w]})` : "not cited"}`);
        }
        console.log(`    all cited domains: ${domains.join(", ") || "(none)"}`);
        const snippet = (aiOverview.text ?? "").replace(/\s+/g, " ").slice(0, 260);
        if (snippet) console.log(`    AIO text opens: "${snippet}..."`);
        records.push({ group: g.group, keyword, aiOverview: true, citedDomains: domains, watchCited, refCount: refs.length });
      }
      if (paaQuestions.length) console.log(`  PAA: ${paaQuestions.slice(0, 4).join(" | ")}`);

      // Organic presence alongside the AIO, so "no AI mention" can be read
      // in context - not ranking at all is a different story to ranking but
      // not being cited.
      const organicHosts = items
        .filter((it) => it.type === "organic")
        .map((it) => hostOf((it as unknown as { url?: string }).url));
      for (const w of WATCH) {
        const pos = organicHosts.findIndex((h) => h === w);
        if (pos !== -1) console.log(`  organic: ${w} at #${pos + 1}`);
      }
    }
  }

  console.log(`\n\n=============== LLM-mention capability probes ===============`);
  const probes: Array<{ label: string; endpoint: string; body: unknown }> = [
    {
      label: "ai_optimization/chat_gpt/llm_responses/live",
      endpoint: "ai_optimization/chat_gpt/llm_responses/live",
      body: { user_prompt: "What are the best websites for UK grassroots junior football parents?", model_name: "gpt-4o-mini", web_search: true },
    },
    {
      label: "ai_optimization/ai_keyword_data/keywords_search_volume/live",
      endpoint: "ai_optimization/ai_keyword_data/keywords_search_volume/live",
      body: { keywords: ["grassroots football leagues uk"] },
    },
  ];
  const probeResults: Array<Record<string, unknown>> = [];
  for (const p of probes) {
    const r = await probeLlmEndpoint(p.endpoint, p.body);
    console.log(`\n${p.label}\n  ${r.detail}`);
    probeResults.push({ ...p, ...r });
  }

  const outPath = path.join(EXPORT_DIR, "jgh-ai-mentions.json");
  fs.writeFileSync(outPath, JSON.stringify({ records, probeResults }, null, 2));
  console.log(`\n\nWritten to ${path.relative(REPO_ROOT, outPath).replace(/\\/g, "/")}`);
  console.log(`Total actual API-reported cost (SERP calls): $${totalCost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

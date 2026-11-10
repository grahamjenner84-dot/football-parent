// Football DNA review keyword research (10 Nov 2026): live UK SERPs for the
// top 15 terms by value, desktop and mobile, depth 20, with People Also Ask
// expanded (click depth 2) and asynchronous AI Overviews loaded. For each
// SERP: who ranks, whether footballdna.co.uk holds 1-3, whether an
// independent review ranks, which features show (PAA, video, AI Overview and
// its citations, review stars) and the full PAA list.
//
// Raw responses are saved by the client as usual; this writes a combined
// raw + summary file to seo-data/exports/football-dna-serps-<date>.json.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/football-dna-serp-paa.ts
import fs from "node:fs";
import { migrate } from "../database/migrate";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const KEYWORDS = [
  "football dna",
  "football dna app",
  "football dna review",
  "football dna cost",
  "football dna price",
  "is football dna worth it",
  "football dna alternatives",
  "football dna curriculum",
  "the coaching manual",
  "england football learning",
  "football session plans",
  "football coaching app",
  "playing out from the back drills",
  "football training sessions",
  "football coaching sessions",
];
const DEVICES = ["desktop", "mobile"] as const;
// Hard stop for this run. Estimated real cost is about $0.30 (30 SERPs at
// depth 20, plus AI Overview loading and PAA clicks).
const SPEND_CAP_USD = 2;

type Item = {
  type: string;
  rank_group?: number;
  rank_absolute?: number;
  domain?: string;
  url?: string;
  title?: string;
  text?: string;
  rating?: { value?: number; votes_count?: number; rating_max?: number } | null;
  references?: Array<{ url?: string; domain?: string; title?: string }>;
  items?: Array<Item | string>;
  expanded_element?: Item[];
};

const REVIEW_SITES_NOT_INDEPENDENT = new Set(["footballdna.co.uk", "trustpilot.com", "uk.trustpilot.com", "apps.apple.com", "play.google.com"]);

function bare(d?: string) {
  return (d ?? "").replace(/^www\./, "").toLowerCase();
}

function paaQuestions(items: Item[]): string[] {
  const out: string[] = [];
  for (const block of items.filter((i) => i.type === "people_also_ask")) {
    for (const q of block.items ?? []) {
      if (typeof q !== "string" && q.title) out.push(q.title);
    }
  }
  return [...new Set(out)];
}

function paaAnswers(items: Item[]) {
  const out: Array<{ question: string; source?: string; url?: string; text?: string }> = [];
  for (const block of items.filter((i) => i.type === "people_also_ask")) {
    for (const q of block.items ?? []) {
      if (typeof q === "string" || !q.title) continue;
      const el = q.expanded_element?.[0];
      out.push({ question: q.title, source: bare(el?.domain), url: el?.url, text: el?.text?.slice(0, 300) ?? el?.title });
    }
  }
  return out;
}

async function main() {
  migrate();
  const liveReady =
    process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(`Plan: ${KEYWORDS.length} keywords x ${DEVICES.length} devices = ${KEYWORDS.length * DEVICES.length} SERPs, depth 20, PAA click depth 2, async AI Overviews. Cap $${SPEND_CAP_USD}.`);
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  let totalCost = 0;
  const summaries: unknown[] = [];
  const raw: Record<string, unknown> = {};

  outer: for (const keyword of KEYWORDS) {
    for (const device of DEVICES) {
      if (totalCost >= SPEND_CAP_USD) {
        console.log(`Spend cap reached at $${totalCost.toFixed(3)}, stopping.`);
        break outer;
      }
      const res = await googleOrganicSerp(keyword, {
        workflow: "football-dna-serp-paa",
        device,
        depth: 20,
        environment: "live",
        confirmLive: true,
        loadAsyncAiOverview: true,
        peopleAlsoAskClickDepth: 2,
      });
      totalCost += res.cost ?? 0;
      if (res.error || !res.data) {
        console.log(`${keyword} [${device}] ERROR ${res.error}`);
        continue;
      }
      const result = (res.data.tasks?.[0]?.result as Array<{ item_types?: string[]; items?: Item[] }> | undefined)?.[0];
      const items = result?.items ?? [];
      raw[`${keyword}|${device}`] = result;

      const organic = items
        .filter((i) => i.type === "organic")
        .map((i) => ({ rank: i.rank_group, domain: bare(i.domain), url: i.url, title: i.title, rating: i.rating ?? null }));
      const top3 = organic.filter((o) => (o.rank ?? 99) <= 3);
      const fdnaTop3 = top3.filter((o) => o.domain === "footballdna.co.uk").length;
      const independentReviews = organic.filter(
        (o) => !REVIEW_SITES_NOT_INDEPENDENT.has(o.domain) && /review/i.test(`${o.title} ${o.url}`)
      );
      const ai = items.find((i) => i.type === "ai_overview");
      const videos = items.filter((i) => i.type === "video" || i.type === "short_videos");
      const summary = {
        keyword,
        device,
        itemTypes: result?.item_types ?? [],
        organic,
        footballdnaTop3Count: fdnaTop3,
        footballdnaRanks: organic.filter((o) => o.domain === "footballdna.co.uk").map((o) => o.rank),
        independentReviews,
        reviewStars: organic.filter((o) => o.rating?.value).map((o) => ({ rank: o.rank, domain: o.domain, rating: o.rating })),
        aiOverview: ai
          ? { text: (ai.text ?? (ai.items ?? []).map((x) => (typeof x === "string" ? x : x.text ?? "")).join(" ")).slice(0, 1200), citations: (ai.references ?? []).map((r) => ({ domain: bare(r.domain), url: r.url, title: r.title })) }
          : null,
        videoBlocks: videos.length,
        paa: paaQuestions(items),
        paaAnswers: paaAnswers(items),
      };
      summaries.push(summary);
      console.log(
        `${keyword} [${device}] fdnaTop3=${fdnaTop3} indepReviews=${independentReviews.length} AIO=${ai ? "yes" : "no"} PAA=${summary.paa.length} cost=$${(res.cost ?? 0).toFixed(4)}`
      );
    }
  }

  const date = new Date().toISOString().slice(0, 10);
  const out = `seo-data/exports/football-dna-serps-${date}.json`;
  fs.writeFileSync(out, JSON.stringify({ retrievedAt: new Date().toISOString(), location: "United Kingdom", depth: 20, paaClickDepth: 2, loadAsyncAiOverview: true, totalCostUsd: totalCost, summaries, raw }, null, 1));
  console.log(`\nWrote ${out}`);
  console.log(`Total actual API-reported cost: $${totalCost.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

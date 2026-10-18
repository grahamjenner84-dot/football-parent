// Domain analysis of parentsinsport.co.uk (a UK parent-in-sport blog, asked
// about by Graham 16 Oct 2026): what it ranks for, who links to it, its
// authority vs ours, and what its blog links out to (the blog category page
// plus the posts listed on it), to judge it as a link or partner prospect.
//
// Usage (after explicit user approval in-session):
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/parentsinsport-analysis.ts
import fs from "node:fs";
import { migrate } from "../database/migrate";
import { backlinksSummary, backlinksList, referringDomains, anchors, bulkRanks, domainIntersection } from "../dataforseo/endpoints/backlinks";
import { rankedKeywords, domainRankOverview } from "../dataforseo/endpoints/labs";
import { contentParsingLive } from "../dataforseo/endpoints/on_page";
import { digestContentParsing } from "../../../lib/outreach/page-digest";
import { ensureEnvLoaded } from "../shared/env";
import type { DataForSeoResult } from "../dataforseo/client";

ensureEnvLoaded();

const TARGET = "parentsinsport.co.uk";
const US = "footballparent.co.uk";
const BLOG = "https://www.parentsinsport.co.uk/category/blogs/";
const MAX_POSTS = 15;
const OUT = "seo-data/exports/parentsinsport-analysis-2026-10-16.json";

function first(r: DataForSeoResult): unknown {
  return r.data?.tasks?.[0]?.result?.[0];
}

async function main() {
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(`Plan: summary, referring domains, backlinks, anchors, bulk ranks, intersection vs ${US}, ranked keywords, rank overview, and up to ${MAX_POSTS + 1} page parses. Rough cost ~$0.40.`);
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }
  const c = { workflow: "parentsinsport-analysis", environment: "live" as const, confirmLive: true };
  let cost = 0;
  const out: Record<string, unknown> = {};
  const run = async (key: string, p: Promise<DataForSeoResult>) => {
    const r = await p;
    cost += r.cost ?? 0;
    if (r.error) console.log(`${key} failed: ${r.error}`);
    out[key] = r.data?.tasks?.[0]?.result ?? null;
    return r;
  };

  await run("summary", backlinksSummary(TARGET, c));
  await run("referringDomains", referringDomains(TARGET, { ...c, limit: 300, backlinksStatusType: "live" }));
  await run("backlinks", backlinksList(TARGET, { ...c, limit: 500, backlinksStatusType: "live" }));
  await run("anchors", anchors(TARGET, { ...c, limit: 100 }));
  await run("bulkRanks", bulkRanks([TARGET, US], c));
  await run("intersectionNotUs", domainIntersection([TARGET], { ...c, limit: 300, excludeTargets: [US] }));
  await run("rankedKeywords", rankedKeywords(TARGET, { ...c, limit: 1000, cacheFamily: "competitor_rankings" }));
  await run("rankOverview", domainRankOverview(TARGET, c));
  await run("rankOverviewUs", domainRankOverview(US, c));

  const blog = await run("blogPage", contentParsingLive(BLOG, c));
  const blogDigest = digestContentParsing(BLOG, first(blog));
  const pages = [blogDigest];
  const postUrls = [
    ...new Set(
      (first(blog) ? JSON.stringify(first(blog)).match(/https?:\/\/(?:www\.)?parentsinsport\.co\.uk\/[^"\s]+/g) ?? [] : [])
        .map((u) => u.split("#")[0])
        .filter((u) => !/\/(category|tag|author|page|wp-content|wp-json|feed|cart|basket|my-account|shop|product)\b/i.test(u) && u.replace(/\/$/, "").split("/").length > 3)
    ),
  ].slice(0, MAX_POSTS);
  console.log(`blog post candidates: ${postUrls.length}`);
  for (const url of postUrls) {
    const r = await run(`page:${url}`, contentParsingLive(url, c));
    pages.push(digestContentParsing(url, first(r)));
  }
  out.pageDigests = pages.map((p) => ({ url: p.url, ok: p.ok, problem: p.problem, title: p.title, wordCount: p.wordCount, externalLinks: p.externalLinks, linksToUs: p.linksToUs, emails: p.emails }));
  for (const k of Object.keys(out)) if (k.startsWith("page:") || k === "blogPage") delete out[k];

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`cost=$${cost.toFixed(4)} -> ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

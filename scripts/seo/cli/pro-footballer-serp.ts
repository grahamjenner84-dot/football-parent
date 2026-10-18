// Live SERP check for /football-development/how-to-become-a-professional-footballer
// (2026-10-19). The page sits at position 7-11 on its main queries with a
// 0.5% CTR, and it is a link target in the Football DNA mutual-promotion
// ask. This shows what sits above it on each query: AI Overview (and whether
// it cites us), videos, PAA, featured snippet, and the organic order, on
// mobile and desktop, so we know whether a ranking gain would turn into clicks.
//
// SAFETY: same three-factor live gate as the other research scripts -
// DATAFORSEO_ENV=live and DATAFORSEO_ALLOW_LIVE=true in .env.local, plus
// LIVE_CONFIRM=yes passed inline, on top of confirmLive:true in code, set
// here because Graham approved this pull in-session on 2026-10-19.
// Run:
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/pro-footballer-serp.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { migrate } from "../database/migrate";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { extractSerpFeatures, type SerpItem } from "../dataforseo/serp-features";
import { ensureEnvLoaded } from "../shared/env";

const WORKFLOW = "pro-footballer-serp";
const DEPTH = 20;
const QUERIES = [
  "how to become a footballer",
  "how to become a professional footballer at 16",
  "how to become a footballer without academy",
  "how to become a professional footballer",
  "how to become a pro footballer",
];
const DEVICES = ["mobile", "desktop"] as const;

type Item = SerpItem & { rank_group?: number; rank_absolute?: number; domain?: string; url?: string; title?: string };

function trim(text: string | undefined, max: number): string {
  if (!text) return "";
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

async function main() {
  ensureEnvLoaded();
  migrate();
  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  const report: string[] = ["# How to become a footballer: live SERPs (UK)", "", `Pulled ${new Date().toISOString().slice(0, 10)} by scripts/seo/cli/pro-footballer-serp.ts, depth ${DEPTH}, async AI Overviews loaded.`, ""];
  let spend = 0;

  for (const keyword of QUERIES) {
    for (const device of DEVICES) {
      const r = await googleOrganicSerp(keyword, { workflow: WORKFLOW, depth: DEPTH, device, environment: "live", confirmLive: true, loadAsyncAiOverview: true });
      spend += r.cost ?? 0;
      const items = ((r.data?.tasks?.[0]?.result?.[0] as { items?: SerpItem[] } | undefined)?.items ?? []) as Item[];
      const features = extractSerpFeatures(items);
      const aiRefs = [...new Set((features.aiOverview?.references ?? []).map((ref) => ref.domain?.replace(/^www\./, "") ?? ref.url ?? "?"))];
      const ours = items.find((it) => it.type === "organic" && (it.domain ?? "").includes("footballparent"));

      const lines = [`## ${keyword} (${device})`, "", `Call: ${r.cacheStatus}, cost $${(r.cost ?? 0).toFixed(4)}${r.error ? `, error ${r.error}` : ""}`, ""];
      lines.push(`**AI Overview:** ${features.aiOverview ? `present, cites ${aiRefs.join(", ") || "(none returned)"}${aiRefs.some((d) => d.includes("footballparent")) ? " - INCLUDES US" : ""}` : "none"}`);
      lines.push(`**We rank:** ${ours ? `#${ours.rank_group} organic (absolute #${ours.rank_absolute})` : `not in top ${DEPTH}`}`, "");
      lines.push("**Page order (everything above and around us):**", "");
      for (const it of items) {
        if ((it.rank_absolute ?? 99) > (ours?.rank_absolute ?? 12) + 2) break;
        const label = it.type === "organic" ? `organic #${it.rank_group} ${it.domain} - ${trim(it.title, 80)}` : `[${it.type}]${it.type === "people_also_ask" ? ` ${((it.items ?? []) as Item[]).map((q) => q.title).filter(Boolean).join(" | ")}` : it.title ? ` ${trim(it.title, 80)}` : ""}`;
        lines.push(`${it.rank_absolute}. ${label}`);
      }
      lines.push("");
      report.push(...lines);
      console.log(lines.join("\n"));
    }
  }
  report.push(`Total spend: $${spend.toFixed(4)}`, "");
  mkdirSync("seo-data/exports", { recursive: true });
  const out = `seo-data/exports/pro-footballer-serp-${new Date().toISOString().slice(0, 10)}.md`;
  writeFileSync(out, report.join("\n"), "utf8");
  console.log(`\nReport written to ${out}\nTotal spend: $${spend.toFixed(4)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

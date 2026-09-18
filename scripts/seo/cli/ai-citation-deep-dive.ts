// Follow-up to the Junior Grassroots Hub research, answering three
// challenges Graham raised that the first pass didn't settle:
//
//   1. "Are you sure they outrank us on the academy stuff?" - DataForSEO's
//      ranked_keywords put us at positions 13-28 on that cluster, but our
//      own Search Console has the same queries at 5-9. One of those is
//      wrong, and the live SERP is the tiebreak. So: print the FULL top-10
//      organic for each query, not just whether a watched domain appears.
//   2. "Who gets AI mentions on those?" - print every AI Overview source in
//      citation order, not just a yes/no for our three watched domains.
//   3. "We should be there on best shin pads for kids" - same treatment
//      across the shin-pad query set.
//
// Each query therefore reports: AI Overview sources in order, and the
// organic top 10 with our own domain flagged.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/ai-citation-deep-dive.ts
import fs from "node:fs";
import path from "node:path";
import { migrate } from "../database/migrate";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { extractSerpFeatures, type SerpItem } from "../dataforseo/serp-features";
import { ensureEnvLoaded, REPO_ROOT } from "../shared/env";

ensureEnvLoaded();

const EXPORT_DIR = path.join(REPO_ROOT, "seo-data", "exports");
const US = "footballparent.co.uk";
const THEM = "juniorgrassrootshub.com";
const LOOKALIKE = "thefootballparent.co.uk";

const GROUPS: Array<{ group: string; keywords: string[] }> = [
  {
    group: "ACADEMY CATEGORIES - the disputed head-to-head",
    keywords: [
      "football academy categories",
      "academy categories",
      "cat 3 academies",
      "cat 4 academy",
      "category 1 academies",
      "english football academy categories",
    ],
  },
  {
    group: "DEVELOPMENT CENTRES - is this actually our cluster instead?",
    keywords: [
      "football development centres",
      "development centre football",
      "chelsea development centre",
      "arsenal development centre",
    ],
  },
  {
    group: "SHIN PADS - strong ranking, zero AI citation",
    keywords: [
      "best shin pads for kids",
      "best kids shin pads",
      "best shin pads for kids football",
      "best shin guards for kids",
      "best shin pads for 6 year old",
    ],
  },
];

function hostOf(u: string | undefined): string | null {
  if (!u) return null;
  try {
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function tag(host: string | null): string {
  if (host === US) return "  <<< US";
  if (host === THEM) return "  <<< JGH";
  if (host === LOOKALIKE) return "  <<< LOOKALIKE";
  return "";
}

async function main() {
  migrate();
  fs.mkdirSync(EXPORT_DIR, { recursive: true });

  const all = GROUPS.flatMap((g) => g.keywords);
  const liveReady =
    process.env.DATAFORSEO_ENV === "live" &&
    process.env.DATAFORSEO_ALLOW_LIVE === "true" &&
    process.env.LIVE_CONFIRM === "yes";
  console.log(`Plan: ${all.length} serp/google/organic/live/advanced calls, depth 20. Rough estimated cost: ~$0.08.`);
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set.");
    return;
  }

  let totalCost = 0;
  const out: Array<Record<string, unknown>> = [];
  const aioDomainTally = new Map<string, number>();

  for (const g of GROUPS) {
    console.log(`\n\n############################################################`);
    console.log(`## ${g.group}`);
    console.log(`############################################################`);

    for (const keyword of g.keywords) {
      const res = await googleOrganicSerp(keyword, {
        workflow: "ai-citation-deep-dive",
        environment: "live",
        confirmLive: true,
        depth: 20,
      });
      totalCost += res.cost ?? 0;
      console.log(`\n\n"${keyword}"`);
      if (res.error || !res.data) {
        console.log(`  ERROR ${res.error}`);
        continue;
      }

      const items = ((res.data.tasks?.[0]?.result as unknown[])?.[0] as { items?: SerpItem[] } | undefined)?.items ?? [];
      const { aiOverview } = extractSerpFeatures(items);

      if (!aiOverview) {
        console.log(`  AI OVERVIEW: none on this SERP`);
      } else {
        const refs = aiOverview.references ?? [];
        console.log(`  AI OVERVIEW: present, ${refs.length} sources cited${refs.length === 0 ? " (unattributed)" : ""}`);
        refs.forEach((r, i) => {
          const h = hostOf(r.url);
          if (h) aioDomainTally.set(h, (aioDomainTally.get(h) ?? 0) + 1);
          console.log(`    ${String(i + 1).padStart(2)}. ${h ?? "?"}${tag(h)}`);
          if (r.title) console.log(`        "${r.title.slice(0, 110)}"`);
        });
      }

      const organic = items.filter((it) => it.type === "organic") as Array<SerpItem & { url?: string; title?: string }>;
      console.log(`  ORGANIC TOP 10:`);
      organic.slice(0, 10).forEach((o, i) => {
        const h = hostOf(o.url);
        console.log(`    ${String(i + 1).padStart(2)}. ${h ?? "?"}${tag(h)}`);
      });
      const usPos = organic.findIndex((o) => hostOf(o.url) === US);
      const themPos = organic.findIndex((o) => hostOf(o.url) === THEM);
      console.log(
        `  >> us: ${usPos === -1 ? "not in top 20" : `#${usPos + 1}`}   |   juniorgrassrootshub: ${themPos === -1 ? "not in top 20" : `#${themPos + 1}`}`
      );

      out.push({
        group: g.group,
        keyword,
        aioPresent: !!aiOverview,
        aioSources: (aiOverview?.references ?? []).map((r) => ({ domain: hostOf(r.url), url: r.url, title: r.title })),
        organic: organic.slice(0, 10).map((o, i) => ({ pos: i + 1, domain: hostOf(o.url), url: o.url, title: o.title })),
        usPos: usPos === -1 ? null : usPos + 1,
        themPos: themPos === -1 ? null : themPos + 1,
      });
    }
  }

  console.log(`\n\n############################################################`);
  console.log(`## Domains most often cited in these AI Overviews`);
  console.log(`############################################################`);
  for (const [d, n] of [...aioDomainTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) {
    console.log(`  ${String(n).padStart(2)}x  ${d}${tag(d)}`);
  }

  const outPath = path.join(EXPORT_DIR, "ai-citation-deep-dive.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\nWritten to ${path.relative(REPO_ROOT, outPath).replace(/\\/g, "/")}`);
  console.log(`Total actual API-reported cost: $${totalCost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

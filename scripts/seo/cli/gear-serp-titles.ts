// Title-and-format recon for the two genuinely convertible gear
// opportunities identified in the headroom analysis: "best shin pads for
// kids" (we're #13) and the wide-fit boots cluster (we're page 2-3 on the
// non-kid-qualified variants).
//
// Prints the full title of every top-10 result plus the AI Overview sources,
// because the question isn't "who beats us" - already known - but "what
// shape of page and title is Google rewarding here", which needs the actual
// titles, not just domains.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/gear-serp-titles.ts
import { migrate } from "../database/migrate";
import { googleOrganicSerp } from "../dataforseo/endpoints/serp";
import { extractSerpFeatures, type SerpItem } from "../dataforseo/serp-features";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const US = "footballparent.co.uk";

const KEYWORDS = [
  "best shin pads for kids",
  "best shin pads",
  "wide fit football boots kids",
  "wide fit football boots",
  "football boots for wide feet",
];

function host(u?: string) {
  try {
    return new URL(u!).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function main() {
  migrate();
  if (process.env.DATAFORSEO_ENV !== "live" || process.env.DATAFORSEO_ALLOW_LIVE !== "true" || process.env.LIVE_CONFIRM !== "yes") {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, LIVE_CONFIRM=yes.");
    return;
  }
  console.log(`Plan: ${KEYWORDS.length} SERP calls at depth 20. Rough estimated cost: ~$0.03.`);

  let cost = 0;
  for (const kw of KEYWORDS) {
    const r = await googleOrganicSerp(kw, { workflow: "gear-serp-titles", environment: "live", confirmLive: true, depth: 20 });
    cost += r.cost ?? 0;
    console.log(`\n\n################ "${kw}" ################`);
    if (r.error || !r.data) {
      console.log(`ERROR ${r.error}`);
      continue;
    }
    const items = ((r.data.tasks?.[0]?.result as unknown[])?.[0] as { items?: SerpItem[] })?.items ?? [];
    const { aiOverview, paaQuestions } = extractSerpFeatures(items);

    console.log(`SERP features: ${[...new Set(items.map((i) => i.type))].join(", ")}`);
    if (aiOverview) {
      const refs = aiOverview.references ?? [];
      console.log(`AI OVERVIEW (${refs.length} sources):`);
      refs.forEach((x, i) => console.log(`   ${i + 1}. ${host(x.url)}${host(x.url) === US ? "  <<< US" : ""}  |  ${(x.title ?? "").slice(0, 80)}`));
    } else {
      console.log(`AI OVERVIEW: none`);
    }

    const org = items.filter((i) => i.type === "organic") as Array<SerpItem & { url?: string; title?: string; description?: string }>;
    console.log(`\nORGANIC TOP 12 (titles are the point here):`);
    org.slice(0, 12).forEach((o, i) => {
      const h = host(o.url);
      console.log(`  ${String(i + 1).padStart(2)}. [${h}]${h === US ? " <<< US" : ""}`);
      console.log(`      "${o.title ?? ""}"`);
    });
    const usIdx = org.findIndex((o) => host(o.url) === US);
    console.log(`\n  our position: ${usIdx === -1 ? "not in top 20" : `#${usIdx + 1}`}`);
    if (paaQuestions.length) console.log(`  PAA: ${paaQuestions.slice(0, 5).join(" | ")}`);
  }
  console.log(`\n\nTotal actual API-reported cost: $${cost.toFixed(3)}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

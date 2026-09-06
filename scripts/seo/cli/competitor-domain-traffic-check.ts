// One-off advertising-research check: how much organic search traffic do
// juniorgrassrootshub.com and grassrootsfootballuk.com get vs
// footballparent.co.uk (scale), and how much of each competitor's ranked
// keyword traffic looks coach-audience-relevant (for promoting the Coach
// App there) vs parent-audience-relevant. Two Labs calls per domain:
// domain_rank_overview (cheap, aggregate etv) for scale, ranked_keywords
// (limit 200) for topical relevance classification.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/competitor-domain-traffic-check.ts
import { migrate } from "../database/migrate";
import { domainRankOverview, rankedKeywords } from "../dataforseo/endpoints/labs";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const DOMAINS = [
  { label: "footballparent.co.uk (us)", target: "footballparent.co.uk" },
  { label: "juniorgrassrootshub.com", target: "juniorgrassrootshub.com" },
  { label: "grassrootsfootballuk.com", target: "grassrootsfootballuk.com" },
];

const COMPETITOR_TARGETS = DOMAINS.slice(1);

const COACH_TERMS = [
  "coach",
  "coaching",
  "session plan",
  "training session",
  "drill",
  "grassroots club",
  "club management",
  "team management",
  "volunteer",
  "fa level",
  "coaching course",
  "coaching badge",
  "lineup",
  "line up",
  "formation",
  "substitut",
  "team sheet",
  "matchday",
  "match day",
  "club committee",
  "team app",
  "squad",
];

const PARENT_TERMS = [
  "parent",
  "boots",
  "shin pad",
  "kit",
  "academy trial",
  "trials",
  "scout",
  "development centre",
  "school",
  "sportswear",
  "birthday",
  "kids football",
  "junior football",
];

type OverviewMetrics = { organic?: { count?: number; etv?: number; pos_1?: number; pos_2_3?: number } };

function classify(keyword: string): "coach" | "parent" | "other" {
  const k = keyword.toLowerCase();
  if (COACH_TERMS.some((t) => k.includes(t))) return "coach";
  if (PARENT_TERMS.some((t) => k.includes(t))) return "parent";
  return "other";
}

async function main() {
  migrate();

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  const estimatedCost = DOMAINS.length * 0.02 + COMPETITOR_TARGETS.length * 0.03;
  console.log(
    `Plan: ${DOMAINS.length} domain_rank_overview calls + ${COMPETITOR_TARGETS.length} ranked_keywords calls (limit 200 each). Rough estimated cost: ~$${estimatedCost.toFixed(2)} (actual DataForSEO-reported cost printed below).`
  );
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  let totalCost = 0;

  console.log("\n=== Domain scale (organic traffic overview) ===");
  for (const d of DOMAINS) {
    const result = await domainRankOverview(d.target, { workflow: "competitor-domain-traffic-check", environment: "live", confirmLive: true });
    totalCost += result.cost ?? 0;
    if (result.error || !result.data) {
      console.log(`${d.label}: ERROR ${result.error}`);
      continue;
    }
    const items = (result.data.tasks?.[0]?.result as Array<{ metrics?: OverviewMetrics }> | undefined) ?? [];
    const metrics = items[0]?.metrics?.organic;
    console.log(
      `${d.label}: ranked keywords=${metrics?.count ?? "n/a"}, estimated monthly organic traffic (etv)=${metrics?.etv?.toFixed?.(0) ?? "n/a"}, #1 positions=${metrics?.pos_1 ?? "n/a"}, top-3 positions=${metrics?.pos_2_3 ?? "n/a"}`
    );
  }

  console.log("\n=== Competitor keyword relevance to the Coach App (sample of top 200 ranked keywords each) ===");
  for (const d of COMPETITOR_TARGETS) {
    const result = await rankedKeywords(d.target, {
      workflow: "competitor-domain-traffic-check",
      environment: "live",
      confirmLive: true,
      limit: 200,
      cacheFamily: "competitor_rankings",
    });
    totalCost += result.cost ?? 0;
    if (result.error || !result.data) {
      console.log(`${d.label}: ERROR ${result.error}`);
      continue;
    }
    const items =
      (result.data.tasks?.[0]?.result as
        | Array<{
            items?: Array<{
              keyword_data?: { keyword?: string; keyword_info?: { search_volume?: number } };
              ranked_serp_element?: { serp_item?: { etv?: number; rank_absolute?: number } };
            }>;
          }>
        | undefined) ?? [];
    const rows = items[0]?.items ?? [];

    const buckets: Record<"coach" | "parent" | "other", { count: number; etv: number; volume: number }> = {
      coach: { count: 0, etv: 0, volume: 0 },
      parent: { count: 0, etv: 0, volume: 0 },
      other: { count: 0, etv: 0, volume: 0 },
    };
    const coachExamples: string[] = [];

    for (const row of rows) {
      const kw = row.keyword_data?.keyword ?? "";
      const bucket = classify(kw);
      buckets[bucket].count++;
      buckets[bucket].etv += row.ranked_serp_element?.serp_item?.etv ?? 0;
      buckets[bucket].volume += row.keyword_data?.keyword_info?.search_volume ?? 0;
      if (bucket === "coach" && coachExamples.length < 15) coachExamples.push(kw);
    }

    console.log(`\n${d.label} (${rows.length} ranked keywords sampled):`);
    console.log(
      `  coach-relevant:  ${buckets.coach.count} keywords, etv≈${buckets.coach.etv.toFixed(0)}, volume sum≈${buckets.coach.volume}`
    );
    console.log(
      `  parent-relevant: ${buckets.parent.count} keywords, etv≈${buckets.parent.etv.toFixed(0)}, volume sum≈${buckets.parent.volume}`
    );
    console.log(
      `  other/unclassified: ${buckets.other.count} keywords, etv≈${buckets.other.etv.toFixed(0)}, volume sum≈${buckets.other.volume}`
    );
    console.log(`  sample coach-relevant keywords: ${coachExamples.join(" | ") || "(none in top 200)"}`);
  }

  console.log(`\nTotal actual API-reported cost: $${totalCost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

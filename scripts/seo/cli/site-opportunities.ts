// Cross-references real Google Ads search volume (already fetched once,
// live, and cached - scripts/seo/cli/live-search-volume.ts) against actual
// GSC performance (free, existing connection) to surface genuine
// "existing article, existing terms" opportunities without spending
// anything new. GSC stays the source of truth for actual performance; the
// DataForSEO volume is only used to say whether the topic has real demand
// at all.
import { migrate } from "../database/migrate";
import { getDb } from "../database/db";

type Row = {
  url: string;
  article: string | null;
  keyword: string | null;
  volume: number | null;
  impressions: number;
  clicks: number;
  avg_position: number | null;
};

function classify(r: Row): { label: string; note: string } {
  const vol = r.volume ?? 0;
  const hasVolume = r.volume !== null && r.volume > 0;

  if (!hasVolume) {
    return { label: "no measurable demand", note: "matches the pattern found on biggest-football-parent-mistakes - not worth further on-page SEO push" };
  }
  if (r.impressions === 0) {
    return { label: "STRONG OPPORTUNITY", note: `real UK demand (${vol}/mo) but zero GSC impressions - check indexing/content match` };
  }
  if (r.avg_position !== null && r.avg_position >= 11 && r.avg_position <= 20) {
    return { label: "STRIKING DISTANCE", note: `ranks #${r.avg_position.toFixed(1)} for a ${vol}/mo keyword - a push here is efficient` };
  }
  if (r.avg_position !== null && r.avg_position > 20) {
    return { label: "weak ranking, real demand", note: `ranks #${r.avg_position.toFixed(1)} for a ${vol}/mo keyword - bigger lift needed` };
  }
  return { label: "performing", note: `already ranking #${r.avg_position?.toFixed(1) ?? "n/a"} for a ${vol}/mo keyword` };
}

async function main() {
  migrate();
  const db = getDb();

  const periodRow = db
    .prepare("SELECT period_start, period_end FROM gsc_observations WHERE query != '' ORDER BY retrieved_at DESC LIMIT 1")
    .get() as { period_start: string; period_end: string } | undefined;

  if (!periodRow) {
    console.error("No GSC query-level data found - run: npx tsx scripts/seo/gsc/pull.ts existing 90");
    process.exitCode = 1;
    return;
  }

  console.log(`GSC window: ${periodRow.period_start} to ${periodRow.period_end}\n`);

  const rows = db
    .prepare(
      `SELECT p.url as url, p.article as article, k.keyword as keyword, k.volume as volume,
              COALESCE(g.impressions, 0) as impressions, COALESCE(g.clicks, 0) as clicks, g.avg_position as avg_position
       FROM pages p
       LEFT JOIN keywords k ON k.target_url = p.url
       LEFT JOIN (
         SELECT page_url,
                SUM(impressions) as impressions,
                SUM(clicks) as clicks,
                SUM(position * impressions) / NULLIF(SUM(impressions), 0) as avg_position
         FROM gsc_observations
         WHERE query != '' AND period_start = ? AND period_end = ?
         GROUP BY page_url
       ) g ON g.page_url = p.url
       WHERE k.keyword IS NOT NULL
       ORDER BY k.volume DESC`
    )
    .all(periodRow.period_start, periodRow.period_end) as Row[];

  const strong: (Row & { label: string; note: string })[] = [];
  const striking: (Row & { label: string; note: string })[] = [];
  const weak: (Row & { label: string; note: string })[] = [];
  const noDemand: (Row & { label: string; note: string })[] = [];
  const performing: (Row & { label: string; note: string })[] = [];

  for (const r of rows) {
    const c = classify(r);
    const bucket =
      c.label === "STRONG OPPORTUNITY" ? strong : c.label === "STRIKING DISTANCE" ? striking : c.label === "weak ranking, real demand" ? weak : c.label === "no measurable demand" ? noDemand : performing;
    bucket.push({ ...r, ...c });
  }

  console.log(`=== STRONG OPPORTUNITY: real demand, zero impressions (${strong.length}) ===`);
  for (const r of strong) console.log(`  ${r.volume}/mo  ${r.keyword}  ->  ${r.url}`);

  console.log(`\n=== STRIKING DISTANCE: position 11-20 for a real keyword (${striking.length}) ===`);
  for (const r of striking) console.log(`  ${r.volume}/mo  pos ${r.avg_position?.toFixed(1)}  ${r.keyword}  ->  ${r.url}`);

  console.log(`\n=== Weak ranking (position 20+) with real demand (${weak.length}) ===`);
  for (const r of weak) console.log(`  ${r.volume}/mo  pos ${r.avg_position?.toFixed(1)}  ${r.keyword}  ->  ${r.url}`);

  console.log(`\n=== Already performing reasonably (${performing.length}) ===`);
  for (const r of performing) console.log(`  ${r.volume}/mo  pos ${r.avg_position?.toFixed(1) ?? "n/a"}  imp ${r.impressions}  ${r.keyword}  ->  ${r.url}`);

  console.log(`\n=== No measurable demand for the title-derived keyword (${noDemand.length}) - not prioritised ===`);
  for (const r of noDemand) console.log(`  ${r.keyword}  ->  ${r.url}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

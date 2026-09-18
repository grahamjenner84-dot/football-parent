// Follow-up to teamgrassroots-diamondfootball-backlink-analysis.ts: pulls
// exact referring-page URLs, anchor text and dofollow status for a shortlist
// of prospects already screened as relevant from the domain_intersection
// pass, by listing each competitor's full backlink list once and filtering
// to the candidate domains (cheaper than one call per prospect).
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/teamgrassroots-diamondfootball-prospect-detail.ts
import { migrate } from "../database/migrate";
import { backlinksList } from "../dataforseo/endpoints/backlinks";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const TEAMGRASSROOTS_CANDIDATES = new Set([
  "cambridgeshirefa.com",
  "berks-bucksfa.com",
  "sported.org.uk",
  "wembleystadiumfoundation.org",
  "childrensfootballalliance.com",
  "loveadmin.com",
  "spond.com",
  "refchat.co.uk",
  "classforkids.com",
  "bespokesportsmedals.com",
  "striver.football",
  "footballfestivals.co.uk",
  "sportbirmingham.org",
  "under5s.co.uk",
]);

const DIAMONDFOOTBALL_CANDIDATES = new Set([
  "watcheverymatch.com",
  "footballcoachingshop.com",
  "wessexsports.co.uk",
  "suffolksec.co.uk",
  "psfshop.com",
]);

type BacklinkRow = { url_from?: string; domain_from?: string; anchor?: string; dofollow?: boolean; first_seen?: string; page_from_rank?: number };

async function main() {
  migrate();

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(`Plan: 2 backlinks/backlinks calls (limit 1000 each) to find exact referring pages for a ~19-domain shortlist. Rough estimated cost: ~$0.10.`);
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  let totalCost = 0;
  const common = { workflow: "teamgrassroots-diamondfootball-prospect-detail", environment: "live" as const, confirmLive: true };

  const runs: Array<{ target: string; candidates: Set<string> }> = [
    { target: "teamgrassroots.co.uk", candidates: TEAMGRASSROOTS_CANDIDATES },
    { target: "diamondfootball.com", candidates: DIAMONDFOOTBALL_CANDIDATES },
  ];

  for (const { target, candidates } of runs) {
    console.log(`\n=== ${target}: exact referring pages for shortlisted domains ===`);
    const res = await backlinksList(target, { ...common, limit: 1000, backlinksStatusType: "live" });
    totalCost += res.cost ?? 0;
    if (res.error || !res.data) {
      console.log(`ERROR: ${res.error}`);
      continue;
    }
    const items = (res.data.tasks?.[0]?.result as Array<{ items?: BacklinkRow[] }> | undefined) ?? [];
    const rows = items[0]?.items ?? [];
    console.log(`${rows.length} total backlink rows returned; filtering to ${candidates.size} shortlisted domains`);
    const found = new Set<string>();
    for (const r of rows) {
      const domain = r.domain_from;
      if (!domain || !candidates.has(domain)) continue;
      found.add(domain);
      console.log(
        `  [${domain}] url_from=${r.url_from} | anchor="${r.anchor}" | dofollow=${r.dofollow} | first_seen=${r.first_seen} | page_from_rank=${r.page_from_rank ?? "n/a"}`
      );
    }
    const missing = [...candidates].filter((d) => !found.has(d));
    if (missing.length > 0) console.log(`  NOT FOUND in top ${rows.length} rows (may be beyond limit or filtered by live status): ${missing.join(", ")}`);
  }

  console.log(`\nTotal actual API-reported cost: $${totalCost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

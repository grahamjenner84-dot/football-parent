// Two follow-ups to the 2026-09-17 backlink prospecting pass:
//   1. Check all 50 England County FA domains against teamstats.net,
//      juniorgrassrootshub.com and grassrootsfootballuk.com's live backlink
//      lists (teamgrassroots.co.uk and diamondfootball.com's domain
//      intersection dumps were already checked - only cambridgeshirefa.com
//      and berks-bucksfa.com matched, already saved).
//   2. Run the same domain_intersection (excluding footballparent.co.uk)
//      pass already done for other competitors against mingle.sport and
//      mycoachfootball.com, which previously only had a shallow
//      referring-domains scan.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/county-fa-and-appcompetitor-backlink-check.ts
import { migrate } from "../database/migrate";
import { backlinksList, domainIntersection } from "../dataforseo/endpoints/backlinks";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const US = "footballparent.co.uk";

const COUNTY_FA_DOMAINS = new Set(
  [
    "amateur-fa.com", "armyfa.com", "bedfordshirefa.com", "berks-bucksfa.com", "birminghamfa.com",
    "cambridgeshirefa.com", "cheshirefa.com", "cornwallfa.com", "cumberlandfa.com", "derbyshirefa.com",
    "devonfa.com", "dorsetfa.com", "durhamfa.com", "eastridingfa.com", "essexfa.com",
    "gloucestershirefa.com", "guernseyfa.com", "hampshirefa.com", "herefordshirefa.com", "hertfordshirefa.com",
    "huntsfa.com", "isleofmanfa.com", "jerseyfa.com", "kentfa.com", "lancashirefa.com",
    "leicestershirefa.com", "lincolnshirefa.com", "liverpoolfa.com", "londonfa.com", "manchesterfa.com",
    "middlesexfa.com", "norfolkfa.com", "northamptonshirefa.com", "northridingfa.com", "northumberlandfa.com",
    "nottinghamshirefa.com", "oxfordshirefa.com", "royalairforcefa.com", "royalnavyfa.com", "sheffieldfa.com",
    "shropshirefa.com", "somersetfa.com", "staffordshirefa.com", "suffolkfa.com", "surreyfa.com",
    "sussexfa.com", "westmorlandfa.com", "westridingfa.com", "wiltshirefa.com", "worcestershirefa.com",
  ]
);

const BACKLINK_TARGETS = ["teamstats.net", "juniorgrassrootshub.com", "grassrootsfootballuk.com"];
const APP_COMPETITORS = ["mingle.sport", "mycoachfootball.com"];

type BacklinkRow = { url_from?: string; domain_from?: string; anchor?: string; dofollow?: boolean; first_seen?: string; page_from_rank?: number };
type IntersectionRow = { target?: string; rank?: number; backlinks?: number; referring_domains?: number; backlinks_spam_score?: number };

async function main() {
  migrate();

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(
    `Plan: ${BACKLINK_TARGETS.length} backlinks/backlinks calls (limit 1000, filtered to 50 County FA domains) + ${APP_COMPETITORS.length} domain_intersection calls (vs ${US}). Rough estimated cost: ~$0.30.`
  );
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  let totalCost = 0;
  const common = { workflow: "county-fa-and-appcompetitor-backlink-check", environment: "live" as const, confirmLive: true };

  console.log(`\n=== County FA check: which of the 50 England County FA domains link to teamstats.net / juniorgrassrootshub.com / grassrootsfootballuk.com? ===`);
  for (const target of BACKLINK_TARGETS) {
    const res = await backlinksList(target, { ...common, limit: 1000, backlinksStatusType: "live" });
    totalCost += res.cost ?? 0;
    if (res.error || !res.data) {
      console.log(`[${target}] ERROR: ${res.error}`);
      continue;
    }
    const items = (res.data.tasks?.[0]?.result as Array<{ items?: BacklinkRow[] }> | undefined) ?? [];
    const rows = items[0]?.items ?? [];
    const matches = rows.filter((r) => r.domain_from && COUNTY_FA_DOMAINS.has(r.domain_from));
    console.log(`[${target}] ${rows.length} total backlink rows scanned, ${matches.length} County FA matches:`);
    for (const m of matches) {
      console.log(`  ${m.domain_from} | url_from=${m.url_from} | anchor="${m.anchor}" | dofollow=${m.dofollow} | first_seen=${m.first_seen}`);
    }
  }

  console.log(`\n=== App-competitor backlink prospects: domains linking to mingle.sport / mycoachfootball.com but not to ${US} ===`);
  for (const target of APP_COMPETITORS) {
    const intersection = await domainIntersection([target], { ...common, limit: 200, excludeTargets: [US] });
    totalCost += intersection.cost ?? 0;
    if (intersection.error || !intersection.data) {
      console.log(`[${target}] ERROR: ${intersection.error}`);
      continue;
    }
    const items =
      (intersection.data.tasks?.[0]?.result as Array<{ items?: Array<{ domain_intersection?: Record<string, IntersectionRow> }> }> | undefined) ?? [];
    const rows = items[0]?.items ?? [];
    console.log(`[${target}] ${rows.length} prospect domains found:`);
    const sorted = [...rows].sort((a, b) => (b.domain_intersection?.["1"]?.rank ?? 0) - (a.domain_intersection?.["1"]?.rank ?? 0));
    for (const r of sorted) {
      const d = r.domain_intersection?.["1"];
      console.log(
        `  ${d?.target} | rank=${d?.rank ?? "n/a"} | backlinks=${d?.backlinks ?? "n/a"} | referring_domains=${d?.referring_domains ?? "n/a"} | spam_score=${d?.backlinks_spam_score ?? "n/a"}`
      );
    }
  }

  console.log(`\nTotal actual API-reported cost: $${totalCost.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

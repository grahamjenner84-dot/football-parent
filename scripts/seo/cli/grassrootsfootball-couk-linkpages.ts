// Follow-up to grassrootsfootball-couk-domain-check.ts: the top-200
// unfiltered backlinks/backlinks/live pull was almost entirely teamstats.net
// self-links, so the genuinely valuable third-party links (fourfourtwo.com,
// mirror.co.uk, birminghammail.co.uk) never surfaced. Filtering directly to
// those domains to see the EXACT destination URL (url_to) on
// grassrootsfootball.co.uk - this determines whether a new owner's redirect
// setup would actually capture that link equity, or whether the links point
// to a specific deep path that a root-only redirect would miss.
//
// Usage (after explicit user approval in-session):
//   LIVE_CONFIRM=yes npx tsx scripts/seo/cli/grassrootsfootball-couk-linkpages.ts
import { migrate } from "../database/migrate";
import { backlinksList } from "../dataforseo/endpoints/backlinks";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const TARGET = "grassrootsfootball.co.uk";
const CANDIDATE_DOMAINS = ["fourfourtwo.com", "mirror.co.uk", "birminghammail.co.uk", "saintsweb.co.uk", "sportsister.com", "thinkfitness.net"];

type BacklinkRow = { url_from?: string; url_to?: string; domain_from?: string; anchor?: string; dofollow?: boolean; first_seen?: string };

async function main() {
  migrate();

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  console.log(`Plan: 1 backlinks/backlinks call filtered to ${CANDIDATE_DOMAINS.length} known-good domains, to get exact destination URLs. Rough estimated cost: ~$0.05.`);
  if (!liveReady) {
    console.log("Not sending - requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true, and LIVE_CONFIRM=yes all set for this invocation.");
    return;
  }

  const common = { workflow: "grassrootsfootball-couk-linkpages", environment: "live" as const, confirmLive: true };

  const filters = [["domain_from", "in", CANDIDATE_DOMAINS]];
  const res = await backlinksList(TARGET, { ...common, limit: 100, backlinksStatusType: "live", filters });
  if (res.error || !res.data) {
    console.log(`ERROR: ${res.error}`);
    console.log(`Falling back: filters may be unsupported in this shape - dumping raw error/response for inspection.`);
    console.log(JSON.stringify(res.data ?? {}, null, 1)?.slice(0, 1000));
    return;
  }
  const items = (res.data.tasks?.[0]?.result as Array<{ items?: BacklinkRow[] }> | undefined) ?? [];
  const rows = items[0]?.items ?? [];
  console.log(`${rows.length} matching rows:`);
  for (const r of rows) {
    console.log(`  [${r.domain_from}] url_from=${r.url_from} -> url_to=${r.url_to} | anchor="${r.anchor}" | dofollow=${r.dofollow} | first_seen=${r.first_seen}`);
  }

  console.log(`\nTotal actual API-reported cost: $${(res.cost ?? 0).toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

import { referringDomains } from "../dataforseo/endpoints/backlinks";
import { ensureEnvLoaded } from "../shared/env";
import { migrate } from "../database/migrate";
ensureEnvLoaded();
migrate();

const TARGETS = ["spond.com", "mingle.sport", "pitchero.com", "tacticosport.com"];

async function main() {
  for (const t of TARGETS) {
    const r = await referringDomains(t, { workflow: "competitor-directories", environment: "live", confirmLive: true, limit: 100 });
    console.log(`\n=== ${t} === cost ${r.cost} error ${r.error}`);
    if (r.error || !r.data) continue;
    const items = (r.data.tasks?.[0]?.result as Array<{ items?: Array<Record<string, unknown>> }> | undefined) ?? [];
    const rows = items[0]?.items ?? [];
    console.log(`${rows.length} referring domains found`);
    const sorted = [...rows].sort((a, b) => ((b.rank as number) ?? 0) - ((a.rank as number) ?? 0));
    for (const row of sorted.slice(0, 60)) {
      console.log(`  ${row.domain} | rank=${row.rank} | backlinks=${row.backlinks} | spam=${row.backlinks_spam_score}`);
    }
  }
}
main();

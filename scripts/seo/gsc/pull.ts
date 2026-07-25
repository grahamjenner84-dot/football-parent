// CLI entry point for GSC persistence, used by the seo-page/seo-status
// skills. Examples:
//   npx tsx scripts/seo/gsc/pull.ts existing 28
//   npx tsx scripts/seo/gsc/pull.ts page /academy-pathway/how-much-does-academy-football-cost 180
//   npx tsx scripts/seo/gsc/pull.ts site-daily 90
import { migrate } from "../database/migrate";
import { pullQueryPagePeriod, pullPageDatePeriod, pullPageHistory } from "./persist";
import { isoDate, addDays } from "./client";

async function main() {
  migrate();
  const [, , mode, ...rest] = process.argv;

  if (mode === "existing") {
    const days = Number(rest[0] ?? 90);
    const currentEnd = addDays(new Date(), -3);
    const currentStart = addDays(currentEnd, -days);
    const priorEnd = addDays(currentStart, -1);
    const priorStart = addDays(priorEnd, -days);

    const current = await pullQueryPagePeriod(isoDate(currentStart), isoDate(currentEnd));
    const prior = await pullQueryPagePeriod(isoDate(priorStart), isoDate(priorEnd));
    console.log(`Current ${days}d window (${current.periodStart}..${current.periodEnd}): ${current.rowsPersisted} query/page rows`);
    console.log(`Prior ${days}d window (${prior.periodStart}..${prior.periodEnd}): ${prior.rowsPersisted} query/page rows`);
    return;
  }

  if (mode === "page") {
    const pathname = rest[0];
    if (!pathname) {
      console.error("Usage: pull.ts page <path> [historyDays]");
      process.exitCode = 1;
      return;
    }
    const days = Number(rest[1] ?? 180);
    const result = await pullPageHistory(pathname, days);
    console.log(`Pulled ${result.rowsPersisted} query/date rows for ${result.pageUrl} (${result.periodStart}..${result.periodEnd})`);
    return;
  }

  if (mode === "site-daily") {
    const days = Number(rest[0] ?? 90);
    const currentEnd = addDays(new Date(), -3);
    const currentStart = addDays(currentEnd, -days);
    const result = await pullPageDatePeriod(isoDate(currentStart), isoDate(currentEnd));
    console.log(`Pulled ${result.rowsPersisted} page/date rows (${result.periodStart}..${result.periodEnd})`);
    return;
  }

  console.error("Usage: pull.ts <existing|page|site-daily> [args]");
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

// App store snapshot for the Coach App competitor set (2026-10-18), alongside
// coach-app-competitor-snapshot-3.ts. Two steps:
//   1. Store searches (Google Play and App Store, UK) for a handful of
//      game-time / coach-app terms, to see who ranks in-store, plus a search
//      on each competitor's name to find its app id where we don't have one.
//   2. App info for every competitor app found: Google Play gives installs
//      (range and count), rating and review count; Apple gives rating and
//      review count only (Apple publishes no download figures).
// Store figures are the stores' own, as DataForSEO reads them. Installs are
// installs, not active users.
//
// Usage (after explicit user approval in-session):
//   DATAFORSEO_ENV=live DATAFORSEO_ALLOW_LIVE=true LIVE_CONFIRM=yes npx tsx scripts/seo/cli/coach-app-store-snapshot.ts
import fs from "node:fs";
import { migrate } from "../database/migrate";
import { appleAppInfo, appleAppSearches, googlePlayAppInfo, googlePlayAppSearches } from "../dataforseo/endpoints/app_data";
import { ensureEnvLoaded } from "../shared/env";

ensureEnvLoaded();

const KEYWORDS = ["substitution app", "playing time", "football coach", "grassroots football", "football team manager", "football stats"];

type Store = "google" | "apple";
type Known = { name: string; match: RegExp; ids: Partial<Record<Store, string>>; ours?: boolean };

// Ids already known from the 2026-10-18 Facebook-group sweep and today's
// SERPs. Anything missing is looked up by a name search.
const APPS: Known[] = [
  { name: "Football Parent Coach App", match: /football parent/i, ids: { google: "uk.co.footballparent.coachapp" }, ours: true },
  { name: "SubTime", match: /subtime/i, ids: { google: "com.gametimes", apple: "1248650528" } },
  { name: "SubNow", match: /subnow/i, ids: {} },
  { name: "Coach Meister", match: /coach ?meister/i, ids: { apple: "6502994221" } },
  { name: "Roll On Football", match: /roll ?on/i, ids: { apple: "6816004264" } },
  { name: "FairPlay FC", match: /fair ?play/i, ids: { apple: "6755611235" } },
  { name: "SquadSync", match: /squad ?sync/i, ids: { apple: "6803371735" } },
  { name: "FTACT", match: /ftact/i, ids: { apple: "6749849332" } },
  { name: "STATZO", match: /statzo/i, ids: { apple: "6670539360" } },
  { name: "Coach TeamMate", match: /teammate/i, ids: { apple: "6473653336" } },
  { name: "CoachAny", match: /coachany/i, ids: { google: "com.coachany" } },
  { name: "Match Flow", match: /match ?flow/i, ids: {} },
  { name: "GAFFER", match: /^gaffer/i, ids: {} },
  { name: "Pytch", match: /pytch/i, ids: {} },
  { name: "Centre Circle", match: /centre circle/i, ids: {} },
  { name: "ClubRoots", match: /club ?roots/i, ids: {} },
  { name: "FootballGPT", match: /footballgpt/i, ids: {} },
  { name: "TeamStats", match: /teamstats/i, ids: {} },
];

const POLL = { pollAttempts: 60, pollDelayMs: 10_000 };
const COST_EST = { search: 0.0012, info: 0.0006 };

function items(r: any): any[] {
  const res = r?.data?.tasks?.[0]?.result?.[0];
  return (res?.items ?? []) as any[];
}

async function main() {
  migrate();
  const missing = APPS.flatMap((a) => (["google", "apple"] as Store[]).filter((s) => !a.ids[s]).map((s) => ({ app: a, store: s })));
  const nSearches = KEYWORDS.length * 2 + missing.length;
  const nInfo = APPS.length * 2;
  console.log(`Plan: ${nSearches} store searches (~$${(nSearches * COST_EST.search).toFixed(3)}), up to ${nInfo} app info calls (~$${(nInfo * COST_EST.info).toFixed(3)}). Standard queue, estimates from DataForSEO's published prices.`);

  const liveReady = process.env.DATAFORSEO_ENV === "live" && process.env.DATAFORSEO_ALLOW_LIVE === "true" && process.env.LIVE_CONFIRM === "yes";
  if (!liveReady) {
    console.log("PLAN ONLY. Nothing sent. Live run requires DATAFORSEO_ENV=live, DATAFORSEO_ALLOW_LIVE=true and LIVE_CONFIRM=yes.");
    return;
  }
  const common = { workflow: "coach-app-store-snapshot", environment: "live" as const, confirmLive: true, ...POLL };
  let cost = 0;
  const errors: string[] = [];
  const track = (label: string, r: any) => {
    if (r.cacheStatus !== "hit") cost += r.cost ?? 0;
    if (r.error) errors.push(`${label}: ${r.error}`);
    return r;
  };
  const search = (store: Store, kw: string) =>
    (store === "google" ? googlePlayAppSearches(kw, common) : appleAppSearches(kw, { ...common, depth: 30 })).then((r) => track(`${store} search ${kw}`, r));

  // 1. Keyword searches, then name searches for apps without an id.
  const keywordResults = await Promise.all(KEYWORDS.flatMap((kw) => (["google", "apple"] as Store[]).map(async (store) => ({ store, kw, r: await search(store, kw) }))));
  const storeRanks = keywordResults.map(({ store, kw, r }) => ({
    store,
    keyword: kw,
    results: items(r).map((i) => ({ rank: i.rank_absolute ?? i.rank_group, appId: i.app_id, title: i.title, rating: i.rating?.value ?? null, votes: i.rating?.votes_count ?? null })),
  }));
  const fillFrom = (rows: { appId: string; title: string }[], store: Store) => {
    for (const a of APPS) if (!a.ids[store]) {
      const hit = rows.find((x) => x.title && a.match.test(x.title));
      if (hit) a.ids[store] = String(hit.appId);
    }
  };
  for (const s of storeRanks) fillFrom(s.results, s.store);
  const stillMissing = APPS.flatMap((a) => (["google", "apple"] as Store[]).filter((s) => !a.ids[s]).map((s) => ({ a, s })));
  const nameResults = await Promise.all(stillMissing.map(async ({ a, s }) => ({ a, s, r: await search(s, a.name) })));
  for (const { a, s, r } of nameResults) {
    const hit = items(r).find((i) => i.title && a.match.test(i.title));
    if (hit) a.ids[s] = String(hit.app_id);
  }

  // 2. App info for every id found.
  const infoJobs = APPS.flatMap((a) => (["google", "apple"] as Store[]).filter((s) => a.ids[s]).map((s) => ({ a, s, id: a.ids[s]! })));
  const infos = await Promise.all(
    infoJobs.map(async ({ a, s, id }) => {
      const r = track(`${s} info ${a.name}`, await (s === "google" ? googlePlayAppInfo(id, common) : appleAppInfo(id, common)));
      const res = r?.data?.tasks?.[0]?.result?.[0];
      const it = res?.items?.[0] ?? res ?? {};
      return {
        app: a.name,
        ours: !!a.ours,
        store: s,
        appId: id,
        title: it.title ?? null,
        developer: it.developer ?? null,
        installs: it.installs ?? null,
        installsCount: it.installs_count ?? null,
        rating: it.rating?.value ?? null,
        ratingVotes: it.rating?.votes_count ?? null,
        reviewsCount: it.reviews_count ?? null,
        price: it.price?.current ?? it.price ?? null,
        released: it.released_date ?? it.release_date ?? null,
        updated: it.last_update_date ?? it.updated_date ?? null,
        categories: it.categories ?? it.genres ?? null,
      };
    })
  );

  const date = new Date().toISOString().slice(0, 10);
  const out = `seo-data/exports/coach-app-store-snapshot-${date}.json`;
  const notFound = APPS.flatMap((a) => (["google", "apple"] as Store[]).filter((s) => !a.ids[s]).map((s) => `${a.name} (${s})`));
  fs.writeFileSync(out, JSON.stringify({ date, cost, errors, notFound, apps: infos, storeRanks }, null, 2));
  console.log(`cost=$${cost.toFixed(4)} -> ${out}`);
  if (errors.length) console.log(`${errors.length} error(s):\n${errors.join("\n")}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

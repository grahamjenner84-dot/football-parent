---
name: football-parent-weekly-seo
description: Weekly SEO check for Football Parent. Reads the before/after on every logged SEO change (Search Console lag-adjusted, first-party page views over genuine 7 and 14 days), gives each a keep / revert / too early verdict, then finds a short list of new opportunities - pages that slipped, newly ranking terms worth optimising for, page 2 queries that could reach page 1. Use when Graham asks for the weekly SEO check, how recent changes did, whether a change worked, or what to optimise next.
---

# Weekly SEO check

Two halves, always in this order: **did the last changes work**, then **what
next**. Nothing is edited in this skill until Graham picks from the
shortlist. The CLAUDE.md SEO rules (one lever per page, own commit, 10-14
day watch, never re-introduce a reverted change, log everything) apply
throughout and are not repeated here.

Today's date is the run date. GSC data lags 3 days, so any GSC window ends
at today minus 3. Our own `page_views` has no lag; its windows end yesterday.

## 1. Collect the changes to review

The change log is the most recent `seo-changes-*.md` in the repo root (by
the date in the filename). From it, list every SEO change made 3 to 35 days
ago: title/meta edits, added sections or FAQs, internal links, new
articles. For each note the page path, the date it went live (the commit or
deploy date, not when it was written), the commit, and any **baseline**,
**revert rule** or **watch until** date the entry states.

Then the previous `## Weekly SEO check` section in that log (if there is
one): anything it marked **too early** or **read again** comes back in, and
anything it closed (kept or reverted) stays closed.

Cross-check against git so nothing unlogged slips through:

```bash
git log --since="35 days ago" --date=short --format="%h %ad %s" -- content app/academy-pathway app/academy-trials app/football-development app/football-gear app/girls-football app/parent-guides app/coaching
```

A commit that changed a title, heading, section or links on a live page but
has no log entry is a finding in itself: add it to the review and note the
gap. Stock swaps and affiliate link maintenance are not SEO changes unless
they changed visible copy.

## 2. Measure each change

Run all of them in one call (free: GSC service account and Supabase only):

```bash
npx tsx scripts/seo/cli/change-impact.ts --change /football-gear/best-footballs-by-age=2026-10-04 --change /academy-pathway/arsenal-development-centre-guide=2026-10-14
```

Paths must be site paths that are in `lib/routes.ts` (the script refuses
anything else, which catches slug typos). Use the date the change went
live. `--days 28` widens the GSC window for low-volume pages.

What it gives per page:

- **Search Console:** from the day after the change up to 14 days (cut at
  today minus 3), against the same number of days just before it. Page
  impressions, clicks, CTR, the blended position, a **same-query
  position** (only queries in both windows, equal weight both sides), the
  top query movers, queries newly ranking since the change, and the
  whole-site change over the same windows.
- **Page views:** 7 and 14 days either side, all sources and search-referred
  only, beside the whole-site change.
- Other commits on the same page's files in the window.

## 3. Verdict per change

Judge in this order, and say which numbers the verdict rests on:

1. **Enough data?** Fewer than 7 post-change days clear of the GSC lag, or
   under ~100 page impressions in either window: **too early** (or **too
   small to read**), give the date to read again. Do not call a move on 2
   or 3 days.
2. **Net of the site.** Compare the page's change with the site change on
   the same windows. +19% impressions while the site did +10% is +9 points
   of real effect, not +19%. Seasonal pages (trials, development centres,
   Christmas gear) swing with demand: lean on CTR and positions there, not
   raw clicks (the Arsenal entry says this explicitly).
3. **Rankings from the same-query position, never the blended average.**
   The blended number moves when the query mix changes. Positive change on
   the same-query row is better.
4. **What the change was meant to move.** A title change is judged on CTR
   and the queries it targeted; an added section or FAQ on the queries it
   targeted and any newly ranking queries; an internal link on the target
   page's impressions and position.
5. **Search page views** are the cross-check: they have no lag and include
   clicks GSC hides on anonymised queries. If GSC and page views disagree,
   say so rather than picking the convenient one.
6. **Muddied:** if the script lists other commits in the window that changed
   visible copy on the page, say the read is shared between them.

Verdicts:

- **Keep** (worked or neutral after 14 days): the page leaves the watch list.
- **Revert** only when the entry's own revert rule is met, or, with no rule
  stated, the same-query position is more than ~2 worse or clicks are down
  well beyond the site change, holding for a week. Show the numbers and the
  `git revert <hash>` it would take, and ask before doing it: it changes the
  live site. Never revert on a too-early read.
- **Too early / read again** with a date.

## 4. Find opportunities

Refresh the data first:

```bash
node scripts/generate-seo-opportunities.mjs
```

and call the `compare_search_console_periods` MCP tool for the last 28 days
against the 28 before (both ending today minus 3). If the MCP tools are not
connected, the same numbers are on `/admin/seo` (Ranking health tab); say
that the slips/new-terms half was skipped rather than guessing.

Look in four places. The opportunities file is long (hundreds of rows) and
mostly noise, so filter hard:

- **Pages that slipped:** `rankingQuality.biggestSlips` (same-query declines
  by impact) and the `decay` entries. A slip only counts if it is more than
  ~1.5 positions on a query with real impressions and the page was not
  changed by us in the window (then it belongs in section 3).
- **Gone quiet (`silence`):** technical first, never a content edit. Check
  URL Inspection, redirects, canonical, noindex and recent `proxy.ts` or
  `next.config.ts` changes (CLAUDE.md rule 10). Redirected old URLs fading
  out are expected.
- **New terms:** `rankingQuality.newlyRanking`, plus the "newly ranking"
  lines from step 2. Worth acting on when a query with 50+ impressions
  ranks on a page that does not directly answer it: open the MDX and check
  whether the page already covers it before suggesting anything (it often
  does). The fix is additive: an FAQ, a sentence in the right section, or
  an H2 if it is a real sub-topic.
- **Page 2 to page 1:** `striking_distance` rows (positions 11-20). Keep only
  queries with 100+ impressions, group by page, and confirm the recent
  position with `inspect_page` (the file covers 90 days, so a query may
  already have moved). Check `cannibalisation` too: if two of our pages
  share the query, the fix is usually an internal link or clarifying which
  page owns it, not more content.
- **Low CTR:** only entries marked `confirmed` (CLAUDE.md rule 9).

Drop, without listing them as findings:

- pages on the watch list (changed in the last 14 days) or still inside a
  watch window from the log;
- anything a memory says not to re-raise (for example the JPL explainer's
  CTR);
- changes reverted before (CLAUDE.md rule 7);
- low-CTR or title ideas before checking whether the query's SERP has an AI
  Overview (memory: AI Overviews suppress CTR regardless of title).

Before proposing a change on a page, look at what is actually there: read
the MDX and the page.tsx title/meta, grep for existing internal links to it.
A paid DataForSEO call (live SERP, PAA for the page's main query) is fine
for the final shortlist only, and only after saying what it costs and
getting a yes.

## 5. Report

Save the full write-up as `seo-data/exports/weekly-seo-check-YYYY-MM-DD.md`,
and give Graham a short version in chat:

1. **Changes reviewed**: one line each, page, what changed, verdict and the
   two or three numbers behind it, next read date if too early.
2. **Shortlist**: at most 5 opportunities, best first. Each: page and query,
   the evidence (impressions, position now vs 28 days ago), the one lever
   proposed, whether the page carries live traffic (`low_ctr`/`decay` pages
   do: be conservative), and for a title or meta the current one first with
   2-3 alternatives (memory: ~150-165 character metas, no slop words). For
   anything content-side, paste-ready MDX.
3. Anything blocked or skipped (MCP not connected, unlogged commits found).

Then append to the change log (the latest `seo-changes-*.md`) a section
`## Weekly SEO check YYYY-MM-DD` with the verdict table: page, change date,
commit, verdict, the numbers, and "read again DD Mon" where it applies. This
is what next week's run reads in step 1. Commit the log and report on their
own (`SEO: weekly check YYYY-MM-DD`).

## 6. When Graham picks from the shortlist

For each one he approves: one lever, its own commit, `npm run build`, then a
log entry in the latest `seo-changes-*.md` written the way the existing
entries are: what changed (old and new for a title), the commit, a
**baseline** (28 days: page impressions, clicks, position, CTR, and the
target queries' positions), a **revert rule**, and **watch until** (today
plus 14 days). The baseline and revert rule are what make next week's
verdict mechanical, so do not skip them. "Put it live" means merged to
`main` and deployed (CLAUDE.md).

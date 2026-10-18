# SEO roadmap

Dated SEO follow-ups and planned work that isn't an article (planned articles live in the article roadmap, the `pages` table in the local SEO database, exported to `seo-data/exports/article-tracker.csv`). Changes that have shipped are logged in the latest `seo-changes-*.md`, not here. Started 2026-10-18.

## Due

### AI Overview citations on the app searches (re-check about 8 Nov 2026)

- **What:** re-pull the AI Overviews on the 8 app searches ("equal playing time app grassroots football", "fair playing time football coaches app", "fair playing time app", "equal game time app", "football substitution app", "playing time app football", "grassroots football substitution app", "equal playing time app") and see whether footballparent.co.uk or the Coach App's Play listing is now cited.
- **How:** `googleOrganicSerp` with `loadAsyncAiOverview: true` and `forceRefresh: true`, depth 10, the same way as the 18 Oct pull (about $0.03). These overviews load asynchronously and come back empty without the flag.
- **Baseline (18 Oct):** none of the 8 cites us or our Play listing; store listings are cited on all 8 (SubTime's on 5); FairPlay Coach on 2, the two it ranks for. See `seo-data/exports/app-terms-ai-overviews-2026-10-18.md`.
- **Why 8 Nov:** gives Google time to recrawl the coach app page (new title, heading, section and FAQ) and the calculator (now visible to Google), both re-indexed 18 Oct.
- **Also:** `ai-overview-check.ts` doesn't pass `loadAsyncAiOverview`, so it reads asynchronous overviews as empty. Fix it before relying on its citation log.

### Watch items from 18 Oct

- **To about 1 Nov:** "equal playing time" on `/coaching/equal-playing-time-in-grassroots-football`. If it slips, revert the coach app page title first.
- **About 8 Nov:** calculator rankings for "playing time calculator", "equal playing time calculator" and "equal game time calculator" (none in the top 100 on 18 Oct).
- **About 8 Nov:** stats page title decision. Only change it if "football stats app" searches are still past #20.

## Planned

- **New article: youth football match lengths, pitch sizes and goal sizes by age group (2026/27).** No page covers it; competitors rank for "pitch dimensions for 9v9" (480/mo), "9v9 goal size" (210), "u12 football match length" (110), "u11 football match length" (70). Check volumes with keyword research before writing, then add it to the article roadmap. See `competitor-keyword-ownership-2026-10-18.md`, section 4.
- **Research: "football positions" for kids.** FootballGPT ranks #10-29 for "positions in football" (14,800/mo). Generic head term, so run a live SERP and keyword check for a kids angle before committing.
- **Tighten the outreach quality gate (`lib/outreach/quality.ts`).** On 18 Oct it passed as "ok": link farms (`.store`/`.space` "white-hat-backlinks" pages, `jropldyibizm.fit`), a hacked government page, Bing image results, and pitch-planner.app (a rival app); the competitor map also tagged fieldio.pro, equalplay.io and greysonmasters.com as good prospects.

## Ideas (product decisions, not SEO work yet)

- **Grassroots lineup builder tool page**, embedded like the calculator: TeamStats ranks #17 for "build a lineup" (590/mo) with its own tool.
- **Fixture generator tool:** "fixture generator" 1,300/mo, "create a fixture list" 590 (The Sporting Resource #20-27).

## Partnership routes for links (Graham)

- **Football DNA:** its equal-playtime page ranks #7 for "equal playing time app". Raise the calculator within the sponsorship conversation.
- **County FAs:** Somerset FA's "Even Stevens" and Sheffield FA's equal playing time page rank for the calculator searches. Centre Circle grew through county FAs (190 county FA links).
- **England Football's "Helpful apps & websites: Matchday" page:** #7 for "grassroots football substitution app". Needs a partnership conversation, not a cold email.

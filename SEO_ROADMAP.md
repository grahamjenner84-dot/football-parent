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

## Sponsorship pitches (Graham)

### QuickPlay: article angles to offer (researched 20 Oct 2026)

Goals and rebounders are already covered (`best-football-goals-for-kids`, `best-football-rebounders-for-kids`). Full research in `seo-data/exports/quickplay-sponsor-research-2026-10-20.md`.

- **Lead: indoor football training at home for kids, for the winter.** "indoor football training" 880/mo, KD 0. Ranking now: YouTube, Snapchat and blog posts from BlazePod, FPRO, footy.com and a PE site, nobody strong. Timely, as QuickPlay's own blog leads on the clocks going back. Carries their skills mat, REPLAY board, mini goals and RXTR reaction lights (reaction lights are only ~90/mo, so they go in here rather than in their own article). Caveat: Google shows a local map pack, so part of the 880 is people looking for indoor venues.
  - Keywords (UK/mo): indoor football training 880 (also "football training indoor" and "indoor training football", 880 each, same search), indoor football training equipment 70, football training at home 50, football reaction lights 50, football drills at home 20, indoor football training mat 20, reaction lights football 20, reaction training lights football 20.
- **Second: goalkeeper training equipment for kids.** "goalkeeper training equipment" 1,300/mo (QuickPlay #10), "goalkeeper rebounder" 140, both KD 0. Ranking now: KEEPERsport is the only shop in the top 3, with Quora at #2, Eric Nixon's guide at #5, then small goalkeeping blogs and Amazon. Carries their Goalkeeper Deflection Wall and rebounders.
  - Keywords (UK/mo): goalkeeper training equipment 1,300 (QuickPlay #10), goalkeeper training equipment soccer 1,300 (QuickPlay #17), goalkeeper rebounder 140 (also "rebounder goalkeeper" 140), goalkeeper rebounder net 30, goalkeeper rebounder shield 30. "goalkeeper training equipment for kids" has no Google Ads volume.
- **Before pitching either:** check the goalkeeper term for a shopping carousel and the indoor term for how much of its search is about venues (a few phrasings each, under a cent per SERP).
- **Dropped: football skills mats.** "football training mat" (1,300) and "football skills mat" (720) are shopping SERPs: product pages and a shopping carousel only, no editorial page in the top 20 apart from a Reddit r/bootroom thread and YouTube. Low KD here meant shops win on product match, not that an article could rank. Only the long-tail question "do football training mats actually help" is left, with no volume figure. Keywords checked (UK/mo): football training mat 1,300, football skills mat 720, footwork ball mastery mat 260, ball mastery mat 170, fpro ball mastery mat 140.
- **Also checked and ruled out:** ball stop netting 390 and ball stop netting for gardens 260 (specialist sellers only), football target nets 590 (QuickPlay already #1, shops only), pop up football goals 1,900 (overlaps our goals article; "best pop up football goals" only 50), football agility ladder 40.
- **Not article material:** brand searches ("quickplay" 1,600, "quickplay goals" 1,000, "quickplay rebounder" 590) are navigational with QuickPlay #1 on all; "quickplay review" is ~10/mo with Trustpilot top. "quickplay discount code" (210/mo) only works as a deal term: ask for an exclusive code and put it inside the articles, not on a page of its own.

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

### Read-agains from the 22 Oct weekly check

- **27 Oct: shin pads FAQ (`0838cfe`).** The revert rule was met on clicks (weekly 90, 74, 51), but it was held: the slide began before the FAQ, demand for the "best" queries fell, and the impressions rise is head terms at about 11.4 from 12 Oct. Revert if "best shin pads for kids" or "best kids shin pads" hold 2+ places worse through 20-26 Oct (they read 3.3 and 4.7 on 19 Oct). The shin pads head terms ("kids shin pads" and others, about 3,500 impressions a week at 11-12) wait until this is settled.
- **27 Oct:** stats apps shortened title (clicks 20 to 8 over 6 days), and the 10 shortened titles from 13 Oct.
- **28 Oct:** Arsenal title, CTR rule (0.67% over the first 5 days, the line is 0.7% for two weeks).
- **30 Oct:** Palace, Veo and soft ground titles; ETC intro and its AI Overview citation.
- **About 5 Nov:** Brentford, Leeds and Chelsea titles (22 Oct). Baselines and revert rules are in the change log.
- **Arsenal and Villa titles still end "Parent's Guide":** Graham (22 Oct) prefers it off, so drop it when each is next off watch (Arsenal after 28 Oct, Villa now). Not a lever on its own; pair it with the next title change on each page.

### /progress copy revert (read about 6 Nov)

- **What:** the 23 Oct revert of the `/progress` headline and intro to the pre-13 Oct copy (`e2b5319`). Read Progress sign-ups (app snapshot) and join form taps against 14-23 Oct: 2 sign-ups, 98 form views, 7 taps. Baseline and keep rule in the change log.

### Christmas and Black Friday (live by about 7 Nov)

From `seo-data/exports/xmas-affiliate-seasonality-2026-10-22.md`. "football gifts" is at about a quarter of its peak now, doubles in early November and peaks Black Friday week to 20 December. Advent calendars peak around 9 November.

- **Written 22 Oct: `/football-gear/football-advent-calendars`.** See the change log. Check it is indexed by about 29 Oct (request indexing in Search Console on publish), and its stock before mid-November.
- **Written 23 Oct: gifts for football coaches** (`/parent-guides/gifts-for-football-coaches`). See the change log. Request indexing on publish, check it is indexed by about 30 Oct, and refresh in April for the end of season. Original brief kept below. Research: `seo-data/exports/xmas-opportunity-research-2026-10-22.md`, section 4.
  - **Demand (UK):** "football gifts for coaches" / "gifts for football coach" 2,400 a month average, 2,900 in Nov 2025 and 5,400 in Dec 2025, KD 0. Steady through the year, so it also catches the end-of-season gift (May-June).
  - **Page one (22 Oct):** weak. A spirits shop, a Lego-figure shop, Soccer Coach Weekly's 2025 Christmas list, Pinterest, Reddit r/AskUK "What gift should we buy for U9's football coaches?", Wanapix, Etsy, Spized, mysteryshirtinabox, Mumsnet. AI Overview present, citing none of them strongly.
  - **Questions to answer (PAA and related):** What is the best gift for a coach? What are some good end-of-season football gifts? How much to donate for a coach gift? Plus youth football coach gift ideas, personalised football coach gifts, football coach gifts UK.
  - **Angle:** parents clubbing together for a grassroots volunteer coach, written by a coach. What coaches actually use (a decent coat, gloves, a tactics board, a whistle, a clipboard), team gifts vs individual ones, how much each family usually puts in, a signed card or team photo. Graham's own view as a coach is the E-E-A-T, and shops cannot match it. Coach App mentioned the subtle way only.
  - **Amazon:** personalised coach mugs, tactics boards, coach bags, clipboards, whistles, touchline coats and gloves.
  - **Timing:** live by about 20 Nov for the December peak; refresh in April for the end of season.
- **Black Friday readiness on existing pages:** rebounders (12,100 in Nov, 2.8x), kids' boots (33,100), Veo (22,200), size 3 and 4 footballs (1.8x), gifts guide. Stock check about 16-20 Nov. From the 22 Oct research: a Veo FAQ on Black Friday and discount codes (County FA offers ran 50% off Veo Go and £500 off Cam 3 last year; PAA "Is there a discount code for Veo camera?") after its watch ends 30 Oct; a rebounders FAQ, "What is the best football rebounder for an 8-year-old?" (PAA).
- **Gifts guide additions: done 22 Oct** (ages in years on the age bands, two age FAQs from PAA, Secret Santa line, pyjamas / slippers / annuals line, advent calendar link). See the change log.
- **Fold into the QuickPlay indoor training article:** "football training equipment" (12,100 in Nov, 2.3x). Mostly shops, two buying guides at #5 and #8.
- **Ruled out:** boot bags (shops-only SERP), "black friday football boots" (retailer deal pages), skills mats (20 Oct), garden goals (peak May).

### Internal links held from the 30 Oct link audit

See the change log (30 Oct). One link per page, each in its own commit, once the page is off watch.

- **After the Leeds title read (2 Nov, about 5 Nov if extended):** `/academy-pathway/academy-categories-explained`, Category 1 paragraph, add Leeds next to the Aston Villa example (Category One since 2020) linking `/academy-pathway/leeds-united-development-centre-guide`; and a club guides line in the body of `/academy-pathway/uk-football-development-centres-explained`, which links only Crystal Palace in its body. Leeds then goes on the homepage "Popular guides" block.
- **After the Chelsea title read (about 5 Nov):** Chelsea's PTC, PDC and PPC section links `/academy-pathway/pdc-vs-ptc-vs-rtc-explained` (it explains the terms at length and has no link). Also the Leeds guide's scholarship line to `/academy-pathway/football-scholarships-uk` once Leeds is off watch.
- **After the base layers title read (about 12 Nov):** `/football-gear/childrens-soft-ground-football-boots`, "For the rest of the winter kit list" sentence, add the base layers guide next to gloves and shin pads. Base layers could then join the homepage block.
- **Read the 30 Oct links and homepage block (about 13 Nov):** in-body link counts went scholarships 3 to 5, PDC explainer 1 to 2, girls' boots 0 to 1, Watford 4 to 5.

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

## Sponsored and affiliate ideas (Graham)

### QuickPlay: article angles to offer (researched 20 Oct 2026)

Goals and rebounders are already covered (`best-football-goals-for-kids`, `best-football-rebounders-for-kids`). Full research in `seo-data/exports/quickplay-sponsor-research-2026-10-20.md`.

- **Lead: indoor football training at home for kids, for the winter.** "indoor football training" 880/mo, KD 0. Ranking now: YouTube, Snapchat and blog posts from BlazePod, FPRO, footy.com and a PE site, nobody strong. Timely, as QuickPlay's own blog leads on the clocks going back. Carries their skills mat, REPLAY board, mini goals and RXTR reaction lights (reaction lights are only ~90/mo, so they go in here rather than in their own article). Caveat: Google shows a local map pack, so part of the 880 is people looking for indoor venues.
  - Keywords (UK/mo): indoor football training 880 (also "football training indoor" and "indoor training football", 880 each, same search), indoor football training equipment 70, football training at home 50, football reaction lights 50, football drills at home 20, indoor football training mat 20, reaction lights football 20, reaction training lights football 20.
- **Second: goalkeeper training equipment for kids.** "goalkeeper training equipment" 1,300/mo (QuickPlay #10), "goalkeeper rebounder" 140, both KD 0. Ranking now: KEEPERsport is the only shop in the top 3, with Quora at #2, Eric Nixon's guide at #5, then small goalkeeping blogs and Amazon. Carries their Goalkeeper Deflection Wall and rebounders.
  - Keywords (UK/mo): goalkeeper training equipment 1,300 (QuickPlay #10), goalkeeper training equipment soccer 1,300 (QuickPlay #17), goalkeeper rebounder 140 (also "rebounder goalkeeper" 140), goalkeeper rebounder net 30, goalkeeper rebounder shield 30. "goalkeeper training equipment for kids" has no Google Ads volume.
- **Before pitching either:** check the goalkeeper term for a shopping carousel and the indoor term for how much of its search is about venues (a few phrasings each, under a cent per SERP).
- **Dropped: football skills mats.** "football training mat" (1,300) and "football skills mat" (720) are shopping SERPs: product pages and a shopping carousel only, no editorial page in the top 20 apart from a Reddit r/bootroom thread and YouTube. Low KD here meant shops win on product match, not that an article could rank. Only the long-tail question "do football training mats actually help" is left, with no volume figure. Keywords checked (UK/mo): football training mat 1,300, football skills mat 720, footwork ball mastery mat 260, ball mastery mat 170, fpro ball mastery mat 140.
- **Also checked and ruled out:** ball stop netting 390 and ball stop netting for gardens 260 (specialist sellers only), football target nets 590 (QuickPlay already #1, shops only), pop up football goals 1,900 (overlaps our goals article; "best pop up football goals" only 50), football agility ladder 40.
- **Swap-in offer: rebounder links already in place (22-23 Oct 2026).** Amazon rebounder links (FORZA Wave B0CMJGKVFK, budget folding net B0BWQHB3Y9) went into three non-gear articles on purpose, so swapping them to QuickPlay (REPLAY board, SPOT rebounder) is something concrete to offer if they sign: `football-development/is-private-football-coaching-worth-it` (back garden paragraph, both links), `football-development/how-much-training-is-too-much` ("Lower training load" list, both links), `academy-pathway/how-to-join-a-football-academy` ("Focus on development", FORZA Wave). Logged in `seo-changes-2026-09-06.md`. Their inline click-outs on the Amazon clicks tab are the numbers to show QuickPlay. Other spots that fit later: `how-to-become-a-professional-footballer` ("spend plenty of time with a ball") and `why-isnt-my-child-improving-at-football` ("add touches", once the 18 Oct change is off watch). Leave `football-burnout` alone (Graham's own note).
- **Not article material:** brand searches ("quickplay" 1,600, "quickplay goals" 1,000, "quickplay rebounder" 590) are navigational with QuickPlay #1 on all; "quickplay review" is ~10/mo with Trustpilot top. "quickplay discount code" (210/mo) only works as a deal term: ask for an exclusive code and put it inside the articles, not on a page of its own.

### Playermaker affiliate programme: future article (researched 24 Oct 2026)

Graham's list of 40 Playermaker affiliate and tracker terms. Full research in `seo-data/exports/playermaker-affiliate-research-2026-10-24.md` (raw data in the matching `.json`).

- **Article: Playermaker 2.0 vs CityPlay review, for parents** (`/football-gear/`). Standalone, because the trackers article only gives Playermaker one paragraph and we rank for none of the brand terms. Review slots on page one are held by small sites (soccerwares #7-9, premierinjuries #6, FourFourTwo #1 for CityPlay), Reddit and YouTube.
  - Keywords (UK/mo): playermaker 1,000 (KD 2, mostly navigational, a review can realistically reach #8-10), playermaker 2.0 320, playermaker football tracker 210 (KD 1), football boot tracker 170 (KD 10, no proper comparison on page one), playermaker discount code 40 (voucher sites only), cityplay football tracker 20 (KD 0).
  - **Before writing:** ask the affiliate programme for a review unit. Gear pages earn trust from first-hand testing, and the reviews on page one say "tested on a real youth player". Ask for an exclusive discount code too, and put it inside the review rather than on a page of its own.
  - **Timing:** "playermaker" peaks in December (about 2,400 against 600-900 in quiet months). Live by mid-November to catch it.
  - Link it from the kids trackers article's "Playermaker 2.0 and SoccerBee" paragraph once live (one lever, after that page's watch).
- **Later: GPS vest terms (re-check late Nov).** "football gps vest" 320 (KD 15) and "football tracker vest" 320 (KD 13): page one is shops plus zone14 and Reddit. `/football-gear/best-football-gps-trackers-for-kids` has "Vests" in its title but is not in the top 30 for either. If it hasn't picked them up by late November, consider a standalone "best football GPS vests", checking for cannibalisation with the kids page first.
- **Leave alone:** the kids tracker terms (football tracker kids #9, football boot tracker kids #6, best football gps tracker #10). The existing page covers them and is three weeks old and still climbing. "football tracker" (720, KD 46) and "football gps tracker" (480, KD 23) are brand and shop dominated: not a target now.
- **Ruled out:** the generic and "soccer" terms. "sports technology" (1,300) is university courses, "sports performance analysis" (260) and "football performance analysis" (170) are degrees and B2B software, "football analytics" (140) is read as "football" (BBC, the FA). "football training devices" (6,600) is Google Ads lumping it with "football training equipment": an equipment-shop SERP, not a tracker search. The rest have 0-20 UK searches a month.

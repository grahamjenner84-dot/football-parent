# Weekly SEO check, 13 Nov 2026

GSC to 10 Nov (3-day lag), page views to 12 Nov. Change reads from `scripts/seo/cli/change-impact.ts`; ranking health from `comparePeriods` (28 days 14 Oct-10 Nov vs 16 Sept-13 Oct), run locally because the MCP tools are not connected in this session.

**Site, 28 vs 28 days:** impressions 228k to 323k (+41%), clicks 3,835 to 5,009 (+31%), same-query position 8.9 to 8.2 (2,974 queries; 895 improved, 448 worse). Most of the growth is seasonal gear (advent calendars, shin pads, base layers, gifts).

## Tool finding: `change-impact.ts` counts #fragment URLs

`getPeriodTotals` merges `#fragment` rows (jump links and AI Overview / snippet links) into the page. Those rows carry large impression counts and almost no clicks, so on pages that started getting them the page CTR reads far lower than the CTR of the URL itself. Checked 17-28 Oct vs 30 Oct-10 Nov:

| Page | Exact URL | Fragment rows |
|---|---|---|
| base layers | 6,939 imp / 65 cl (0.94%) to 7,811 / 55 (0.70%), pos 8.5 to 8.6 | 1,477 / 0 to 16,163 / 1 |
| advent calendars | 3,088 / 51 to 21,232 / 302 (1.42%) | 0 to 8,568 / 0 |
| FA youth format | 1,789 / 12 (0.67%) to 2,506 / 37 (1.48%) | 207 / 0 to 1,265 / 0 |

So the 6 Nov read of base layers CTR "0.66% to 0.26%" was mostly fragment impressions, not the title. Suggested fix (not made): print an exact-URL row next to the merged one in `change-impact.ts`, and judge CTR revert rules on the exact URL.

## 1. Changes reviewed

| Page | Changed | Commit | Verdict | Numbers |
|---|---|---|---|---|
| Chelsea title | 22 Oct | 22ca92a | **Keep, closed** | 14 days: CTR 1.97% to 1.62% (rule 1.4%, not met); same-query 4.7 to 4.3; "chelsea pre academy" 5.3 to 3.2 (0 to 4 clicks), "chelsea ppc" 77 to 218 impr. Clicks 96 to 84 against site +43%, organic views -4% vs site +21%: lags the site, but rankings up on every target query |
| stats apps title revert | 29 Oct | caa1bf6 | **Keep, closed** | 12 days: CTR 2.67% to 3.23%, clicks 16 to 24 (+50% vs site +62%), same-query 15.4 to 8.7 (6 queries). Middle of the read rule (above 4% = title was the cause): launch title stays |
| base layers title (thermals) | 29 Oct | 1e3e408 | **Keep for now, read again 17 Nov** | Rule (CTR below 0.6% two weeks) not met on the URL itself: weekly 0.9%, 0.9%, then 0.7%, 0.7% after the change. Guards fine ("kids football skins" 8.9 to 8.2, "boys football skins" 10.9 to 10.5); thermal queries 11.1 to 10.0 and 10.7 to 10.3 but still 0 clicks. Exact-URL clicks 65 to 55 at a flat position while impressions rose 13%: soft negative. Organic views 14d +9% vs site +49% |
| FA format table | 29 Oct | 21d2667 | **Worked, closed** | Clicks 12 to 37 (+208% vs site +62%), exact-URL CTR 0.67% to 1.48%, same-query 6.6 to 6.2, organic views +174% vs +49% |
| Coach App page | 18 Oct | 8952367 | Too small | 88 impressions, 4 clicks in 14 days. AI Overview re-check on the 8 app searches (roadmap, due 8 Nov) not run yet: needs ~$0.03 |
| Coach gifts (new) | 23 Oct | 5977598 | Indexed, page 2 | 533 impr, 12 clicks; "gifts for football coaches" 12.0, "football coach gifts" 12.5, "football gift ideas for coaches" 12.0. Only 2 inbound links. See shortlist |
| Indoor training (new) | 24 Oct | | Doing fine | 1,264 impr, 24 clicks, 7-10 on its head terms |
| QPR guide (new) | 1 Nov | 231702c | Doing well | 1,034 impr, 43 clicks, position 4.6, CTR 4.2% |
| Girls' academy trials by club | 1 Nov | | Indexed, doing well | 1,221 impr, 69 clicks, CTR 5.7%; organic views 5 to 77 a week |
| West Ham (inbound link) | 1 Nov | 6de764c, ea7b046 | Too early | 9 days: same-query 7.7 to 7.3, clicks 34 to 39 (site +69%) |
| soft ground (links 1, 6, 7 Nov) | 1 Nov | 48f41c7, 2146c19, e5635ce, 37e9b70 | Too early, positive | Same-query 9.6 to 9.1, impressions +66% vs +42%, organic views 10 to 19 a week |
| advent calendars (inbound link) | 1 Nov | 1c2d6b7 | Keep | Seasonal: 4.6k to 27k impr, 69 to 273 clicks, same-query 8.9 to 8.1 |
| Veo (inbound link) | 1 Nov | 4de4401 | Keep | Same-query 5.8 to 5.6, clicks 26 to 56 (+115% vs +69%) |
| Crystal Palace (anchors) | 1 Nov | d1768e1 | Keep, neutral | Same-query 7.3 to 7.3, CTR 0.64% to 1.64%. Note "crystal palace academy" 7.7 to 9.9 over 28 days (170 impr) |
| Leeds title revert | 6 Nov | 1373915 | Too early, looks right | 4 days: CTR 0.45% to 1.23%, clicks 10 to 27, organic views +142% vs +18%. Read again 20 Nov |
| playing up FAQ | 6 Nov | 02ec54b | Too early | 4 days. Read again 20 Nov |
| shin pads meta | 7 Nov | 6dba33b | Too early | 3 days. Read again 21 Nov |
| girls' recruitment ages meta | 7 Nov | bf486a1 | Too small | 81 impressions in 3 days. Read again 21 Nov |
| 7-11 Nov (comic batch, gloves, astro trainers, boots fixes, pro footballer, photos, apps roundup) | | see entries | Too early | Read 20-25 Nov |

**Unlogged commits found:** `7d10049` (David Jervis interview: Graham's note on the trial-day pep talk, 3 Nov) and `0ccf973` (late developers: Football Parent note split into two paragraphs, 3 Nov). Small copy changes, no ranking lever; noted here so they aren't a mystery later. The Football DNA review commits are on a noindex page.

## 2. Opportunities

Most of the site is inside a watch window (7 Nov comic batch to ~21 Nov, plus the gear pages changed 7-11 Nov), so the list is short.

1. **Coach gifts, one inbound link (seasonal, now).** `/parent-guides/gifts-for-football-coaches` ranks 10-15 on its head terms after 3 weeks, with 2 inbound links (both gear pages). Searches peaked at 5,400 in Dec 2025, so waiting for windows to close costs the peak. Best fit is the volunteer coaches paragraph in `/parent-guides/what-is-grassroots-football` (live traffic, ~28k impr in 90 days; on watch from the 5 Nov wide feet link to ~19 Nov, and in the comic batch). Additive, appended to the end of that paragraph:

   > I've seen lots of grassroots coaches who are brilliant at building a connection with the kids, helping them enjoy football and improving them, particularly at the younger ages. If your child has one of those coaches, our round-up of [football gifts for coaches](/parent-guides/gifts-for-football-coaches) has Christmas and end of season ideas the team can club together for.

   Option: wait until ~19 Nov for the source page's window to close.

2. **AI Overview re-check on the 8 Coach App searches** (roadmap, due 8 Nov). ~$0.03. Decides whether the 18 Oct Coach App page changes got it cited.

3. **AI Overview check before touching two decay pages** (~$0.024): `/parent-guides/how-to-get-into-the-jpl` (clicks 35 to 21, position steady 6.1 to 6.4) and `/academy-pathway/fulham-fc-development-centre-guide` (41 to 28 at a steady 6.8). Steady position with falling clicks is the AI Overview or seasonal pattern; no edit until checked.

4. **Tool fix:** exact-URL CTR row in `change-impact.ts` (above). Code only, no site change.

**Checked and dropped:**
- `/football-gear/best-footballs-by-age` low CTR (0.3% at 7-9 on "what size football for X year old"): AI Overview on those queries, checked 22 Oct, we are not cited. Already known.
- `/girls-football/emerging-talent-centres-explained` decay (77 to 44 at a steady 4.3): AI Overview, held 16 Oct.
- `/academy-pathway/can-academy-players-play-grassroots-football` decay: AI Overview, checked 6 Nov.
- `/new-fa-youth-football-format` decay: the 28-day window is September seasonality; the 29 Oct change is working.
- `/equal-playing-time-in-grassroots-football` decay: the calculator took its calculator queries (known).
- `/veo-camera-alternatives` decay: demand ("veo football camera" fell), position better.
- Striking distance on the wide feet, kids boots, AG vs FG, base layers, shin pads, scholarships, pro footballer and apps roundup pages: all on watch.
- "football academy system" 13.6 on `how-academy-football-works` (188 impr in 90 days): the page already explains the academy system; small.
- `/academy-pathway` category page slipped 13 to 18 from mid-October, but it is ~300 impressions and ~1 click a week. Not worth a lever.
- The one `silence` entry is a `#category-2` fragment URL: expected.
- JPL explainer CTR: not re-raised (memory).

## 3. Follow-ups done the same day (Graham approved 1-4)

**AI Overview checks** (`ai-overview-check.ts`, async overviews, $0.050 actual; "fair playing time app" and "playing time app football" errored at DataForSEO):
- Coach App searches (roadmap item, baseline 18 Oct: none cite us): AI Overview on all 6 that returned, **we are cited on none**. Cited instead: App Store listings, subtimeapp.com, FairPlay Coach / fairplayfc.co.uk, pitchflow.co.uk, playingtimecalculator.com, somersetfa.com, Google Play, GameChanger, Smartsubs, Facebook. No change since 18 Oct. Related searches keep surfacing "equal playing time calculator" and "playing time calculator", where the calculator page already ranks ~5.
- `/parent-guides/how-to-get-into-the-jpl`: "jpl trials" (its top query, 216 impr at 7.1) has an AI Overview that does not cite us (juniorpremierleague.com, Bromley, Pompey ITC, Sussex RTC, Sutton United). "how to join a jpl team" has one citing us (#4). Weekly impressions fell from ~550 a week in Aug-Sept to ~300 at a steady position 6-7: that is demand after the September trials window, plus the overview on the main query. **No edit.**
- `/academy-pathway/fulham-fc-development-centre-guide`: "fulham development centre" AI Overview cites us (#2); "fulham academy trials" has one that does not cite anyone we track. Weekly clicks 6-9 and CTR 1.3-1.6% have been flat since mid-September: the "decay" flag is the September peak dropping out of the window. **No edit.**

## 4. Design impact (comic-accent design)

Method: page views (first-party, 7-day windows so every weekday counts once) and GSC on the URL itself (no fragment rows), redesigned pages against pages still on the classic design over the same days. Academy Pathway / Academy Trials articles (35, classic, waiting on the Progress banner test) are the control for non-gear pages; the 14 classic gear guides are the control for the GPS guide. The header (1 Nov), homepage (3 Nov) and category pages (6 Nov) changed for every page, so the control absorbs them.

**Group A, 13 pages switched 3-4 Nov** (all interviews plus scholarships, academy trials, late developers). Views 27 Oct-2 Nov vs 5-11 Nov; GSC 28 Oct-2 Nov vs 5-10 Nov.

| | Views | Organic views | GSC impr | GSC clicks | CTR | Position |
|---|---|---|---|---|---|---|
| Redesigned (13) | 134 → 177 (+32%) | 67 → 87 (+30%) | 2,327 → 2,445 (+5%) | 37 → 50 (+35%) | 1.59% → 2.04% | 5.2 → 4.8 |
| Control (35 classic) | 1,242 → 1,430 (+15%) | 768 → 814 (+6%) | 22,997 → 22,720 (-1%) | 497 → 519 (+4%) | 2.16% → 2.28% | 5.9 → 6.0 |

Ahead of the control, but nearly all of it is one page: `football-scholarships-uk` 67 → 96 views (organic 42 → 68), which got the David Jervis expert box the same day, so the gain can't be credited to the design. The interviews have 0-20 views a week each: too small to read.

**Group B, 43 articles switched 7 Nov (22:33 UTC)**. Views 1-5 Nov vs 8-12 Nov (Sun-Thu both sides); GSC 1-3 Nov vs 8-10 Nov (only 3 days).

| | Views | Organic views | GSC impr | GSC clicks | CTR | Position |
|---|---|---|---|---|---|---|
| Redesigned (43) | 538 → 587 (+9%) | 313 → 347 (+11%) | 9,779 → 9,820 (0%) | 155 → 153 (-1%) | 1.59% → 1.56% | 6.6 → 7.1 |
| Control (35 classic) | 1,057 → 1,037 (-2%) | 618 → 604 (-2%) | 12,295 → 11,734 (-5%) | 308 → 277 (-10%) | 2.51% → 2.36% | 5.9 → 6.1 |

About 10 points ahead of the control on views and 9 on GSC clicks after 5 days. The blended position slipping 6.6 to 7.1 on 3 days of GSC is not readable yet (impressions flat, CTR flat). Nothing negative. Baseline in the log was ~520 views a week; the 5-day pace is ~820 a week (part of that is the site's November growth).

**GPS trackers guide (first gear page on the comic design, 7 Nov).** Views 51 → 105, GSC clicks 20 → 43, Amazon clicks 32 → 56. Click-out rate (Amazon clicks per view) 63% → 53% over these 5 days, against the 55% 28-day baseline in the log; the classic gear guides went 33% → 36%. In line with its baseline, not a drop, but 5 days of ~100 views is thin: read again 21 Nov as planned before moving more gear pages.

**Hub pages.** Homepage 85 → 135 views in the week after its 3 Nov redesign. Category pages are 5-40 views a week each (no readable change). The Coach App page 15 → 43 is the header link pointing at it from 2 Nov, not its design.

**Verdict:** no sign of harm anywhere; small positive signs on the 7 Nov batch against the control. Read again 21 Nov (14 days, GSC to 18 Nov) before the gear rollout decision.

## Why the Coach App is not cited on the app searches (looked into 13 Nov)

1. **AI Overviews cite what already ranks.** On each of these searches the cited sites are almost all in the organic top 10 (Somerset FA #2 and belnorth #1 on "equal playing time app"; pitchflow, Playing Time Calculator and Dan's Capers in the top 10 on "equal game time app"). In today's top 19 we appear on one search only: "grassroots football substitution app", at #8 (`/football-parent-coach-app`). We were in none of them on 18 Oct, so that is the first sign of progress. The other five searches that returned have no footballparent.co.uk result in the top 19.
2. **Search Console agrees.** From 14 Oct to 10 Nov, `/football-parent-coach-app` had about 140 impressions, nearly all from brand and anonymised searches. Its only app search was "grassroots football app", at #27.6. None of the 8 tracked searches shows a single impression on any of our pages. The site's app traffic goes to the apps roundup (`/coaching/best-grassroots-football-apps`, "best football coaching apps" #6.4). The calculator ranks for calculator searches (#5-7), not app searches.
3. **The overview is a table of named apps.** On "grassroots football substitution app", Google's overview is a table headed "Top Grassroots Football Substitution Apps": FairPlay Coach, FairPlay FC, SubTime, SubNow. Each row is sourced from that app's own homepage or store listing. Every one of them leads its title with a distinct brand name ("FairPlay FC | Grassroots Football Coaching App"). Our page's title is "Fair Playing Time App for Grassroots Football | Coach App": "Coach App" comes last and is a generic phrase, so it doesn't read as a product name. We also have no App Store listing, and Apple listings are cited on 5 of the 6. Forum threads (Reddit, Facebook) fill the rest, and Facebook alone is cited on "equal playing time app grassroots football".

**What would move it** (not done, each would be its own lever after the watch window):

- Rank the page in the top 10 on more of these searches. The header link from 2 Nov is the main lever already in place.
- Get the app named on third-party "best apps" lists that rank, such as sportplan.net's "Best Free Apps for Grassroots Football Teams in 2026" (#6 on the search above). Outreach could target these.
- Put a distinctive app name first in the title on the next title change.
- Re-check about 4 Dec.

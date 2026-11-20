# Weekly SEO check, 20 Nov 2026

GSC to 17 Nov (3-day lag), first-party page views to 19 Nov. Changes measured with `scripts/seo/cli/change-impact.ts` (URL-only CTR row used for CTR rules, per the 13 Nov tooling note). Site comparison from `compare_search_console_periods`, 21 Oct-17 Nov vs 23 Sep-20 Oct (the last days of period A may still fill in).

## Site, 28 vs 28 days

| | Prior 28 | Last 28 | Change |
|---|---|---|---|
| Impressions | 236,327 | 388,396 | +64% |
| Clicks | 3,743 | 6,035 | +61% |
| Same-query position (3,202 queries) | 9.0 | 8.2 | 0.8 better |
| Queries improved / worsened | | 1,027 / 490 | |
| Clicks from positions 4-10 | 479 | 1,079 | +125% |
| Clicks from positions 11-20 | 39 | 192 | |

Biggest gains: shin pads (+132k impressions), advent calendars (new, 72.6k impressions, 716 clicks), base layers (+66.7k), girls boots (+8.9k), Aston Villa, Leeds, GPS trackers, soft ground boots, gifts guide, Wolves (235 clicks from 20), the calculator (new, 120 clicks). Biggest drops are demand, not ranking: `what-is-grassroots-football` (impressions -19% but position 6.4 to 5.5, clicks up), `best-footballs-by-age` (impressions -6%, position 8.4 to 6.9, clicks 52 to 74), Veo (position 6.2 to 5.9), equal playing time explainer (the calculator page now takes those searches).

No unlogged SEO commits found in the last 35 days. All `silence` entries in the opportunities file are `#fragment` rows (jump links fading), not pages: no technical issue.

## 1. Changes reviewed

| Page | Changed | Commit | Verdict | Numbers |
|---|---|---|---|---|
| Leeds title revert | 6 Nov | 1373915 | **Keep, closed.** Rule met: the old title was the cause | URL CTR 1.67% to 2.70%; clicks 40 to 61 (+53% vs site +35%), about 39 a week; same-query 7.8 to 7.3; organic views +89% (7 days) |
| Playing up, two-years-up FAQ | 6 Nov | 02ec54b | **Keep, closed** (too small to read further; revert rule not met) | Page position 5.2 to 5.3 (rule: worse than 6.5); target query 7.5 to 7.1 on 7 impressions; one Progress join came from this page on 18 Nov |
| Shin pads meta | 7 Nov | 6dba33b | **Keep** | URL CTR 1.07% to 1.18%; clicks 117 to 206 (+76% vs site +34%); same-query 8.7 to 8.5; 53% Amazon click-out (12 days) |
| Girls' recruitment ages meta | 7 Nov | bf486a1 | **Too small** | 226 to 256 impressions, 6 to 4 clicks. Read again 28 Nov with `--days 28` |
| Base layers title (thermals) | 29 Oct | 1e3e408 | **Keep, closed** | 14 days: URL CTR 0.94% to 0.75%, but weekly clicks 21, 33, 57 since, with impressions 8k to 36k a week on "skins"/"thermals" shop searches at 8-11; same-query 9.9 to 9.6; revert rule (week 2 below 0.6% on the URL) not met |
| Soft ground boots, inbound links | 1 Nov | see log | **Keep, closed** | Same-query 9.9 to 9.3; clicks 18 to 35 (+94% vs +77%); URL CTR 1.03% to 1.07% |
| Veo, inbound link | 1 Nov | 4de4401 | **Keep, closed** | Same-query 5.9 to 5.4; clicks +32% vs site +77%: new impressions are generic "veo camera" searches (6.2 to 8.3), not alternatives intent; "veo alternative" 6.3 to 4.8 |
| Crystal Palace, inbound link | 1 Nov | see log | **Keep, closed** | URL CTR 1.69% to 2.96%; clicks 27 to 45; same-query 6.8 to 6.6; impressions -19% is trials season ending |
| West Ham, inbound link | 1 Nov | see log | **Keep, closed** | Same-query 7.9 to 7.3; clicks 52 to 59 on flat impressions |
| Advent calendars, inbound link | 1 Nov | see log | **Keep, closed** | Same-query 8.9 to 7.8; "football advent calendar 2026" 8.9 to 6.5 (9.4k impressions, 70 clicks) |
| Pro footballer fact fixes | 7 Nov | 1d0d60a | **Keep** (corrections, not a lever) | Clicks 15 to 26 (+73% vs +34%); URL CTR 0.53% to 0.82%; same-query 8.8 to 8.6. Queued title/meta now eligible after 21 Nov |
| Category pages redesign | 6 Nov | see log | **Keep, closed** | Academy Pathway weekly position 17.3, 16.6, 14.5; Academy Trials 16.3, 16.3, 14.5 (both improving) |
| Apps roundup "coach app" variants | 11 Nov | abbe2dc, b26142c, 04de03a | **Too early, promising** | 6 days: same-query 20.9 to 16.1; "football coach apps" 28.7 to 8.8, "best football coach app" 19.4 to 9.2, "best apps for football coaches" 16 to 9, "apps for football coaches" 17 to 10; "football coaching app" 8.7 to 11.1. Football DNA link (16 Nov) shares the read. Read again 25 Nov |
| Gifts guide by age + 2 links | 13 Nov | 60821a2, dd2a5ef, 9850a3d | **Too early, positive** | 4 days: same-query 12.7 to 9.9; impressions +118% vs site +32%; organic views 29 to 58. Read again 24 Nov (title decision point in the log) |
| Coach gifts link | 13 Nov | c99ed2d | **Too early** | 4 days, tiny numbers: same-query 12.6 to 13.8, clicks 3 to 6. Source page position 5.5 (rule 6.5): fine. Read again 24 Nov |
| Kids boots picks + FAQs | 13 Nov | 1b44e2b, 1d785cd | **Too early, positive** | 4 days: same-query 10.7 to 9.8; organic views 20 to 41; Amazon click-out 24% (12 days) vs 15% baseline. "best football boots for kids" 14.4 to 17.9 on 9 impressions. Read again 24 Nov |
| Football DNA review (published) | 16 Nov | f43bd62 | **Too early** | 25 impressions, position 5.7. Read 30 Nov |

## 2. Design (comic-accent) two-week read

Redesigned pages against pages still on the classic design over the same days. Page views 31 Oct-6 Nov vs 13-19 Nov; GSC URL only, 28 Oct-6 Nov vs 8-17 Nov.

| | Views | Organic views | GSC impressions | GSC clicks | CTR | Position |
|---|---|---|---|---|---|---|
| 43 articles on comic since 7 Nov | 681 to 857 (+26%) | 390 to 527 (+35%) | +23% | 367 to 463 (+26%) | 1.31% to 1.35% | 6.7 to 7.0 |
| Control: 35 classic Academy Pathway/Trials | 1,413 to 1,273 (-10%) | 826 to 789 (-4%) | +1% | 874 to 836 (-4%) | 2.29% to 2.17% | 6.0 to 6.0 |
| GPS trackers (comic gear test) | 77 to 131 (+70%) | 58 to 99 (+71%) | +94% | 50 to 112 (+124%) | 3.25% to 3.75% | 5.5 to 5.7 |
| Control: 14 classic gear guides | 784 to 1,653 (+111%) | 558 to 1,113 (+99%) | +94% | 642 to 1,160 (+81%) | 1.26% to 1.18% | 7.8 to 7.7 |

- Article batch: about 30 points ahead of the control on views and GSC clicks. The control is partly trials-season pages tailing off, so some of the gap is seasonal, but there is no sign of harm. The blended position 6.7 to 7.0 moved with +23% impressions (query mix); CTR held.
- GPS guide: clicks ahead of the classic gear guides (+124% vs +81%); Amazon click-out 59% over the last 12 days vs the 55% baseline. The control's views rise faster because it holds the Christmas pages (advent calendars, shin pads, base layers).
- Homepage (redesigned 3 Nov): impressions doubled since (it now shows for broad searches like "football for kids" at 30 and "youth football coaching" at 24), which drags the blended position from 5.6 to 9.2 and set off the `decay` flag. Brand search "football parent" holds at 2.3 with 37% CTR. Query mix, not harm.
- **Verdict: the gear gate is passed.** The rest of the gear guides can move to comic. Suggest doing it in batches and keeping the peak Christmas pages (advent calendars, gifts guide, shin pads, base layers, wide feet boots) on classic until after about 20 Dec, so the busiest weeks are not a design test.

## 3. Progress banner test 2 (A = trial copy; B = + Player of the Match card)

| Arm | Impressions (est.) | Seen | Clicks | CTR on seen | Joins |
|---|---|---|---|---|---|
| A | 3,420 | 1,079 | 27 | 2.5% | 7 |
| B | 3,420 | 1,124 | 14 | 1.2% | 7 |

P(B beats A) 2.1%. Status: running, about 3,420 of 4,000 impressions per arm, roughly 6-7 more days at the current pace, so it should call around 26-27 Nov, almost certainly for A on clicks. Worth noting when it calls: joins are tied 7 to 7, so B gets half the clicks but each converts about twice as well. If joins are the real goal, that makes this a draw rather than a clear win for A.

Wider pipeline (14 days): 7,842 banner impressions, 2,220 seen, 29 clicks, 65 `/progress` views, 5 join sends, 5 new accounts. Progress has 29 accounts, none paid.

## 4. Opportunities shortlist

1. **`/football-gear/best-football-boots-for-girls`: title for the head term (Tier 2).** "girls football boots" 3,716 impressions at 11.7 (0.4% CTR); with "football boots for girls" 10.9, "football boots girls" 10.5, "girl football boots" 10.5 that is about 5,000 impressions just off page 1. The page went from 451 to 9,264 impressions in 28 days; weekly position 7.6 to 10.6 is the head term arriving, not a slip. "best girls football boots" is already #3. Last SEO change: 7 Nov link out (Tier 0), so no watch.
   - Current: "Best Football Boots for Girls (2026): Fit and Sizing"
   - A: "Girls Football Boots: The Best Picks for 2026, Fit and Sizing"
   - B: "Girls Football Boots (2026): Best Picks, Fit and Sizing"
   - C: "Girls' Football Boots: Best Picks, Fit and Sizing (2026)"
   - Caveat (memory: long-tail strategy): generic head terms are often shop SERPs. A live SERP check (about $0.002) first would show whether page 1 has editorial results to displace.
2. **`/football-development/how-to-become-a-professional-footballer`: meta description (queued after the 7 Nov fact fixes; watch ends 21 Nov).** 11,423 impressions in 28 days, URL CTR 0.82%, main queries at 8-9 ("how to become a footballer" 8.8, "how to become a professional footballer" 9.0, "without academy" 8.1, "at 16" 6.2, newly "at 13" 9.1).
   - Current (171): "The real pathways into professional football - the academy route, non-league development, late developers, and why environment and education matter as much as talent."
   - A (157): "Most professional footballers come through academies, but not all. The routes in, the real odds at each stage, and what parents can do to help along the way."
   - B (154): "How players actually turn professional in England: the academy route, scholarships at 16, non-league and late developers, with the real odds at each step."
   - C (153): "The real routes into professional football: academies, scholarships at 16, non-league and late developers, plus the odds and what parents can do to help."
3. **`/football-gear/best-footballs-by-age`: check the "what size football for X year old" SERPs before touching anything.** About 13,000 impressions in 28 days on those searches at 8-10 with 1-2 clicks (page CTR 0.3%, flagged `confirmed` low CTR). That pattern looks like an AI Overview or answer box giving the size outright (memory: check before blaming the title). An AI Overview check on 3-4 of them is about $0.02. Separately, its Amazon click-out is 5.6% (8 of 142 views), the lowest of the gear guides: a conversion question for later.
4. **Gear guides onto the comic design (decision, not an SEO lever).** The 21 Nov gate is met (section 2). Suggest off-peak gear pages first (rebounders, goals, AG vs FG, Veo, footballs by age), each batch in its own commit, with the Christmas pages after 20 Dec.
5. **No action yet:** the apps roundup, gifts guides and kids boots changes all look positive but are inside their 7-14 day reads (24-25 Nov).

Dropped: JPL CTR (memory), `#fragment` silences, wide fit boots ("wide fit football boots" 15.5 is an adult/shop term, and the title already leads with "Wide Fit"), the advent calendar low-CTR flag (in peak demand for 10 more days, already 476 clicks in 14 days; not worth a title test mid-peak).

# Weekly SEO check 2026-10-29

GSC to 26 Oct (3-day lag), page views to 28 Oct. Windows from `scripts/seo/cli/change-impact.ts` (same days either side, change day excluded, site as control), plus 7-day week-on-week reads (`--days 7`, 12-18 Oct vs 20-26 Oct) for the pages with a pending revert question.

## Site

28 days to 26 Oct vs the 28 before: impressions 208,086 to 248,311 (+19%), clicks 3,479 to 3,713 (+7%), CTR 1.7% to 1.5%. Same-query position (2,688 queries) 8.9 to 8.1, 782 queries improved vs 337 worse. Top-3 impressions +34%, 4-10 +24%, 11-20 +62%.

Growth is coming from new pages (base layers 7.8k impressions, Watford 2.4k, advent calendars 2.1k and 41 clicks in its first days, GPS trackers 1.9k, gifts 1.1k, stats apps 1.1k, girls' football hub 1.0k) and from the shin pads page picking up head terms at position ~11. CTR is falling because much of the new impression volume sits at 8-11 on retailer-led SERPs. Losses are seasonal or demand-led: wide-feet boots (-7.7k impressions while its position improved 8.6 to 6.2), what-is-grassroots-football (-5.5k, clicks flat), Veo (-3.3k), new FA youth format (clicks 131 to 62, see shortlist).

## Changes reviewed

| Page | Changed | Commit | Verdict | Numbers |
|---|---|---|---|---|
| shin pads FAQ | 9 Oct | 0838cfe | **Keep, closed.** Revert rule not met | Guards last week vs week before: "best shin pads for kids" 2.5 to 2.1, "best kids shin pads" 2.2 to 2.9 (14d windows). Weekly clicks 90, 74, 51, 51, so the slide has stopped. Same-query 5.6 to 5.7 over 14d, +0.5 last week. Clicks fell because "best shin pads for kids" impressions fell (2,199 to 1,543 per 14d, 919 to 582 per week) at a steady top-3 position, and the new volume is head terms at 11 with no clicks. |
| stats apps title (shortened) | 13 Oct | 9a01843 | **Revert candidate, Graham's call** | Clicks 24 to 16 (13d each side) vs site -1%; CTR 5.1% to 2.7%; last week 14 to 8. Same-query position +2.7 (13d), -0.7 (week), so rankings did not drop: the fall is CTR. Organic page views 17 to 9 week on week. Small numbers, and the page is 3 weeks old (launch bump fading is the other explanation). The shortening had no target query, so reverting costs nothing: `git revert 9a01843`. |
| Arsenal title | 14 Oct | 323e632 | **Keep (neutral), closed** | Rule not met: "arsenal development centre" 6.3 to 6.6, "...trials" 4.2 to 4.1, CTR 0.79% (rule <0.7%). Target queries: "arsenal academy trials" 6.8 to 6.4 (0 to 3 clicks), "arsenal academy" 9.2 to 9.3. Clicks +4% vs site -3%. |
| Crystal Palace title | 16 Oct | 65295d9 | **Keep, provisional** | Same-query 7.9 to 6.5; "crystal palace academy trials" 9.7 to 7.2, "...2026" 10.8 to 8.2; guards 3.2 to 3.2 and 4.4 to 2.9; CTR 0.60% to 0.79%, clicks 17 to 21 on impressions -7% (seasonal). Muddied by 18 Oct fact fix and link. Final read 2 Nov. |
| Veo title | 16 Oct | e47d978 | **Neutral, keep, provisional** | Same-query 6.4 to 6.0; guards up ("veo alternatives uk" 3.9 to 3.0, "veo camera alternative" 4.5 flat); CTR 0.83% to 0.79% (rule <0.6%). Target "veo camera price" 9.3 to 8.8 but clicks 2 to 1: the price-query CTR gain hasn't come. Final read 2 Nov. |
| soft ground boots title | 16 Oct | 624961c | **Keep** | Clicks 6 to 12, CTR 0.63% to 0.90%, shopping queries up 1-2 places, organic page views 8 to 17 (14d). Guard "metal studs" 4.5 to 3.9. |
| ETC explainer definition first | 16 Oct | 3ef42ee | **Neutral, keep** | "etc football" 4.1 to 4.3, "emerging talent centre" 7.0 to 8.1 (rule is >2). Aim was an AI Overview citation: recheck due ~30 Oct (about $0.01). |
| 10 shortened titles | 13 Oct | see log | **Closed, not readable** | Base layers, rebounders and girls' boots launched 12 Oct, so there is no before window; interviews too small (Chris Robinson 53 to 179 impressions, Paul Barry 17 to 33). Stats apps handled above. |
| Calculator `indexifembedded` | 18 Oct | coach-app 39e4ea0 | **Worked** | 0 to 560 impressions, 15 clicks in the first week; "equal playing time calculator" 6.2, "equal game time calculator" 5.0, "playing time calculator" 7.6. Read again 8 Nov. |
| equal playing time article (anchor) + Coach App title | 18 Oct | ed79a0c / 8952367 | **Not a slip, keep** | Article impressions 1,008 to 458 and clicks 13 to 3 week on week at a steady position (6.8 to 6.5): the calculator page took over the calculator queries (560 impressions, 15 clicks the same week). Combined clicks 13 to 18. The Coach App page did not take them (46 impressions). |
| Coach App page title/H1/section | 18 Oct | 8952367 | **Too early** | 2 to 46 impressions, 2 clicks. Read again 5 Nov. |
| grassroots apps roundup (3 changes) | 18 Oct | 76f2c08 etc. | **Keep, looks good** | Same-query 18.2 to 14.7; "football coaching app" 16.4 to 8.8, "football coach app" 16.8 to 7.9, "football coaching apps" 14.2 to 8.8. Clicks 15 to 12 (tiny). Read again 1 Nov as planned. |
| Brentford title | 22 Oct | 511fff2 | **Too early, promising** | 4 days: clicks 2 to 14, CTR 0.30% to 1.16%, "brentford academy trials" 9.6 to 5.3. Read again 5 Nov. |
| Leeds title | 22 Oct | 7c59443 | **Too early, flag** | 4 days: clicks 26 to 18, CTR 1.48% to 0.80% (rule <1.5% for two weeks), organic page views -27% (6 days). Guards fine (3.3 flat, 4.4 to 4.0). Impression mix moved to trials queries ("leeds united open trials 2026" 3 to 104), which may be news-led. Read again 2 Nov. |
| Chelsea title | 22 Oct | 3212dcf | **Too early, flag** | 4 days: target "chelsea pre academy" 6.3 to 4.6 (0 to 2 clicks); clicks 33 to 24, CTR 2.38% to 1.68%; guard "chelsea player performance centre" went from 1.9 (30 impressions) to no impressions, "chelsea ppc" 2.2 to 2.0. Read again 2 Nov; if PPC queries stay gone, that is the rule. |
| New articles (advent calendars, coach gifts, indoor training, Wolves, girls' trials, girls' hub) | 16-24 Oct | see log | Too early | Advent calendars already 2,077 impressions, 41 clicks. |
| /progress copy revert | 23 Oct | e2b5319 | Conversion, not SEO | Read 6 Nov per log. |

## Opportunities

Sources: `compare_search_console_periods` 28 vs 28 days, `seo-opportunities.md` (29 Oct), `inspect_page`.

Dropped without listing: JPL CTR (memory), footballs-by-age CTR (AI Overview, checked 22 Oct), pages on watch (Palace, Veo, Brentford, Leeds, Chelsea, gifts, Coach App, roundup), `academy-categories-explained#category-2` silence (a jump-link URL, not the page; the page itself is up 2.7k impressions).

Shin pads head terms ("kids shin pads" 5.2k, "shin pads kids" 4.9k impressions in 28 days at ~11): considered and not shortlisted. The page already has 13 internal links with good anchors, the SERP is retailer-led, and the long-tail strategy memory says not to chase generic head terms.

1. **Base layers title, add "thermals".** `/football-gear/best-football-base-layers-for-kids`. 7.6k impressions in 13 days at 8.6, CTR 0.83%. Thermal queries ranking 10.5-11.6 with no clicks: "kids football thermals" 11.0 (179), "football thermals kids" 10.8 (74), "boys football thermals" 11.6 (59), "kids thermal base layer football" 10.5 (84). The body says thermal(s) 21 times; the title doesn't. Off watch from 27 Oct; winter demand peaks now.
   - Current: "Football Skins for Kids: The Best Base Layers for Winter"
   - A: "Football Skins and Thermals for Kids: Best Base Layers" (54)
   - B: "Football Skins for Kids: Best Thermals and Base Layers" (54)
   - C: "Kids Football Skins and Thermals: Best Winter Base Layers" (57)
   - Guard: "kids football skins" 8.8, "football skins for juniors" 9.0.
2. **New FA youth format: age-to-format table for the AI Overview.** `/football-development/new-fa-youth-football-format`. Live traffic. Clicks 126 to 57 (28d), weekly 22, 10, 12, 3; position 5.0 to 5.7, 6.1 last week. Its queries are "what age 11 a side" questions where it ranks 1.6-5 with 0 clicks ("what age do kids play 11 aside football" 1.6, "what age do you play 11 a side football" 1.9), the pattern of an AI Overview answering. Part seasonal (September start-of-season peak). Lever: a table at the top of "What Is Changing?", answer first, facts already in the bullets. SERP/AI Overview check first (~$0.01).
3. **Shin pads meta description.** Live traffic. Positions 2-4 on the "best" queries but CTR 1.1-1.6% ("best shin pads for kids" 4.2 avg 28d, 8,187 impressions, 1.2%). Current meta is 88 characters and generic. AI Overview check first.
   - Current: "How to choose shin pads that balance comfort, protection and fit for young footballers."
   - A: "Shin pads for kids by age and size: slip-in, sock and ankle-guard styles, how they should fit, and the junior pads we rate for training and matches." (148)
   - B: "Kids shin pads by age: which size to buy, slip-in vs ankle guard vs sock pads, how they should fit, and the junior shin pads we rate for training and matches." (158)
4. **Academy categories explained CTR (check only).** The site's biggest page: 25.7k impressions, 306 clicks (28d), 2.4% CTR at 5.5 (confirmed low CTR). Title "Category 1, 2, 3 & 4 Football Academies". No title idea until a SERP check for "academy categories" / "category 1 academy" shows whether an AI Overview or snippet is taking the clicks.

Paste-ready MDX for 2 (insert after the "The headline changes, confirmed in..." paragraph, before the bullets):

```mdx
From 2026/27, the formats by age group are:

| Age group | Match format |
|---|---|
| Under-7 | 3v3 |
| Under-8 and Under-9 | 5v5 |
| Under-10 and Under-11 | 7v7 |
| Under-12 and Under-13 | 9v9 |
| Under-14 and older | 11v11 |

So children now start 11-a-side football at Under-14, a year later than before.
```

## Skipped or blocked

- Nothing unlogged: every content commit since 19 Oct has a log entry (title commits for Brentford, Leeds and Chelsea are logged under pre-merge hashes 511fff2/7c59443/3212dcf; on main they are 8fd3936/eb79590/22ca92a).
- No paid calls made. The SERP checks for items 2-4 and the ETC citation recheck are about $0.04 together.

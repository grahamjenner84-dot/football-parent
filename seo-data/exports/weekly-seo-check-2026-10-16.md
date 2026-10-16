# Weekly SEO check, 16 Oct 2026

GSC data to 13 Oct (3-day lag). Page views to 15 Oct. Before/after windows from `scripts/seo/cli/change-impact.ts`: up to 14 days after the change against the same number of days before, change day excluded, with the whole site over the same days as a control. "Same-query position" compares only queries present in both windows (positive = better).

## Site, last 28 days vs the 28 before (16 Sep-13 Oct vs 19 Aug-15 Sep)

- Impressions 169,518 to 228,298 (+35%), clicks 2,560 to 3,835 (+50%), CTR 1.5% to 1.7%.
- Same-query position 9.2 to 8.0 across 2,315 queries: 759 improved, 275 worse.
- Top 3 band: 36 to 241 clicks. 4-10 band: 343 to 468.
- The last day (13 Oct) may still be partial.

## Changes reviewed

### Verdicts (enough data)

| Page | Change | Commit | Verdict | Numbers |
|---|---|---|---|---|
| /football-gear/boots/best-football-boots-for-wide-feet-kids | "wide fit" in title, 3 Oct | cfe92d3 | Keep (rankings). Read clicks again 20 Oct | Same-query 7.2 to 5.3; every targeted "wide fit" variant up 2-5 places ("wide fitting football boots kids" 9.2 to 4.3). But clicks 73 to 60 (-18%) and organic page views -34% (7 days) while the site was flat, impressions -6% vs site +16%. Rankings improved, so the click drop reads as boot demand falling after back-to-school, not the title. Revert rule (position slip) not met. |
| /football-gear/best-footballs-by-age | Age-in-years list, 4 Oct | 9e9d6d8 | Keep (provisional, 9 days). Final read 18-20 Oct | Same-query 10.0 to 9.5, clicks 9 to 19, impressions +19% vs site +10%, organic views +25% (11 days) vs site +4%. No target query lost 2 places. This reverses the 9 Oct round-up's "about 1 position worse", which used the blended average on 2-3 days. |
| /academy-pathway/football-scholarships-uk | FAQ, scholarships at 16, 4 Oct | 961a614 | Keep | Same-query 7.0 to 6.4, clicks 39 to 47 (+21% vs site -2%), CTR 1.0% to 1.4%. Target "football scholarships for 16 year olds" 10.0 to 9.3, clicks 1 to 3. Impressions -14% is demand. |
| /academy-pathway/brentford-development-centre-guide | "Brentford academy" inbound link, 4 Oct | 9bda1c0 | Neutral, keep. Close at 18 Oct | Target "brentford academy" 11.3 to 9.9; "brentford fc academy" 7.9 to 9.5. Page same-query flat (7.8 to 7.7), clicks 17 to 12 on falling trial demand. |
| /coaching/best-grassroots-football-apps | Progress section, 3 Oct | 5149d01 | Mixed, keep. Read 25 Oct | Impressions +86%, clicks 24 to 18, same-query flat 17.8 to 17.4. "best football coaching apps" 12.2 to 7.7 and "best football coach app" 31.6 to 12.8, but "football coach app" 9.5 to 15.9 and "football coaching app" 8.5 to 11.6. Muddied: calculator link 6 Oct, H2 11 Oct. |
| /academy-pathway/how-academy-football-works | Paul Barry quote moved, 4 Oct | 4e64155 | Keep | Layout only. Same-query 8.4 to 8.0, but GSC clicks 23 to 14. Organic page views flat (23 to 24, 7 days), so GSC and page views disagree; GSC clicks on this page are small and noisy. Muddied by 8 Oct Instagram box and 10 Oct source/fact fixes. |
| /coaching/best-football-formations-by-age-group | 7/9-a-side in title, 25 Sep | 2ed3239 | Too small to read, keep | 104 to 103 impressions in 14 days, almost all on hidden queries. No revert signal. Closed. |
| Matt Baxter quotes, 7 pages, 28 Sep | ExpertOpinion boxes | 32af46c etc. | Keep, closed | why-isnt-my-child-improving 181 to 663 impressions, 6 to 13 clicks. understanding-academy-release clicks 8 to 11, CTR 1.1% to 1.6%. jpl-vs-grassroots flat (same-query 4.1 to 4.4, clicks 20 to 21). The other four are under 140 impressions per window, too small. |

### Too early (fewer than 7 days of GSC data after the change)

| Page | Change | Commit | Early signs | Read again |
|---|---|---|---|---|
| /academy-pathway/aston-villa-development-centre-guide | "Academy" in title, 9 Oct | db0d9e5 | Clicks 4 to 21, CTR 0.9% to 3.7%, organic views +193% vs site -3%, "aston villa academy" 9.7 to 8.8 | 20 Oct |
| /football-gear/ag-vs-fg-boots | Title, 9 Oct | b138a61 | "fg boots on artificial grass" 9.0 to 6.8, same-query +0.6. Quick-pick box the same day (421c57d) | 20 Oct |
| /football-gear/shin-pads/best-shin-pads-for-kids-football | FAQ, 4-5 year olds, 9 Oct | 0838cfe | Impressions doubled from new head terms at ~11.5 ("shin pads kids", "kids shin pads", "boys shin pads", ~3,900 between them in 4 days). Guard queries "best shin pads for kids" 2.2 to 2.4, "best kids shin pads" 2.1 to 2.8: inside the 2-place rule. Organic views -19% vs site -3%: watch | 20-23 Oct |
| /academy-pathway/west-ham-player-pathway-guide | Title, 9 Oct | c06a4c2 | Same-query 8.3 to 7.6, "west ham development" 8.6 to 7.5, organic views +17%. Muddied by 10 Oct fact fixes | 20 Oct |
| /academy-pathway/what-age-do-football-academies-recruit | FAQ, youngest/oldest age, 9 Oct | 0f86a67 | Clicks 4 to 11. Muddied by ExpertQA boxes 10 and 11 Oct | 20 Oct |
| /football-development/how-to-become-a-professional-footballer | FAQ, pro at 16, 9 Oct | d9b5d44 | Target "...at 16" 6.2 to 7.7, clicks 9 to 3. Under the 2-place line | 20 Oct |
| /coaching/equal-playing-time-in-grassroots-football | Calculation section shortened, 6 Oct | b6f2a5b | Impressions +4% vs site +6%, clicks 8 to 12. Almost no query-level data | 20 Oct |
| Chris Robinson / Pre Academy Player ExpertQA boxes (~24 pages), source links and fact/slop fixes | 10-11 Oct | various | Not readable yet | 20-21 Oct |
| /coaching/best-grassroots-football-apps H2, Coach App landing | 11 Oct | 8390503, 65e0061 | | 25 Oct |
| 10 shortened titles; Arsenal title | 13 and 14 Oct | see log | | 20-28 Oct |

### New pages, first weeks

| Page | Published | GSC so far | Note |
|---|---|---|---|
| /academy-pathway/watford-development-centre-guide | 2 Oct | 1,100 impr, 50 clicks, pos 5.7 | Strong |
| /football-gear/best-football-gps-trackers-for-kids | 3 Oct | 756 impr, 35 clicks, pos 5.4, CTR 4.6% | Strong |
| /parent-guides/best-football-stats-apps | 3 Oct | 530 impr, 27 clicks, pos 6.2 | Strong |
| /football-gear/childrens-soft-ground-football-boots | 27 Sep | 1,305 impr, 10 clicks, pos 6.5, CTR 0.8% | Shopping queries stuck at 10-14, see shortlist |
| /parent-guides/child-lost-confidence-in-football | 3 Oct (moved) | 258 impr, 4 clicks, pos 6.1 | New URL served |
| /football-gear/christmas-football-gifts-for-kids | 9 Oct | 231 impr, 9 clicks in 4 days | Ahead of the November peak |
| /coaching/equal-playing-time-calculator | 6 Oct | 0 impressions | All 53 Google-referred visits are Google Ads clicks (gclid), none organic yet. Indexed 6 Oct |
| Matt Baxter / Girls United interviews | 28 Sep / 6 Oct | 11 / 15 impressions | Interviews, low search demand expected |

## Opportunities

### Shortlist

**1. Veo camera alternatives: price queries (title tag).** Page: /football-gear/veo-camera-alternatives. Clear of watch windows (last ranking change 27 Sep; 12 Oct was a stock swap).
- Evidence (28 days): "veo camera price" 1,535 impressions at 10.1, 0.3% CTR; "veo football camera" 786 at 10.0; "how much is a veo camera" 542 at 8.6; "veo camera price uk" 317 at 7.5; "veo football camera price" 284 at 7.5; "how much is a veo" 115 at 8.6, new this period. About 3,500 impressions at 7.5-10, almost no clicks. "veo camera" slipped 3.4 to 6.4.
- The page already answers it ("How Much Is a Veo Camera?" H2, full first-year cost), but the title says "Cost", not "price".
- **Live traffic:** 26,009 impressions, 220 clicks, position 6.4. Main query "veo alternatives uk" at 4.4, so keep "Veo Camera Alternatives" at the front.
- Current title: "Veo Camera Alternatives: Cost & Comparisons"
- Options:
  - A: "Veo Camera Alternatives: Price, Subscription Cost & XbotGo" (also picks up "veo subscription cost uk" 1,079 at 5.9 and the xbotgo-vs-veo queries)
  - B: "Veo Camera Alternatives UK: Veo Price vs Cheaper Options"
  - C: "Veo Camera Price and Cheaper Alternatives (UK)" (leads with price, puts "alternatives" at risk)
- Before changing: live SERP for "veo camera price" (about $0.01) to see whether Veo's own pages and an AI Overview hold the top, which would cap what a title can do.
- Revert rule: "veo alternatives uk" or "veo camera alternative" lose more than 2 places for a week, or page CTR below 0.6% for two weeks.

**2. Children's soft ground boots: shopping queries (title tag).** Page: /football-gear/childrens-soft-ground-football-boots. Clear (stock swap only since 27 Sep). Low traffic, so more latitude.
- Evidence (28 days): "kids soft ground football boots" 78 at 9.9, "childrens soft ground football boots" 49 at 10.8, "soft ground football boots junior" 47 at 11.2, "childrens football boots soft ground" 43 at 14.0, "junior football boots soft ground" 39 at 12.9, "boys soft ground football boots" 33 at 11.1. About 330 impressions, 0 clicks. Page average 6.5, carried by informational queries ("what age can you wear metal studs" 4.3).
- These searches want boots to buy. The title asks "Do Kids Need Them?", and the "Best Children's Soft Ground Football Boots" section has a single pick.
- Current title: "Children's Soft Ground Football Boots: Do Kids Need Them?"
- Options:
  - A: "Children's Soft Ground Football Boots: Best Junior SG Picks"
  - B: "Kids' Soft Ground Football Boots: Best Picks and When to Wear Them"
  - Alternative lever (instead, not as well): add 2-3 stock-checked junior SG picks to the "Best..." section.

### Queued (watch windows still open)

- **Shin pads head terms**, after 23 Oct: "shin pads kids", "kids shin pads", "boys shin pads", "junior shin pads", "kids shin pads football" now show at ~11-12 with ~3,900 impressions in 4 days. Retailer head terms (long-tail strategy memory), so check the SERP before targeting.
- **Leeds United academy**, after ~22 Oct: "leeds united academy" 358 at 8.0, "leeds united training ground" 73 at 9.6, new this period.
- **Brentford academy**, after 18 Oct: 279 at 10.6. Read the link test first.
- **FA youth format CTR**, after 23 Oct: weekly CTR 2.1% to 0.7% at a steady 5.5. Its queries are quick answers ("what age do you play 11 a side" at 2.2, 0 clicks), so check the AI Overview before any title idea.
- **Goals guide**, after 26 Oct: "best garden football goals" 62 at 13.7, "best kids football goals" 57 at 11.7.
- **Coaching app terms**, after 25 Oct: "football coaching app" 104 at 12.3, "football coach apps" 111 at 19.3.

### Checked and dropped

- Gone quiet: one #fragment row on how-to-become-a-professional-footballer, from the 22 Sep heading tidy changing the anchor. Expected.
- Decay: /academy-trials hub (recurring, position ~21) and development-centres-vs-academies (clicks 23 to 14 but position 6.1 to 5.5, so demand).
- Low CTR "confirmed": 25+ pages. JPL explainer, footballs-by-age and grassroots explainer are AI Overview suppression on record (22 Sep). Most of the rest are on watch.

## Process notes

- `change-impact.ts` counted Google Ads clicks as organic search page views. Fixed this run (gclid split, as `getPageViewStats` already does). Only the calculator page was affected.
- The opportunities file lists each striking-distance query once per #section link (shin pads appeared 12 times). De-duplicated by hand.

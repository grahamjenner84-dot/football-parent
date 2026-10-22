# Weekly SEO check, 22 Oct 2026

GSC to 19 Oct (3-day lag), page views to 21 Oct. Before/after from `scripts/seo/cli/change-impact.ts` (same days either side, change day excluded, site as control). Site 28 vs 28 days (22 Sep-19 Oct vs 25 Aug-21 Sep): impressions 190,342 to 235,093 (+24%), clicks 3,007 to 3,775 (+26%), same-query position 9.0 to 8.0 (758 queries improved, 314 worse).

## 1. Changes reviewed

| Page | Changed | Commit | Verdict | Numbers |
|---|---|---|---|---|
| shin pads FAQ (4-5 year olds) | 9 Oct | 0838cfe | **Revert rule met on clicks; recommend hold, not revert** | Weekly clicks 90 (w/c 29 Sep), 74 (6 Oct), 51 (13 Oct): under 80 two weeks running while impressions rose. Guard queries: "best shin pads for kids" 2.3 to 2.7, "best kids shin pads" 2.1 to 3.4 (both under the 2-place rule). See note below. Read again 27 Oct |
| wide-feet boots title | 3 Oct | cfe92d3 | Keep, closed | Same-query 7.3 to 5.1, wide-fit variants up 1-4 places. Clicks 102 to 86 (-16% vs site -2%) on impressions -19%: demand on the wide-fit terms fell, rankings did not |
| footballs by age list | 4 Oct | 9e9d6d8 | Keep, closed | Same-query 10.0 to 9.3, clicks 21 to 30, organic page views +21% vs site +2% |
| grassroots apps Progress section | 3 Oct | 5149d01 | Keep, muddied | Same-query 19.1 to 16.6, impressions +126%, clicks 30 to 24, organic views -28%. Four later changes (6, 11, 18 Oct). Read again 1 Nov |
| Aston Villa title | 9 Oct | db0d9e5 | **Keep, clear win** | Clicks 11 to 52 (10 days each side), CTR 1.4% to 3.9%, organic page views 20 to 86 (14d). ExpertQA box 10 Oct shares the window, but CTR is the title's lever |
| West Ham title | 9 Oct | c06a4c2 | Keep | Same-query 8.4 to 7.3, clicks 27 to 33, organic views +20%. CTR 2.0% to 1.5% on new trials impressions. Muddied by 10 Oct fixes |
| AG vs FG title | 9 Oct | b138a61 | Neutral, keep, closed | Impressions flat vs site +13%, same-query 8.6 to 8.6, target "fg boots on artificial grass" 8.2 to 7.5, clicks 6 to 7 |
| academy recruit ages FAQ | 9 Oct | 0f86a67 | Keep, closed | Clicks 12 to 20, organic views +35%. Same-query 6.8 to 7.5 on 18 small queries; target "maximum age to join football academy" 8.6 to 11.1 on 14 impressions (too small to read) |
| pro footballer at 16 FAQ | 9 Oct | d9b5d44 | Keep, closed | Target "...at 16" 8.2 to 6.6, same-query 9.6 to 8.8; clicks 18 to 10 (tiny; organic views -5% vs site -1%) |
| equal playing time calc section | 6 Oct | b6f2a5b | Keep, closed | Impressions +3%, clicks 18 to 21, organic views flat. Page now watched for the 18 Oct Coach App title (to 1 Nov) |
| stats apps title shortened | 13 Oct | 9a01843 | Too early, flag | 6 days each side: clicks 20 to 8, CTR 6.4% to 2.9%, organic views 21 to 14 (7d). Small numbers. Read again 27 Oct |
| Arsenal title | 14 Oct | 323e632 | Too early | 5 days: CTR 0.76% to 0.67% (rule: below 0.7% two weeks running), "arsenal development centre" 6.3 to 6.8, "...trials" 3.7 to 4.3 (rule: 2 places). Read again 28 Oct |
| 10 shortened titles | 13 Oct | see log | Too early | Mostly no traffic. Read again 27 Oct |
| Palace, Veo, soft ground titles; ETC intro | 16 Oct | see log | Too early | Read again 30 Oct |
| 17-20 Oct changes (Wolves, girls' trials article, links, Coach App page, Football DNA links) | 17-20 Oct | see log | Too early | 1 Nov |

### Shin pads: why hold rather than revert

- The click slide started before the FAQ went live: 7-9 Oct were 11, 8 and 8 clicks a day against 15-27 the week before.
- Demand for the page's "best" queries fell: the five "best ... shin pads for kids" queries ran at about 300 impressions a day in early October and about 200 since, while their positions stayed at 2-3 (daily data).
- The impressions rise is a different thing: on 12 Oct (the stock swap day, not the FAQ day) Google started showing the page at about 11.4 for the broad head terms "kids shin pads" and "shin pads kids" (about 1,300 impressions a week each, 0 clicks). That pulls blended position from about 6 to 7.5 and halves CTR without costing any clicks.
- What the FAQ targeted is working: "shin pads for 5 year old" 10.1 to 8.3, and "best shin pads for 4 year old" now 4.0.
- Watch item: "best shin pads for kids" read 3.3 and "best kids shin pads" 4.7 on 19 Oct, one day only. If the 20-26 Oct week holds there, that is the 2-place guard and the revert goes ahead (`git revert 0838cfe`).

### Logged-change gaps

None found. Every content commit in the last 35 days has a log entry.

## 2. Falling or quiet

- Gone quiet (4 rows): all are `#fragment` jump-link URLs on the JPL vs grassroots and pro footballer pages, not pages. Nothing to investigate.
- Decay: Crystal Palace 111 to 71 clicks (on watch from 16 Oct, seasonal trial demand, CTR rule read 30 Oct); PL development centres list 19 to 12 clicks (too small).
- Brentford guide (not flagged by the script, found in the page drops): clicks 66 to 45, CTR 2.3% to 0.8%, position 6.3 to 7.0 over 28 days while impressions doubled on academy queries. Shortlist item 1.
- Demand-side drops, no action: JPL pages (-7%, positions flat), can academy players play grassroots (-18% impressions, position flat), ETC explainer (-20% impressions, position 5.4 to 4.8, better), wide-feet (above).
- Biggest same-query slips site-wide: "shin pads kids" (see above), "what size football for 8 year old" 8.3 to 10.1 (267 impressions), "boys shin pads" 6.8 to 11.3 (shin pads head-term spread).

## 3. Shortlist

1. **Brentford: "academy" into the title** (`/academy-pathway/brentford-development-centre-guide`). Academy queries about 1,350 impressions in 28 days with 1 click: "brentford academy" 429 at 10.4, "do/does brentford have an academy" 230 at 8.5-9.6, "brentford academy trials" 213 at 8.8, "brentford fc academy" 108 at 8.9. Same gap Villa had, and Villa's title went from 1.4% to 3.9% CTR. Last edit 10 Oct (ExpertQA box), off watch. Live traffic but small (45 clicks in 28 days).
   - Current: "Brentford FC Development Centre Guide | Football Parent"
   - A: "Brentford Academy and Development Centre: A Parent's Guide" (Villa pattern)
   - B: "Brentford Academy Trials & Development Centre Guide" (Palace pattern)
   - C: "Does Brentford Have an Academy? Trials & Development Centre"
2. **Leeds: "academy" into the title** (`/academy-pathway/leeds-united-development-centre-guide`). "leeds united academy" 496 at 8.0 (1.6%), "leeds academy football" 86 at 9.0, "leeds united football academy" 66 at 8.0, "leeds football academy" 43 at 9.8; CTR 3.7% to 2.1% as impressions rose. The girls' academy queries (444 at 8.3) are meant to move to the new girls' trials article, so do not chase them here. On watch only for the 18 Oct internal link out (least likely lever).
   - Current: "Leeds United Development Centre Guide | Football Parent"
   - A: "Leeds United Academy and Development Centre: A Parent's Guide" (about 61 chars, check width)
   - B: "Leeds United Academy & Development Centre Guide"
3. **Chelsea: pre-academy into the title** (`/academy-pathway/chelsea-fc-development-centre-guide`). "chelsea pre academy" is the page's biggest query, 832 impressions at 7.2, 0.7% CTR; the page covers pre-academy (7 mentions) but the title does not. **Live traffic page** (171 clicks in 28 days, CTR steady at 1.8%), so be conservative: do it after 1 and 2 have read.
   - Current: "Chelsea FC Development Centre Guide | Football Parent"
   - A: "Chelsea Pre-Academy and Development Centre: A Parent's Guide"
   - B: "Chelsea Development Centre, PPC and Pre-Academy Guide"
4. **Footballs by age: "what size football for X year old"** (`/football-gear/best-footballs-by-age`). About 3,000 impressions in 14 days across the 6-13 year old variants at 8-10 with 0 clicks; the 8 year old query slipped 8.3 to 10.1. Probably an AI Overview or featured-snippet SERP: needs a live SERP check before proposing anything (about $0.02 for 3 queries via `ai-overview-check.ts`). Off watch (last ranking change 4 Oct).
5. **Shin pads head terms** ("kids shin pads", "shin pads kids", "boys shin pads", about 3,500 impressions a week at 11-12): hold until the FAQ question is settled on 27 Oct. Retailer-dominated head terms (long-tail strategy), so check the SERP before treating them as winnable.

Held or dropped: base layers "kids football thermals" (100 at 11.1, page published 12 Oct, on watch); coaching apps terms (on watch to 1 Nov); JPL CTR (do not re-raise).

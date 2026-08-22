# SEO / AI-citation changes — 22 August 2026

2-week check-in on the [9 August baseline](seo-changes-2026-08-09.md), plus new FAQ changes made today off the back of it. Target next check-in: **~5 September 2026** (14 days).

## 1. 2-week check-in on the 9 Aug changes

**Methodology note:** the first pass at this used `inspect_page`'s rolling 28-day windows, which mixed ~15 days of pre-change data into the "recent" bucket — not a clean before/after. Redone using `compare_search_console_periods` with a tight **10-day window either side of the change** (30 Jul–8 Aug vs 9–18 Aug), cut off 3 days before today specifically to stay clear of GSC's own reporting lag (confirmed clean: `dataFreshnessWarning` was `null` on this window, vs. a lag warning on an earlier 13-day attempt that reached into 19–21 Aug).

Site-wide in that window: **25,511 → 38,216 impressions (+50%), 368 → 578 clicks (+57%)**.

| Page | Before (30 Jul–8 Aug) | After (9–18 Aug) | Verdict |
|---|---|---|---|
| `academy-categories-explained` (2 FAQs added) | 2,738 impr / 57 clicks / pos 6.3 | 4,021 impr / 81 clicks / pos 6.2 | Genuine gain, position held |
| `jpl-vs-grassroots-football` (1 FAQ added) | 801 impr / 9 clicks / pos 4.4 | 753 impr / 9 clicks / pos 4.3 | Flat — already top-5, no real movement either way |
| `what-is-grassroots-football` (Quick Answer trial) | 2,595 impr / 4 clicks / pos 8.3 | 2,043 impr / 8 clicks / pos 8.2 | Impressions down, clicks up, position flat — mixed |

**Gone-quiet pages (8 flagged 9 Aug, recrawl requested):** all recovered off the site-wide "silence" list except `support-child-after-bad-match`, still 0 impressions since its 26 May launch. Unrelated pre-existing indexing issue, not a content problem — worth a Search Console URL Inspection check separately.

## 2. AI Overview citation recheck (live DataForSEO)

| Query | 9 Aug baseline | 22 Aug | Change |
|---|---|---|---|
| "academy categories" | Cited, source #8 | Cited, source #8 | **No change** |
| "is jpl better than grassroots" | Cited, source #3 | Cited, source #3 | **No change** |
| "what is grassroots football" | Not cited | Not cited | No change |
| "what does grassroots football mean" | Not cited | Not cited | No change |
| "what age can a child start grassroots football" | Not cited | Not cited | No change |
| "how does grassroots football differ from academy football" | Not cited | Not cited | No change |
| "is grassroots football the same as sunday league" | Not cited | Not cited | No change |

Same competing domains cited both times on every query (uefa.com/thefa.com/diamondfootball.com/ballrz.co.uk/sports-tours.co.uk for the grassroots set). **Conclusion: the FAQ/schema changes are driving real GSC gains, but haven't moved AI Overview citation status on any of the 7 queries tracked, up or down**, after 2 weeks. The grassroots Quick Answer trial specifically has not produced a citation.

## 3. FAQ schema mechanism — confirmed site-wide, article-triggered

Investigated whether FAQPage schema is per-article code or shared infrastructure: it's shared. `lib/faq.ts`'s `extractFaqs()` scans every article's MDX body for an `## <heading containing "FAQ" or "frequently asked questions">` section followed by `### Question` sub-headings; `lib/ArticleLayout.tsx` (used by every article page) automatically emits `FAQPage` JSON-LD if one is found. No per-article opt-in — this is why a heading-text mismatch has silently dropped schema before (`4cd81f2` JPL heading rename, `f54f48a` Fulham/Tottenham/coaching fix).

Cross-referenced every striking-distance page (`get_seo_report`, position 11-20) against its MDX for an existing FAQ section: **virtually every article-level page already has one.** The only pages without are `/football-development`, `/academy-pathway`, `/about` — hand-written category/hub pages on `category-page.tsx`, not `ArticleLayout.tsx`, so they're unreachable by this mechanism without actual engineering work.

**Reframed the opportunity:** not "add FAQ where missing" (pool is empty), but "existing FAQ doesn't literally cover the specific striking-distance query wording." Confirmed via live PAA/AI Overview pulls per page's actual highest-volume query (not just its nominal title keyword — see [[feedback_paa_main_query_optimization]]).

## 4. New FAQ changes made today

| Page | New FAQ entry | Target query (GSC position) | AI Overview status at time of writing | Commit |
|---|---|---|---|---|
| `football-gear/best-football-boots-for-wide-feet-kids` | "Which football boots are best for wide feet?" | "football boots for wide feet" — 175 impr, pos 20.8, **not cited** (others: reddit.com, sportsdirect.com, prodirectsport.com) | — | `4d63d67` |
| `football-gear/best-shin-pads-for-kids-football` | "What are the best shin pads for football?" | "best shin pads" — 149 impr, pos 15.8, no AI Overview present at all; "best shin pads for football" — 139 impr, pos 13.2, not cited (others: fourfourtwo.com, footballboots.co.uk, nike.com) | — | `8f50fe0` |
| `football-gear/best-shin-pads-for-kids-football` | "What size shin pads does my child need?" — sourced Adidas/Nike sizing comparison | "best shin pads for kids" — 689 impr, pos 10.2 (page's actual largest query, just off page 1), not cited (others: fourfourtwo.com, soccer.com, forza.com, adidas.co.uk) | — | `8f50fe0` |

Note: `wide fit football boots kids` (672 impr, pos 12.4) — the boots page's main query — is **already cited (#5)** in its AI Overview as of 22 Aug, unprompted by today's change. Worth watching whether it holds.

Also added to `CLAUDE.md` editorial rules (`67a7548`): "name/brand on the box" framing cliché, alongside the existing "badge" rule — caught in my own first draft of the boots FAQ. Flagged but not fixed: the page's *existing*, previously-published FAQ ("worth more than the brand on the side") has the same pattern — untouched pending a separate decision on whether to edit already-live content for style only.

## 5. Outstanding — needs real sourcing before drafting

| Page | Question | Why not drafted |
|---|---|---|
| `best-shin-pads-for-kids-football` | "What is the best shin pad brand?" / "Which shin pads are the best?" | Would require a genuine product recommendation, not currently sourced |
| `best-shin-pads-for-kids-football` | "What shin pads do professionals use?" / "What shin pads does Jack Grealish wear?" | Specific player-gear claim, not researched (explicitly deferred this session) |

## 6. JPL low-CTR investigation and two further changes

Followed up on the 93-page confirmed low-CTR list (section 5 above isn't in this doc, but see the same-day chat log): checked whether AI Overview suppression explains it before touching anything, per [[feedback_verify_before_recommending]].

- **`jpl league` (1,091 impr, the JPL page's single biggest query): no AI Overview on this SERP at all.** Competing results are almost entirely the league's own official properties (juniorpremierleague.com, its Facebook/Instagram/YouTube, one specific club site) — a genuine intent mismatch (navigational, not informational), not a copy problem. No title change made here; there's no real basis for one.
- **`what is jpl football` (249 impr, 0 clicks, 0% CTR at position 6.8 on the explainer page — vs. the site's own expected-CTR curve of ~4% at that position):** live SERP check showed `jpl-vs-grassroots-football` ranking instead of the explainer page at the moment checked, matching the query cannibalisation already flagged in `get_seo_report`. Confirmed via `inspect_page` that this is a real, recurring split: the explainer page gets 249 impr / pos 6.8 on this query vs. the comparison page's 20 impr / pos 7.4 — the explainer page is the clearly stronger, more consistent performer; the comparison page's real strength is entirely different, evaluative queries ("is jpl better than grassroots" pos 3.2, "jpl vs grassroots" pos 3.8, "junior premier league" pos 2.4).
- Root cause: the comparison page (`jpl-vs-grassroots-football.mdx`) re-explained what the JPL is in its own body text, not just linking out to the dedicated explainer — giving Google two legitimately relevant pages for the same definitional query.

**Changes made:**

| Page | Change | Commit |
|---|---|---|
| `parent-guides/what-is-the-junior-premier-league` | Meta description expanded 141 -> 151 chars, into the 150-165 target range (no title change - see above) | `0fe31c0` |
| `parent-guides/jpl-vs-grassroots-football` | Trimmed the redundant "what is JPL" definitional sentences from the "Understanding the choice" section down to a link-out, to stop splitting ranking signal with the explainer page on "what is jpl football" | `1326110` |

**Open question flagged to Graham, not yet resolved:** removing the cannibalisation doesn't by itself explain *why* the explainer page has 0% CTR on 249 impressions even at its own stronger position (6.8) - that's a real, separate CTR gap. The plan is to let the cannibalisation fix bed in first (so the explainer page ranks consistently, not intermittently), then re-run the competing-titles check specifically for the explainer page once its ranking is stable - the same check couldn't be done cleanly today because the comparison page was the one showing at the time.

## How to compare on the next check-in (~5 Sept 2026)

1. Tight 10-day-either-side GSC comparison (`compare_search_console_periods`, cut 3 days before the check-in date to avoid the reporting-lag warning) for the two gear pages.
2. Re-run live AI Overview check for: "football boots for wide feet", "best shin pads", "best shin pads for football", "best shin pads for kids" — see if today's FAQ entries produced a citation. Also recheck "wide fit football boots kids" to confirm the existing #5 citation held.
3. The 9 Aug batch (grassroots, JPL, academy categories, scholarships, etc.) is now past the 10-14 day watch window — decide whether a second round of targeted FAQ additions is worth it there, now that the first round's results are confirmed.
4. **JPL cannibalisation check**: confirm via `inspect_page` on both `what-is-the-junior-premier-league` and `jpl-vs-grassroots-football` whether the explainer page is now consistently the one showing for "what is jpl football" (was 249 vs 20 impr split before the fix). If it's consolidated, re-run the competing-titles live check for that query against the explainer page specifically, since today's check was confounded by the comparison page ranking instead - that's the point where a title change would have real evidence behind it, not before.
5. Check whether the explainer page's 0% CTR on "what is jpl football" has moved at all now that ranking should be more consistent, before concluding a title/meta change is needed there.

## 7. Title-length cleanup (Screaming Frog audit: 13 pages over 60 chars)

Screaming Frog flagged 13 indexable pages with titles over 60 characters/561px. `ball-mastery-drills` (was 85 chars) turned out to already be fixed by an earlier same-day commit, leaving 12 live. Split by current GSC traffic per the risk-scale rule above:

**Left untouched — real, live traffic, not worth the risk:**

| Page | 28d impressions | Position | CTR |
|---|---|---|---|
| `football-gear/best-footballs-by-age` | 8,630 | 9.1 | 0.5% |
| `football-gear/veo-camera-alternatives` | 3,751 (up from 147) | 7.5 | 1.1% |
| `academy-pathway/what-is-eppp` | 2,290 | 6.7 | 1.2% |

**Also left untouched — moderate/growing traffic, low priority:**

`academy-pathway/can-academy-players-play-grassroots-football` (881 impr), `football-development/playing-up-an-age-group-football` (829 impr, up from 18), `parent-guides/leave-grassroots-football-for-an-academy` (467 impr).

**Research before changing the remaining 6:** live PAA/FAQ-gap check (`faq-gap-check.ts`) plus DataForSEO search-volume + discovery calls (`page-keyword-research.ts`) for each — total cost **~$0.56**. Findings: PAA already "likely covered" or the SERP had no PAA box at all on every page except the coaching-qualifications one, so **no FAQ additions made** — the data didn't support any. Keyword volume came back null on nearly every candidate phrase for JPL/girls-academy-age/agent/development-centre-progress (genuinely thin-demand topics, confirms low GSC impressions aren't a title problem there). One real find: "FA Level 1 coaching football" gets 90/mo search volume, higher than the generic head term (70/mo) the coaching-qualifications page was titled around, and its PAA box was dominated by professional-career-intent questions (GCSEs, salary, demand) that don't match this grassroots-parent-focused article.

**Titles changed (title tag only, H1s/headings untouched):**

| Page | Before | After | Commit |
|---|---|---|---|
| `coaching/what-qualifications-do-i-need-to-be-a-football-coach` | "What Qualifications Do You Need to Be a Football Coach?" (73 chars) — pos 15.6, 0 clicks/240 impr; only 3 weeks old, position volatile | "Grassroots Football Coach Qualifications" (58 chars) | `f4619cb` |
| `parent-guides/jpl-and-academy-football` | "Does the Junior Premier League Lead to Academy Football?" (74 chars) — pos 4.5, 166 impr (down from 216) | "Does JPL Lead to Academy Football?" (53 chars) | `b2221a6` |
| `academy-pathway/how-to-find-a-football-agent-for-your-child` | "How to Find a Football Agent for Your Child" (61 chars) — pos 5.7, 169 impr, 3% CTR | "Finding a Football Agent for Your Child" (58 chars) | `4f4478f` |
| `girls-football/what-age-do-girls-football-academies-recruit` | "What Age Do Girls Football Academies Recruit?" (63 chars) — pos 6.6, 90 impr (down from 238) | "What Age Do Girls Academies Recruit?" (55 chars) | `327fc17` |
| `academy-pathway/how-players-progress-through-football-development-centres` | "Progress Through Football Development Centres" (63 chars) — pos 4.9, 26 impr | "Football Development Centre Progression" (58 chars) | `bc1467d` |
| `parent-guides/jpl-martin-brock-interview-part-1` | "JPL Interview: Martin Brock on the Junior Premier League" (74 chars) — pos 4.8, 18 impr, brand new | "Martin Brock on the Junior Premier League" (59 chars) | `2827c5e` |

All 6 now on the 10-14 day watch list (~2-5 Sept 2026 depending on publish date) before any further change. Next check-in: pull `inspect_page` for each, confirm ranking/CTR held or improved, nothing regressed.

## 8. Meta description cleanup (Screaming Frog audit: 38 pages over 155 chars)

Same audit, second issue type. Found 37 in the actual codebase (close match). Triaged by 28-day GSC traffic, same risk-scale rule as section 7:

- **Skipped (4):** `academy-pathway` index (already mid-edit in an uncommitted change, not ours to touch), `parent-guides/support-child-after-bad-match` (known 0-impression indexing "silence" issue, not a content problem), `academy-pathway/how-to-find-a-football-agent-for-your-child` (already on the watch list from section 7's title change), `academy-pathway/brentford-development-centre-guide` (new unpublished article, not live yet).
- **Left untouched, high/live traffic (7):** `academy-categories-explained` (8,896 impr), `arsenal-development-centre-guide` (3,153, up from 37), `chelsea-fc-development-centre-guide` (3,139, up from 40), `how-to-get-into-the-jpl` (2,443), `emerging-talent-centres-explained` (2,475), `what-is-eppp` (2,290), `football-scholarships-uk` (2,220, up from 264).
- **Left untouched, moderate traffic (9):** `what-age-do-football-academies-recruit`, `new-fa-youth-football-format`, `how-to-become-a-professional-footballer`, `development-centres-vs-academies`, `can-academy-players-play-grassroots-football`, `how-girls-football-academies-work`, `academy-trials` index, `how-to-join-a-football-academy`, `how-football-clubs-recruit-young-players`.
- **Changed, low traffic (17):** meta descriptions trimmed to 145-155 chars on `football-development-centres-near-me` (`67e54cc`), `premier-league-development-centres-list` (`fcfcd26`), `is-private-football-coaching-worth-it` (`43fe22e`), `why-isnt-my-child-improving-at-football` (`e5cb532`), `how-to-get-scouted-for-football` (`15e8088`), `how-football-scouts-identify-players` (`c825101`), `improve-football-decision-making` (`9481153`), `are-football-development-centres-worth-it` (`1722503`), `football-academy-trials-uk` (`8953953`), `good-football-development-environment` (`e286b48`), `biggest-football-parent-mistakes` (`f19a971`), `bio-banding-football` (`41c34c2`), `futurefit-football-dna-interview-part-1` (`f1a330b`), `futurefit-football-dna-interview-part-2` (`8012cda`), `girls-football` index (`5568c1d`), `parent-guides` index (`d40b25a`), homepage `/` (`1a6ba11`).

No paid research needed for this batch (unlike section 7's titles) — GSC top-query data already on hand was enough to draft copy, meta description isn't a ranking signal so there was no keyword-targeting decision to make, just a length/clarity edit. `girls-football` and `parent-guides` index pages reuse the same string as visible on-page intro copy via `CategoryPage`, so both occurrences were edited to keep them in sync, not just the meta tag.

**Expectation set going in:** this is a low-traffic batch (several pages at single-digit to low-hundred impressions), so treat this as a compliance/cleanup pass with a small possible CTR upside, not a traffic-driving change. Google also rewrites the served snippet a large share of the time regardless of what's in the tag. All 17 now on the 10-14 day watch list.
